"""
Module 3 — Fatigue Detection
Phase 1: Rule-based (mirrors Node.js engine but adds ACWR)
Phase 2: ML classifier (when labeled data exists)
"""
from utils.features import compute_features, get_swimmer_info, get_all_swimmer_ids


def detect_fatigue_single(swimmer_id: str, use_ml: bool = False) -> dict:
    """Detect fatigue for one swimmer using rules + computed features."""
    features = compute_features(swimmer_id, perf_days=30, train_days=30)
    info = get_swimmer_info(swimmer_id)
    
    triggered_rules = []
    fatigue_score = 0  # 0–100 scale
    
    # ── Rule 1: ACWR too high ──
    acwr = features.get("acwr", 0)
    if acwr > 1.5:
        triggered_rules.append({
            "rule": "ACWR_CRITICAL",
            "severity": "CRITICAL",
            "message": f"ACWR à {acwr} — zone de risque élevé (>1.5)"
        })
        fatigue_score += 35
    elif acwr > 1.3:
        triggered_rules.append({
            "rule": "ACWR_HIGH",
            "severity": "WARN",
            "message": f"ACWR à {acwr} — en hausse, surveiller"
        })
        fatigue_score += 20
    
    # ── Rule 2: Too many consecutive training days ──
    consec = features.get("consecutive_days", 0)
    if consec >= 6:
        triggered_rules.append({
            "rule": "CONSECUTIVE_DAYS_CRITICAL",
            "severity": "CRITICAL",
            "message": f"{consec} jours consécutifs sans repos"
        })
        fatigue_score += 30
    elif consec >= 4:
        triggered_rules.append({
            "rule": "CONSECUTIVE_DAYS_HIGH",
            "severity": "WARN",
            "message": f"{consec} jours consécutifs — repos recommandé"
        })
        fatigue_score += 15
    
    # ── Rule 3: High reported fatigue ──
    avg_fatigue = features.get("avg_fatigue_reported", 5)
    if avg_fatigue >= 8:
        triggered_rules.append({
            "rule": "HIGH_FATIGUE_REPORTED",
            "severity": "CRITICAL",
            "message": f"Fatigue déclarée élevée: {avg_fatigue:.1f}/10"
        })
        fatigue_score += 25
    elif avg_fatigue >= 6:
        triggered_rules.append({
            "rule": "MODERATE_FATIGUE",
            "severity": "WARN",
            "message": f"Fatigue déclarée modérée: {avg_fatigue:.1f}/10"
        })
        fatigue_score += 10
    
    # ── Rule 4: Weekly overload ──
    load_7d = features.get("total_load_7d", 0)
    if load_7d > 30:
        triggered_rules.append({
            "rule": "WEEKLY_OVERLOAD",
            "severity": "WARN",
            "message": f"Charge hebdomadaire élevée: {load_7d:.1f} km"
        })
        fatigue_score += 15
    
    # ── Rule 5: Performance declining ──
    slope = features.get("trend_slope", 0)
    if slope > 0.5:
        triggered_rules.append({
            "rule": "PERFORMANCE_DECLINING",
            "severity": "WARN",
            "message": f"Tendance en baisse: +{slope:.2f}s par séance"
        })
        fatigue_score += 10
    
    # ── Rule 6: High intensity + high frequency ──
    avg_int = features.get("avg_training_intensity", 5)
    sessions_7d = features.get("sessions_last7d", 0)
    if avg_int >= 7 and sessions_7d >= 5:
        triggered_rules.append({
            "rule": "HIGH_INTENSITY_FREQUENCY",
            "severity": "WARN",
            "message": f"Intensité élevée ({avg_int:.0f}/10) combinée à fréquence haute ({sessions_7d} séances/sem)"
        })
        fatigue_score += 15
    
    # Cap at 100
    fatigue_score = min(100, fatigue_score)
    
    # Determine level
    if fatigue_score >= 70:
        fatigue_level = "CRITICAL"
    elif fatigue_score >= 45:
        fatigue_level = "HIGH"
    elif fatigue_score >= 20:
        fatigue_level = "MEDIUM"
    else:
        fatigue_level = "LOW"
    
    # Recommendation — try LLM first, then fallback to rules
    recommendations = {
        "CRITICAL": "Repos obligatoire 48h. Réduire charge de 40%. Consultation médicale si symptômes.",
        "HIGH": "Réduire intensité de 30%. Ajouter 1 jour de repos cette semaine.",
        "MEDIUM": "Surveiller. Maintenir charge actuelle sans augmentation.",
        "LOW": "Continuer le plan actuel. Possibilité d'augmenter progressivement (+10%/sem max)."
    }

    # Build data payload for LLM
    llm_data = {
        "name": info.get("name", "Inconnu"),
        "fatigue_level": fatigue_level,
        "fatigue_score": fatigue_score,
        "acwr": acwr,
        "sessions_last7d": features.get("sessions_last7d", 0),
        "trend_slope": features.get("trend_slope", 0),
        "attendance_rate": features.get("attendance_rate", 1.0),
        "personal_best_sec": features.get("personal_best_sec"),
        "avg_time_last5": features.get("avg_time_last5"),
        "total_load_7d": features.get("total_load_7d", 0),
        "total_load_28d": features.get("total_load_28d", 0),
        "consecutive_days": consec,
        "age": features.get("age", 18),
    }

    try:
        from modules.llm_recommendation import generate_smart_recommendation
        llm_result = generate_smart_recommendation(llm_data)
        recommendation_text = llm_result.get("recommendation", recommendations[fatigue_level])
        athlete_advice = llm_result.get("athlete_advice", "")
        rec_source = llm_result.get("source", "RULE_BASED")
    except Exception:
        recommendation_text = recommendations[fatigue_level]
        athlete_advice = _build_athlete_advice(
            fatigue_level, acwr, avg_fatigue, consec, load_7d, sessions_7d
        )
        rec_source = "RULE_BASED"

    if not athlete_advice:
        athlete_advice = _build_athlete_advice(
            fatigue_level, acwr, avg_fatigue, consec, load_7d, sessions_7d
        )
    
    return {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "fatigue_level": fatigue_level,
        "fatigue_score": fatigue_score,
        "acwr": acwr,
        "consecutive_days": consec,
        "avg_fatigue_reported": round(avg_fatigue, 1),
        "sessions_last7d": features.get("sessions_last7d", 0),
        "total_load_7d_km": round(features.get("total_load_7d", 0), 1),
        "recommendation": recommendation_text,
        "athlete_advice": athlete_advice,
        "triggered_rules": triggered_rules,
        "confidence": rec_source,
        "explanation": _build_explanation(fatigue_level, fatigue_score, triggered_rules)
    }


