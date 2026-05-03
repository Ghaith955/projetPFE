"""
Module 8 — Training Planning & Personalized Adjustments
Provides intelligent training recommendations based on swimmer state.

This module analyzes each swimmer's current condition (fatigue, performance trend,
training load, attendance) and generates personalized training adjustments:
  - Weekly load recommendations (increase/maintain/decrease)
  - Intensity distribution suggestions
  - Rest day scheduling
  - Periodization phase detection (base, build, peak, recovery)
"""
from utils.features import compute_features, get_swimmer_info, get_all_swimmer_ids
from modules.fatigue import detect_fatigue_single


def generate_training_plan(swimmer_id: str, target_weeks: int = 4) -> dict:
    """
    Generate a personalized training plan recommendation for a swimmer.
    Considers current fatigue, trend, load history, and ACWR to prescribe
    optimal training parameters.
    """
    info = get_swimmer_info(swimmer_id)
    features = compute_features(swimmer_id, perf_days=90, train_days=30)
    fatigue = detect_fatigue_single(swimmer_id)
    
    name = info.get("name", "Inconnu")
    fatigue_level = fatigue.get("fatigue_level", "LOW")
    acwr = features.get("acwr", 1.0)
    current_load = features.get("total_load_7d", 0)
    current_sessions = features.get("sessions_last7d", 0)
    current_intensity = features.get("avg_training_intensity", 5)
    trend_slope = features.get("trend_slope", 0)
    sessions_count = features.get("sessions_count", 0)
    
    # ── Detect current periodization phase ──
    phase = _detect_phase(acwr, fatigue_level, trend_slope, current_intensity)
    
    # ── Calculate recommended adjustments ──
    adjustments = _calculate_adjustments(
        fatigue_level, acwr, current_load, current_sessions,
        current_intensity, trend_slope, phase
    )
    
    # ── Build weekly plan structure ──
    weekly_plans = []
    projected_load = current_load
    for week in range(1, target_weeks + 1):
        load_multiplier = adjustments["load_multiplier"]
        # Progressive adaptation: gradually shift toward target
        week_load = round(projected_load * load_multiplier, 1)
        projected_load = week_load
        
        weekly_plans.append({
            "week": week,
            "recommended_sessions": adjustments["recommended_sessions"],
            "recommended_load_km": week_load,
            "intensity_distribution": adjustments["intensity_distribution"],
            "rest_days": adjustments["rest_days_per_week"],
            "focus": adjustments["weekly_focus"][min(week - 1, len(adjustments["weekly_focus"]) - 1)]
        })
    
    # ── Build explanation ──
    explanation = (
        f"Plan d'entraînement personnalisé pour {name} sur {target_weeks} semaines. "
        f"Phase actuelle détectée : {phase}. "
        f"Niveau de fatigue : {fatigue_level} (ACWR={acwr}). "
    )
    
    if adjustments["load_change_direction"] == "INCREASE":
        explanation += f"Recommandation : augmenter progressivement la charge de {adjustments['load_change_pct']}% par semaine. "
    elif adjustments["load_change_direction"] == "DECREASE":
        explanation += f"Recommandation : réduire la charge de {adjustments['load_change_pct']}% cette semaine. "
    else:
        explanation += "Recommandation : maintenir la charge actuelle. "
    
    explanation += f"Justification : {adjustments['justification']}"
    
    return {
        "swimmer_id": swimmer_id,
        "name": name,
        "target_weeks": target_weeks,
        "current_state": {
            "fatigue_level": fatigue_level,
            "acwr": acwr,
            "load_7d_km": round(current_load, 1),
            "sessions_per_week": current_sessions,
            "avg_intensity": round(current_intensity, 1),
            "trend": "improving" if trend_slope < -0.2 else ("declining" if trend_slope > 0.2 else "stable"),
            "data_sessions": sessions_count
        },
        "detected_phase": phase,
        "adjustments": {
            "load_change_direction": adjustments["load_change_direction"],
            "load_change_pct": adjustments["load_change_pct"],
            "recommended_sessions_per_week": adjustments["recommended_sessions"],
            "recommended_intensity_avg": adjustments["recommended_intensity"],
            "rest_days_per_week": adjustments["rest_days_per_week"],
        },
        "weekly_plans": weekly_plans,
        "warnings": adjustments.get("warnings", []),
        "explanation": explanation
    }


