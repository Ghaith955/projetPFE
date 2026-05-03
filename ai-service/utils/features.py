"""
Feature engineering — transforms raw MongoDB data into ML-ready features.
This is the core data pipeline that every AI module depends on.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from bson import ObjectId
from db.mongo import get_collection


def parse_time_to_seconds(time_str: str) -> float:
    """Convert time strings like '1:02.34', '58.5', or '0:01:02.34' to total seconds.
    Rejects values > 600s (10 min) as unrealistic for swimming events."""
    if not time_str:
        return None
    try:
        time_str = str(time_str).strip()
        if ':' in time_str:
            parts = time_str.split(':')
            if len(parts) == 3:
                # H:MM:SS or H:MM:SS.ms
                hours = float(parts[0])
                mins = float(parts[1])
                secs = float(parts[2])
                total = hours * 3600 + mins * 60 + secs
            else:
                # M:SS.ms
                mins = float(parts[0])
                secs = float(parts[1])
                total = mins * 60 + secs
        else:
            total = float(time_str)
        # Reject unrealistic swimming times (> 10 minutes)
        if total > 600:
            return None
        return total
    except (ValueError, IndexError):
        return None


def get_swimmer_performances(swimmer_id: str, days: int = 90) -> pd.DataFrame:
    """Fetch performances for a swimmer within a time window."""
    col = get_collection("performances")
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    cursor = col.find({
        "nageur": ObjectId(swimmer_id),
        "date": {"$gte": cutoff}
    }).sort("date", 1)
    
    rows = list(cursor)
    if not rows:
        return pd.DataFrame()
    
    df = pd.DataFrame(rows)
    df["time_seconds"] = df["temps"].apply(parse_time_to_seconds)
    df["date"] = pd.to_datetime(df["date"])
    return df


def get_swimmer_trainings(swimmer_id: str, days: int = 30) -> pd.DataFrame:
    """Fetch trainings that include this swimmer."""
    col = get_collection("entrainements")
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    cursor = col.find({
        "nageurs": ObjectId(swimmer_id),
        "date": {"$gte": cutoff}
    }).sort("date", 1)
    
    rows = list(cursor)
    if not rows:
        return pd.DataFrame()
    
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    # Map intensity text to numeric value
    intensity_map = {"Faible": 3, "Modérée": 5, "Élevée": 7, "Maximale": 9}
    df["intensity_num"] = df["intensite"].map(intensity_map).fillna(5)
    # Estimate load: duration (hours) × intensity
    df["estimated_load_km"] = (df["duree"] / 60) * df["intensity_num"] * 0.5
    return df


def get_swimmer_info(swimmer_id: str) -> dict:
    """Get swimmer profile with user info."""
    nageur = get_collection("nageurs").find_one({"_id": ObjectId(swimmer_id)})
    if not nageur:
        return {}
    user = get_collection("users").find_one({"_id": nageur.get("utilisateur")})
    name = f"{user.get('prenom', '')} {user.get('nom', '')}" if user else "Inconnu"
    return {
        "swimmer_id": swimmer_id,
        "name": name.strip(),
        "age": nageur.get("age", 18),
        "sex": nageur.get("sexe", "Masculin"),
        "weight_kg": float(nageur.get("poid", 0) or 0),
        "specialties": nageur.get("specialite", []),
        "club": nageur.get("club", ""),
    }


def get_all_swimmer_ids() -> list:
    """Return all nageur _id values."""
    col = get_collection("nageurs")
    return [str(doc["_id"]) for doc in col.find({}, {"_id": 1})]


def compute_features(swimmer_id: str, perf_days: int = 90, train_days: int = 30) -> dict:
    """
    Compute the full feature vector for one swimmer.
    This is the central function used by prediction, recommendation, and simulation.
    """
    info = get_swimmer_info(swimmer_id)
    perfs = get_swimmer_performances(swimmer_id, days=perf_days)
    trains = get_swimmer_trainings(swimmer_id, days=train_days)
    
    features = {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "age": info.get("age", 18),
    }
    
    # ── Performance features ──
    if not perfs.empty and "time_seconds" in perfs.columns:
        valid = perfs.dropna(subset=["time_seconds"])
        if not valid.empty:
            features["personal_best_sec"] = float(valid["time_seconds"].min())
            features["avg_time_last5"] = float(valid["time_seconds"].tail(5).mean())
            features["sessions_count"] = len(valid)
            
            # Trend slope (negative = improving)
            if len(valid) >= 3:
                x = np.arange(len(valid))
                y = valid["time_seconds"].values
                slope, intercept = np.polyfit(x, y, 1)
                features["trend_slope"] = float(slope)
            else:
                features["trend_slope"] = 0.0
            
            # Consistency: std deviation of recent times (lower = more consistent)
            features["consistency_std"] = float(valid["time_seconds"].tail(10).std()) if len(valid) >= 2 else 0.0
            
            # Average fatigue level reported
            if "fatigueLevel" in valid.columns:
                fl = valid["fatigueLevel"].dropna()
                features["avg_fatigue_reported"] = float(fl.mean()) if len(fl) > 0 else 5.0
            else:
                features["avg_fatigue_reported"] = 5.0
            
            # Average intensity
            if "intensity" in valid.columns:
                ii = valid["intensity"].dropna()
                features["avg_intensity"] = float(ii.mean()) if len(ii) > 0 else 5.0
            else:
                features["avg_intensity"] = 5.0
        else:
            _set_perf_defaults(features)
    else:
        _set_perf_defaults(features)
    
    # ── Training features ──
    if not trains.empty:
        now = datetime.utcnow()
        last7 = trains[trains["date"] >= (now - timedelta(days=7))]
        last14 = trains[trains["date"] >= (now - timedelta(days=14))]
        last28 = trains[trains["date"] >= (now - timedelta(days=28))]
        
        features["sessions_last7d"] = len(last7)
        features["sessions_last14d"] = len(last14)
        features["total_load_7d"] = float(last7["estimated_load_km"].sum()) if not last7.empty else 0.0
        features["total_load_14d"] = float(last14["estimated_load_km"].sum()) if not last14.empty else 0.0
        features["total_load_28d"] = float(last28["estimated_load_km"].sum()) if not last28.empty else 0.0
        
        # ACWR (Acute:Chronic Workload Ratio) — sports science gold standard
        chronic_weekly = features["total_load_28d"] / 4 if features["total_load_28d"] > 0 else 1.0
        features["acwr"] = round(features["total_load_7d"] / chronic_weekly, 2)
        
        # Consecutive training days
        if not trains.empty:
            dates_sorted = sorted(trains["date"].dt.date.unique(), reverse=True)
            streak = 0
            check = datetime.utcnow().date()
            for d in dates_sorted:
                if d == check or d == check - timedelta(days=1):
                    streak += 1
                    check = d
                else:
                    break
            features["consecutive_days"] = streak
        else:
            features["consecutive_days"] = 0
        
        features["avg_training_intensity"] = float(trains["intensity_num"].mean())
    else:
        features["sessions_last7d"] = 0
        features["sessions_last14d"] = 0
        features["total_load_7d"] = 0.0
        features["total_load_14d"] = 0.0
        features["total_load_28d"] = 0.0
        features["acwr"] = 0.0
        features["consecutive_days"] = 0
        features["avg_training_intensity"] = 5.0
    
    # ── Attendance rate ──
    if not perfs.empty:
        att = perfs.get("attendance")
        if att is not None:
            total = len(att)
            present = (att == "present").sum()
            features["attendance_rate"] = round(present / total, 2) if total > 0 else 1.0
        else:
            features["attendance_rate"] = 1.0
    else:
        features["attendance_rate"] = 1.0
    
    return features


def _set_perf_defaults(features: dict):
    """Set default values when no performance data exists."""
    features["personal_best_sec"] = None
    features["avg_time_last5"] = None
    features["sessions_count"] = 0
    features["trend_slope"] = 0.0
    features["consistency_std"] = 0.0
    features["avg_fatigue_reported"] = 5.0
    features["avg_intensity"] = 5.0
