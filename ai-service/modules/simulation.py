"""
Module 6 — Scenario Simulation
"What if I change training load?" — uses the prediction model with modified inputs.
"""
from utils.features import compute_features, get_swimmer_info
from modules.fatigue import detect_fatigue_single


def simulate_scenario(swimmer_id: str, simulation_weeks: int = 4,
                      changes: dict = None) -> dict:
    """
    Simulate training plan changes and predict their effect.
    Uses current features as baseline, applies hypothetical changes,
    then re-evaluates fatigue risk and predicts performance impact.
    """
    info = get_swimmer_info(swimmer_id)
    features = compute_features(swimmer_id, perf_days=90, train_days=30)
    
    if features.get("sessions_count", 0) < 2:
        return {
            "swimmer_id": swimmer_id,
            "name": info.get("name", "Inconnu"),
            "error": "Pas assez de données pour simuler.",
            "explanation": "Minimum 2 séances de performance requises."
        }
    
    changes = changes or {}
    
    # Current values
    current_load_7d = features.get("total_load_7d", 0)
    current_sessions = features.get("sessions_last7d", 0)
    current_intensity = features.get("avg_training_intensity", 5)
    current_acwr = features.get("acwr", 1.0)
    current_best = features.get("personal_best_sec")
    current_avg = features.get("avg_time_last5")
    current_slope = features.get("trend_slope", 0)
    
    # Apply changes
    new_sessions = changes.get("sessions_per_week", current_sessions)
    new_intensity = changes.get("avg_intensity", current_intensity)
    new_load_per_session = changes.get("avg_load_km_per_session",
                                       current_load_7d / max(current_sessions, 1))
    new_load_7d = new_sessions * new_load_per_session
    
    # Project ACWR after simulation_weeks
    # Chronic load adapts slowly: blend current 28d with new weekly load
    current_chronic = features.get("total_load_28d", current_load_7d * 4) / 4
    # After N weeks, chronic load shifts toward new load
    projected_chronic = (current_chronic * max(0, 4 - simulation_weeks) + 
                         new_load_7d * min(simulation_weeks, 4)) / 4
    projected_acwr = round(new_load_7d / max(projected_chronic, 0.1), 2)
    
    # Estimate performance change based on load/intensity adjustment
    # Simple model: more load (within safe zone) = slight improvement
    load_change_pct = ((new_load_7d - current_load_7d) / max(current_load_7d, 1)) * 100
    intensity_change = new_intensity - current_intensity
    
    # Performance delta estimation (simplified linear model)
    # Each 10% load increase ≈ 0.3s improvement (if ACWR stays safe)
    # Each 1 point intensity increase ≈ 0.15s improvement
    perf_delta = 0.0
    if projected_acwr <= 1.5:
        perf_delta -= (load_change_pct / 10) * 0.3 * (simulation_weeks / 4)
        perf_delta -= intensity_change * 0.15 * (simulation_weeks / 4)
    else:
        # Overtraining: performance gets WORSE
        perf_delta += 0.5 * (simulation_weeks / 4)
    
    projected_time = round((current_avg or current_best or 60) + perf_delta, 2)
    
    # Warnings
    warnings = []
    if projected_acwr > 1.5:
        warnings.append(f"[ALERTE] ACWR projete a {projected_acwr} -- zone de risque eleve (>1.5)")
        warnings.append("Recommandation: Ajouter 1 seance de recuperation par semaine")
    elif projected_acwr > 1.3:
        warnings.append(f"[ATTENTION] ACWR projete a {projected_acwr} -- en hausse, surveiller")
    
    if new_sessions >= 7:
        warnings.append("[ALERTE] Entrainement quotidien sans repos -- risque de blessure eleve")
    
    if load_change_pct > 30:
        warnings.append(f"[ALERTE] Augmentation de charge de {load_change_pct:.0f}% -- trop rapide (max recommande: 10%/sem)")
    
    # Fatigue projection
    current_fatigue = detect_fatigue_single(swimmer_id)
    current_fat_level = current_fatigue.get("fatigue_level", "LOW")
    
    if projected_acwr > 1.5:
        projected_fat_level = "CRITICAL"
    elif projected_acwr > 1.3:
        projected_fat_level = "HIGH"
    elif projected_acwr > 0.8:
        projected_fat_level = "MEDIUM" if new_sessions >= 5 else "LOW"
    else:
        projected_fat_level = "LOW"
    
    # Build explanation
    expl = f"Simulation sur {simulation_weeks} semaines: "
    if perf_delta < 0:
        expl += f"amélioration estimée de {abs(perf_delta):.2f}s. "
    elif perf_delta > 0:
        expl += f"dégradation estimée de {perf_delta:.2f}s (surcharge). "
    else:
        expl += "performances stables. "
    
    expl += f"ACWR projete: {projected_acwr} ({current_acwr} --> {projected_acwr}). "
    if warnings:
        expl += "Attention: " + "; ".join(warnings)
    
    return {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "simulation_weeks": simulation_weeks,
        "changes_applied": {
            "sessions_per_week": new_sessions,
            "avg_intensity": new_intensity,
            "avg_load_km_per_session": round(new_load_per_session, 1),
            "total_load_weekly_km": round(new_load_7d, 1)
        },
        "current": {
            "avg_time_sec": current_avg,
            "personal_best_sec": current_best,
            "acwr": current_acwr,
            "fatigue_level": current_fat_level,
            "load_7d_km": round(current_load_7d, 1)
        },
        "projected": {
            "predicted_time_sec": projected_time,
            "delta_sec": round(perf_delta, 2),
            "acwr": projected_acwr,
            "fatigue_level": projected_fat_level,
            "fatigue_change": f"{current_fat_level} --> {projected_fat_level}"
        },
        "warnings": warnings,
        "explanation": expl
    }