def generate_team_planning(target_weeks: int = 4) -> dict:
    """
    Generate planning recommendations for the entire team.
    Groups swimmers by fatigue level and provides batch recommendations.
    """
    swimmer_ids = get_all_swimmer_ids()
    
    if not swimmer_ids:
        return {"message": "Aucun nageur trouvé.", "plans": []}
    
    plans = []
    group_summary = {"LOW": [], "MEDIUM": [], "HIGH": [], "CRITICAL": []}
    
    for sid in swimmer_ids:
        try:
            plan = generate_training_plan(sid, target_weeks)
            plans.append(plan)
            level = plan["current_state"]["fatigue_level"]
            if level in group_summary:
                group_summary[level].append(plan["name"])
        except Exception as e:
            plans.append({
                "swimmer_id": sid,
                "error": str(e),
                "detected_phase": "UNKNOWN"
            })
    
    # Build team-level recommendations
    team_recommendations = []
    if group_summary["CRITICAL"]:
        team_recommendations.append(
            f"⚠️ {len(group_summary['CRITICAL'])} nageur(s) en fatigue CRITIQUE "
            f"({', '.join(group_summary['CRITICAL'])}). Repos obligatoire recommandé."
        )
    if group_summary["HIGH"]:
        team_recommendations.append(
            f"⚡ {len(group_summary['HIGH'])} nageur(s) en fatigue ÉLEVÉE "
            f"({', '.join(group_summary['HIGH'])}). Réduire l'intensité cette semaine."
        )
    if not group_summary["CRITICAL"] and not group_summary["HIGH"]:
        team_recommendations.append(
            "✅ Aucun nageur à risque élevé. L'équipe peut maintenir le plan actuel."
        )
    
    return {
        "total_swimmers": len(swimmer_ids),
        "target_weeks": target_weeks,
        "group_summary": {k: len(v) for k, v in group_summary.items()},
        "team_recommendations": team_recommendations,
        "plans": plans,
        "explanation": f"Planification pour {len(swimmer_ids)} nageurs sur {target_weeks} semaines."
    }


def _detect_phase(acwr: float, fatigue_level: str, trend_slope: float,
                  intensity: float) -> str:
    """
    Detect the current periodization phase based on training state.
    
    Phases:
      BASE      — Low intensity, building aerobic base (ACWR 0.8-1.0)
      BUILD     — Progressive overload, increasing intensity (ACWR 1.0-1.3)
      PEAK      — High intensity, competition preparation (ACWR 1.2-1.5)
      RECOVERY  — Deload after peak or when fatigue is high (ACWR < 0.8 or fatigue HIGH+)
    """
    if fatigue_level in ("CRITICAL", "HIGH"):
        return "RECOVERY"
    
    if acwr < 0.8:
        return "RECOVERY" if fatigue_level != "LOW" else "BASE"
    elif acwr <= 1.0:
        return "BASE"
    elif acwr <= 1.3:
        if intensity >= 7:
            return "PEAK"
        return "BUILD"
    else:
        # ACWR > 1.3 — approaching danger zone
        return "PEAK" if fatigue_level == "LOW" else "RECOVERY"


