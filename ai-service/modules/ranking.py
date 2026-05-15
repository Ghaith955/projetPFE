"""
Module — AI-Weighted MVP & Ranking System
Computes Top 3 swimmers of the week and month using a multi-factor
AI scoring system. Each factor is dynamically weighted based on data
quality and relevance.

Scoring factors:
  30% — Performance Progression (time improvement trend)
  25% — Competition Results (recent ranks and scores)
  20% — Training Attendance (session presence rate)
  15% — Consistency (low variance in performance times)
  10% — Fatigue Management (low ACWR = well managed load)
"""
from datetime import datetime, timedelta
from bson import ObjectId
from db.mongo import get_collection
from utils.features import (
    compute_features, get_swimmer_info, get_all_swimmer_ids,
    parse_time_to_seconds
)


def compute_mvp_ranking(period: str = "weekly") -> dict:
    """
    Compute the MVP ranking for a given period.
    period: 'weekly' or 'monthly'
    Returns top 3 swimmers with their scores and breakdown.
    """
    swimmer_ids = get_all_swimmer_ids()
    if not swimmer_ids:
        return _empty_result(period)

    now = datetime.utcnow()
    if period == "monthly":
        cutoff = now - timedelta(days=30)
        period_label = "Mensuel"
    else:
        cutoff = now - timedelta(days=7)
        period_label = "Hebdomadaire"

    # Gather raw data for each swimmer
    candidates = []
    for sid in swimmer_ids:
        try:
            entry = _score_swimmer(sid, cutoff, now)
            if entry and entry["data_points"] > 0:
                candidates.append(entry)
        except Exception:
            continue

    if not candidates:
        return _empty_result(period)

    # Normalize each factor to 0–1
    candidates = _normalize_scores(candidates)

    # Compute weighted global score
    weights = {
        "performance_progression": 0.30,
        "competition_results": 0.25,
        "attendance": 0.20,
        "consistency": 0.15,
        "fatigue_management": 0.10,
    }

    for c in candidates:
        c["global_score"] = round(sum(
            weights[k] * c["normalized"].get(k, 0.5)
            for k in weights
        ), 4)

    # Sort descending by global score
    candidates.sort(key=lambda x: x["global_score"], reverse=True)

    # Assign ranks
    for i, c in enumerate(candidates):
        c["rank"] = i + 1

    top3 = candidates[:3]
    mvp = top3[0] if top3 else None

    return {
        "period": period,
        "period_label": period_label,
        "cutoff_date": cutoff.isoformat(),
        "generated_at": now.isoformat(),
        "total_evaluated": len(candidates),
        "mvp": _format_entry(mvp) if mvp else None,
        "top3": [_format_entry(e) for e in top3],
        "all_rankings": [_format_entry(e) for e in candidates],
        "scoring_weights": {k: f"{int(v*100)}%" for k, v in weights.items()},
    }


