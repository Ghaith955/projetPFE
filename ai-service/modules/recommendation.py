"""
Module 4 — Recommendation System (Competition Selection)
Ranks swimmers using a weighted scoring formula.
No training data needed — pure computed metrics.
"""
from bson import ObjectId
from db.mongo import get_collection
from utils.features import compute_features, get_swimmer_info, get_all_swimmer_ids


def recommend_swimmers(competition_id: str = None, stroke: str = None,
                       distance: int = None, category: str = None,
                       top_n: int = 5) -> dict:
    """
    Rank all swimmers for a competition using weighted multi-factor scoring.
    
    Scoring weights:
      35% — recent performance (best time normalized)
      25% — progression trend (negative slope = improving)
      20% — consistency (attendance + low std deviation)
      15% — fatigue inverse (low fatigue = higher score)
       5% — experience (age as proxy)
    """
    swimmer_ids = get_all_swimmer_ids()
    
    if not swimmer_ids:
        return {"ranked_swimmers": [], "explanation": "Aucun nageur trouvé."}
    
    # Compute features for all swimmers
    all_features = []
    for sid in swimmer_ids:
        try:
            f = compute_features(sid, perf_days=90, train_days=30)
            if f.get("sessions_count", 0) > 0:
                all_features.append(f)
        except Exception:
            continue
    
    if not all_features:
        return {"ranked_swimmers": [], "explanation": "Aucun nageur avec données de performance."}
    
    # Normalize each factor to 0–1 scale
    def normalize(values, invert=False):
        """Min-max normalization. Invert if lower is better."""
        if not values:
            return [0.5] * len(values)
        mn, mx = min(values), max(values)
        if mn == mx:
            return [0.5] * len(values)
        if invert:
            return [(mx - v) / (mx - mn) for v in values]
        return [(v - mn) / (mx - mn) for v in values]
    
    # Extract raw values
    best_times = [f.get("personal_best_sec") or 999 for f in all_features]
    slopes = [f.get("trend_slope", 0) for f in all_features]
    attendances = [f.get("attendance_rate", 0.5) for f in all_features]
    consistencies = [f.get("consistency_std", 5) for f in all_features]
    acwrs = [f.get("acwr", 1.0) for f in all_features]
    ages = [f.get("age", 18) for f in all_features]
    
    # Normalize (invert where lower = better)
    n_time = normalize(best_times, invert=True)    # lower time = better
    n_slope = normalize(slopes, invert=True)       # negative slope = improving
    n_attend = normalize(attendances)               # higher = better
    n_consist = normalize(consistencies, invert=True)  # lower std = more consistent
    n_fatigue = normalize(acwrs, invert=True)       # lower ACWR = less fatigued
    n_exp = normalize(ages)                         # older = more experienced
    
    # Compute weighted score
    ranked = []
    for i, f in enumerate(all_features):
        score = (
            0.35 * n_time[i] +
            0.25 * n_slope[i] +
            0.10 * n_attend[i] +
            0.10 * n_consist[i] +
            0.15 * n_fatigue[i] +
            0.05 * n_exp[i]
        )
        
        # Build reasons
        reasons = []
        if n_time[i] > 0.7:
            reasons.append(f"Meilleur temps récent: {f.get('personal_best_sec', 0):.1f}s")
        if n_slope[i] > 0.7:
            reasons.append(f"En progression ({f.get('trend_slope', 0):.2f}s/séance)")
        if n_attend[i] > 0.7:
            reasons.append(f"Assiduité: {f.get('attendance_rate', 0)*100:.0f}%")
        if n_fatigue[i] > 0.7:
            reasons.append("Faible risque de fatigue")
        if n_consist[i] > 0.7:
            reasons.append("Performances régulières")
        if not reasons:
            reasons.append("Profil équilibré")
        
        # Fatigue level text
        acwr_val = f.get("acwr", 1.0)
        if acwr_val > 1.5:
            fat_lvl = "CRITICAL"
        elif acwr_val > 1.3:
            fat_lvl = "HIGH"
        elif acwr_val > 0.8:
            fat_lvl = "OPTIMAL"
        else:
            fat_lvl = "LOW"
        
        ranked.append({
            "swimmer_id": f["swimmer_id"],
            "name": f.get("name", "Inconnu"),
            "score": round(score, 3),
            "recent_best_sec": f.get("personal_best_sec"),
            "trend": "improving" if f.get("trend_slope", 0) < -0.1 else ("declining" if f.get("trend_slope", 0) > 0.1 else "stable"),
            "fatigue_level": fat_lvl,
            "acwr": acwr_val,
            "attendance_rate": f.get("attendance_rate", 0),
            "reasons": reasons
        })
    
    # Sort by score descending
    ranked.sort(key=lambda x: x["score"], reverse=True)
    
    # Assign ranks
    for i, r in enumerate(ranked):
        r["rank"] = i + 1
    
    return {
        "competition_id": competition_id,
        "stroke": stroke,
        "distance": distance,
        "category": category,
        "total_evaluated": len(ranked),
        "ranked_swimmers": ranked[:top_n],
        "scoring_weights": {
            "performance": "35%",
            "progression": "25%",
            "consistency": "10%",
            "attendance": "10%",
            "fatigue_inverse": "15%",
            "experience": "5%"
        },
        "explanation": f"Classement basé sur {len(ranked)} nageurs évalués. Pondération: performance 35%, progression 25%, fatigue 15%, régularité 10%, assiduité 10%, expérience 5%."
    }