def _calculate_adjustments(fatigue_level: str, acwr: float, current_load: float,
                           current_sessions: int, current_intensity: float,
                           trend_slope: float, phase: str) -> dict:
    """
    Calculate specific training adjustments based on current state and phase.
    Returns load multiplier, session count, intensity, and rest recommendations.
    """
    warnings = []
    
    # ── Phase-based defaults ──
    phase_configs = {
        "BASE": {
            "load_multiplier": 1.05,
            "recommended_intensity": min(current_intensity, 5),
            "rest_days_per_week": 2,
            "intensity_distribution": {"Faible": 50, "Modérée": 40, "Élevée": 10, "Maximale": 0},
            "weekly_focus": [
                "Volume aérobie — technique et endurance de base",
                "Augmentation progressive du volume (+5%)",
                "Consolidation de la base aérobie",
                "Évaluation et ajustement"
            ]
        },
        "BUILD": {
            "load_multiplier": 1.08,
            "recommended_intensity": min(current_intensity + 0.5, 7),
            "rest_days_per_week": 2,
            "intensity_distribution": {"Faible": 30, "Modérée": 40, "Élevée": 25, "Maximale": 5},
            "weekly_focus": [
                "Introduction de séries lactiques",
                "Augmentation progressive de l'intensité",
                "Séances de vitesse spécifique",
                "Semaine de récupération partielle (-10%)"
            ]
        },
        "PEAK": {
            "load_multiplier": 0.95,
            "recommended_intensity": min(current_intensity + 1, 9),
            "rest_days_per_week": 3,
            "intensity_distribution": {"Faible": 20, "Modérée": 30, "Élevée": 35, "Maximale": 15},
            "weekly_focus": [
                "Affûtage — réduction du volume, maintien de l'intensité",
                "Séances de vitesse pure et starts",
                "Simulation de compétition",
                "Repos pré-compétition"
            ]
        },
        "RECOVERY": {
            "load_multiplier": 0.70,
            "recommended_intensity": max(current_intensity - 2, 3),
            "rest_days_per_week": 3,
            "intensity_distribution": {"Faible": 60, "Modérée": 30, "Élevée": 10, "Maximale": 0},
            "weekly_focus": [
                "Récupération active — natation légère et étirements",
                "Reprise progressive du volume",
                "Réintroduction de l'intensité modérée",
                "Évaluation pour retour au cycle normal"
            ]
        }
    }
    
    config = phase_configs.get(phase, phase_configs["BASE"])
    
    # ── Override based on fatigue ──
    if fatigue_level == "CRITICAL":
        config["load_multiplier"] = 0.60
        config["recommended_intensity"] = 3
        config["rest_days_per_week"] = 4
        warnings.append("Fatigue CRITIQUE détectée — réduction forcée de 40% de la charge")
        justification = "Le nageur est en état de fatigue critique. La priorité est la récupération complète avant toute reprise de charge."
    elif fatigue_level == "HIGH":
        config["load_multiplier"] = 0.80
        config["rest_days_per_week"] = 3
        warnings.append("Fatigue ÉLEVÉE — réduction de 20% recommandée")
        justification = "Le niveau de fatigue élevé nécessite une réduction de charge pour éviter le surentraînement."
    elif trend_slope > 0.3:
        config["load_multiplier"] = 0.90
        warnings.append("Performances en baisse — ajustement de la charge recommandé")
        justification = f"La tendance de performance est en baisse ({trend_slope:+.2f}s/séance). Un ajustement de charge permettra de stabiliser les performances."
    elif trend_slope < -0.3 and fatigue_level == "LOW":
        config["load_multiplier"] = min(config["load_multiplier"], 1.10)
        justification = f"Le nageur est en progression ({trend_slope:+.2f}s/séance) avec un faible niveau de fatigue. La charge peut être augmentée prudemment."
    else:
        justification = f"Phase {phase} détectée avec ACWR={acwr}. Application du protocole standard de la phase."
    
    # ── Safe load increase limit (10% max per week) ──
    if config["load_multiplier"] > 1.10:
        config["load_multiplier"] = 1.10
        warnings.append("Augmentation limitée à 10%/semaine (règle de sécurité)")
    
    # ── Session count recommendation ──
    if fatigue_level == "CRITICAL":
        recommended_sessions = max(2, current_sessions - 3)
    elif fatigue_level == "HIGH":
        recommended_sessions = max(3, current_sessions - 1)
    else:
        recommended_sessions = min(current_sessions + 1, 6) if phase == "BUILD" else current_sessions
    
    # Determine direction
    if config["load_multiplier"] > 1.0:
        direction = "INCREASE"
        change_pct = round((config["load_multiplier"] - 1.0) * 100, 0)
    elif config["load_multiplier"] < 1.0:
        direction = "DECREASE"
        change_pct = round((1.0 - config["load_multiplier"]) * 100, 0)
    else:
        direction = "MAINTAIN"
        change_pct = 0
    
    return {
        "load_multiplier": config["load_multiplier"],
        "load_change_direction": direction,
        "load_change_pct": change_pct,
        "recommended_sessions": recommended_sessions,
        "recommended_intensity": round(config["recommended_intensity"], 1),
        "rest_days_per_week": config["rest_days_per_week"],
        "intensity_distribution": config["intensity_distribution"],
        "weekly_focus": config["weekly_focus"],
        "justification": justification,
        "warnings": warnings
    }