def _score_swimmer(swimmer_id: str, cutoff: datetime, now: datetime) -> dict:
    """Compute raw scores for a single swimmer within the period."""
    info = get_swimmer_info(swimmer_id)
    if not info:
        return None

    features = compute_features(swimmer_id, perf_days=90, train_days=30)

    # --- Performance Progression ---
    perf_col = get_collection("performances")
    perfs = list(perf_col.find({
        "nageur": ObjectId(swimmer_id),
        "date": {"$gte": cutoff}
    }).sort("date", 1))

    times = []
    for p in perfs:
        t = parse_time_to_seconds(p.get("temps"))
        if t and t > 0:
            times.append(t)

    progression_score = 0.0
    if len(times) >= 2:
        # Negative change = improvement (lower time is better)
        first_half = times[:len(times)//2]
        second_half = times[len(times)//2:]
        avg_first = sum(first_half) / len(first_half)
        avg_second = sum(second_half) / len(second_half)
        delta = avg_first - avg_second  # positive = improvement
        progression_score = delta  # raw delta in seconds
    elif len(times) == 1:
        progression_score = 0.0

    # --- Competition Results ---
    comp_col = get_collection("competitionresults")
    comp_results = list(comp_col.find({
        "nageur": ObjectId(swimmer_id),
        "resultDate": {"$gte": cutoff}
    }))

    comp_score = 0.0
    if comp_results:
        scores = [r.get("score", 0) for r in comp_results]
        ranks = [r.get("rank", 10) for r in comp_results]
        avg_score = sum(scores) / len(scores) if scores else 0
        avg_rank = sum(ranks) / len(ranks) if ranks else 10
        # Higher score + lower rank = better
        comp_score = avg_score * (1 / max(avg_rank, 1))

    # --- Attendance ---
    attendance_rate = features.get("attendance_rate", 0.5)
    sessions_count = len(perfs)

    # --- Consistency ---
    consistency = 0.0
    if len(times) >= 2:
        import numpy as np
        consistency = float(np.std(times))  # lower = more consistent (inverted later)

    # --- Fatigue Management ---
    acwr = features.get("acwr", 1.0)
    # Optimal ACWR is 0.8–1.3; penalize outside
    if 0.8 <= acwr <= 1.3:
        fatigue_mgmt = 1.0
    elif acwr < 0.8:
        fatigue_mgmt = acwr / 0.8
    else:
        fatigue_mgmt = max(0, 1.0 - (acwr - 1.3) / 0.7)

    return {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "age": info.get("age", 18),
        "specialties": info.get("specialties", []),
        "raw_scores": {
            "performance_progression": progression_score,
            "competition_results": comp_score,
            "attendance": attendance_rate,
            "consistency": consistency,
            "fatigue_management": fatigue_mgmt,
        },
        "data_points": sessions_count + len(comp_results),
        "sessions_count": sessions_count,
        "competitions_count": len(comp_results),
        "acwr": acwr,
        "best_time": min(times) if times else None,
    }


def _normalize_scores(candidates: list) -> list:
    """Min-max normalize each factor across all candidates."""
    factors = ["performance_progression", "competition_results",
               "attendance", "consistency", "fatigue_management"]

    for factor in factors:
        values = [c["raw_scores"].get(factor, 0) for c in candidates]
        mn, mx = min(values), max(values)

        for c in candidates:
            if "normalized" not in c:
                c["normalized"] = {}
            v = c["raw_scores"].get(factor, 0)
            if mn == mx:
                c["normalized"][factor] = 0.5
            elif factor == "consistency":
                # Invert: lower std = better
                c["normalized"][factor] = round((mx - v) / (mx - mn), 4) if mx > mn else 0.5
            else:
                c["normalized"][factor] = round((v - mn) / (mx - mn), 4)

    return candidates


def _format_entry(entry: dict) -> dict:
    """Format a ranking entry for API response."""
    if not entry:
        return None
    return {
        "swimmer_id": entry["swimmer_id"],
        "name": entry["name"],
        "rank": entry.get("rank", 0),
        "global_score": entry.get("global_score", 0),
        "age": entry.get("age", 18),
        "specialties": entry.get("specialties", []),
        "acwr": entry.get("acwr", 0),
        "best_time": entry.get("best_time"),
        "sessions_count": entry.get("sessions_count", 0),
        "competitions_count": entry.get("competitions_count", 0),
        "data_points": entry.get("data_points", 0),
        "score_breakdown": {
            k: round(v, 3)
            for k, v in entry.get("normalized", {}).items()
        },
        "raw_scores": {
            k: round(v, 3) if isinstance(v, float) else v
            for k, v in entry.get("raw_scores", {}).items()
        },
    }


def _empty_result(period: str) -> dict:
    return {
        "period": period,
        "period_label": "Hebdomadaire" if period == "weekly" else "Mensuel",
        "cutoff_date": None,
        "generated_at": datetime.utcnow().isoformat(),
        "total_evaluated": 0,
        "mvp": None,
        "top3": [],
        "all_rankings": [],
        "scoring_weights": {
            "performance_progression": "30%",
            "competition_results": "25%",
            "attendance": "20%",
            "consistency": "15%",
            "fatigue_management": "10%",
        },
    }