def detect_fatigue_batch(swimmer_ids: list = None, use_ml: bool = False) -> dict:
    """Detect fatigue for multiple swimmers. If no IDs given, analyze all."""
    if not swimmer_ids:
        swimmer_ids = get_all_swimmer_ids()
    
    decisions = []
    level_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
    
    for sid in swimmer_ids:
        try:
            result = detect_fatigue_single(sid, use_ml=use_ml)
            decisions.append(result)
            level_counts[result["fatigue_level"]] += 1
        except Exception as e:
            decisions.append({
                "swimmer_id": sid,
                "error": str(e),
                "fatigue_level": "UNKNOWN"
            })
    
    return {
        "total_analyzed": len(decisions),
        "level_distribution": level_counts,
        "at_risk_count": level_counts["HIGH"] + level_counts["CRITICAL"],
        "decisions": decisions
    }


def _build_explanation(level: str, score: int, rules: list) -> str:
    """Build a human-readable explanation from triggered rules."""
    if not rules:
        return f"Fatigue {level} (score {score}/100). Aucun facteur de risque détecté."
    
    parts = [r["message"] for r in rules]
    return f"Fatigue {level} (score {score}/100). Facteurs: {'; '.join(parts)}."


def _build_athlete_advice(level: str, acwr: float, avg_fatigue: float,
                          consec: int, load_7d: float, sessions_7d: int) -> str:
    advice = []

    if level in ("CRITICAL", "HIGH"):
        advice.append("Priorise le sommeil (8h+) et une recuperation active legere.")
    elif level == "MEDIUM":
        advice.append("Stabilise la charge et dors regulierement.")
    else:
        advice.append("Bonne forme. Maintiens sommeil, hydratation et etirements.")

    if acwr > 1.3:
        advice.append("Charge elevee: hydrate-toi davantage et integre une journee plus facile.")
    if consec >= 4:
        advice.append("Plusieurs jours consecutifs: ajoute un jour de repos.")
    if avg_fatigue >= 6:
        advice.append("Fatigue ressentie elevee: baisse l intensite et surveille la recuperation.")
    if load_7d > 30 or sessions_7d >= 6:
        advice.append("Charge hebdo importante: allonge l echauffement et la recuperation post-seance.")

    return " ".join(advice)
