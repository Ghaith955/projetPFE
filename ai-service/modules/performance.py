"""
Module 1 — Performance Analysis & Prediction
- analyze_performance: trend analysis, no ML needed
- predict_time: LinearRegression to predict next race time
"""
import numpy as np
import pandas as pd
from datetime import datetime
from sklearn.linear_model import LinearRegression
from utils.features import (
    get_swimmer_performances, compute_features,
    get_swimmer_info, parse_time_to_seconds
)


def analyze_performance(swimmer_id: str, period_days: int = 90, stroke: str = None) -> dict:
    """
    Analyze a swimmer's performance trend over the given period.
    No ML model needed — pure statistical analysis.
    """
    info = get_swimmer_info(swimmer_id)
    perfs = get_swimmer_performances(swimmer_id, days=period_days)
    
    if perfs.empty or "time_seconds" not in perfs.columns:
        return {
            "swimmer_id": swimmer_id,
            "name": info.get("name", "Inconnu"),
            "period_days": period_days,
            "sessions_analyzed": 0,
            "trend": "insufficient_data",
            "explanation": "Pas assez de données de performance pour analyser la tendance."
        }
    
    valid = perfs.dropna(subset=["time_seconds"]).copy()
    if valid.empty:
        return {
            "swimmer_id": swimmer_id,
            "name": info.get("name", "Inconnu"),
            "period_days": period_days,
            "sessions_analyzed": 0,
            "trend": "insufficient_data",
            "explanation": "Aucun temps valide enregistré."
        }
    
    # Filter by stroke/style if specified
    if stroke and "style" in valid.columns:
        styled = valid[valid["style"].str.lower() == stroke.lower()]
        if not styled.empty:
            valid = styled
    
    # Core stats
    personal_best = float(valid["time_seconds"].min())
    avg_last5 = float(valid["time_seconds"].tail(5).mean())
    sessions_count = len(valid)
    
    # Trend slope
    trend_slope = 0.0
    trend = "stable"
    if sessions_count >= 3:
        x = np.arange(sessions_count).reshape(-1, 1)
        y = valid["time_seconds"].values
        model = LinearRegression().fit(x, y)
        trend_slope = float(model.coef_[0])
        
        if trend_slope < -0.2:
            trend = "improving"
        elif trend_slope > 0.2:
            trend = "declining"
        else:
            trend = "stable"
    
    # Improvement percentage (first vs last 3 sessions)
    improvement_pct = 0.0
    if sessions_count >= 6:
        early = valid["time_seconds"].head(3).mean()
        recent = valid["time_seconds"].tail(3).mean()
        if early > 0:
            improvement_pct = round((early - recent) / early * 100, 1)
    
    # Consistency score (100 - normalized std)
    std = float(valid["time_seconds"].std()) if sessions_count >= 2 else 0.0
    consistency_score = max(0, min(100, round(100 - std * 10, 1)))
    
    # Chart data for Angular
    chart_data = []
    for _, row in valid.iterrows():
        chart_data.append({
            "date": row["date"].strftime("%Y-%m-%d") if pd.notna(row["date"]) else "",
            "time_sec": round(float(row["time_seconds"]), 2)
        })
    
    # Build explanation
    if trend == "improving":
        expl = f"Performance en amélioration de {abs(trend_slope):.2f}s par séance sur {period_days} jours."
    elif trend == "declining":
        expl = f"Performance en baisse de {trend_slope:.2f}s par séance. Vérifier fatigue et charge."
    else:
        expl = f"Performance stable sur les {sessions_count} dernières séances."
    
    if improvement_pct > 0:
        expl += f" Amélioration globale de {improvement_pct}%."
    
    return {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "period_days": period_days,
        "sessions_analyzed": sessions_count,
        "trend": trend,
        "slope_per_session_sec": round(trend_slope, 3),
        "personal_best_sec": round(personal_best, 2),
        "avg_time_last5_sec": round(avg_last5, 2),
        "improvement_pct": improvement_pct,
        "consistency_score": consistency_score,
        "chart_data": chart_data,
        "explanation": expl
    }


def predict_time(swimmer_id: str, competition_date: str = None, training_plan: dict = None) -> dict:
    """
    Predict next race time using Linear Regression on the feature vector.
    Simple but effective for MVP — uses real training load + performance trends.
    """
    features = compute_features(swimmer_id, perf_days=180, train_days=60)
    info = get_swimmer_info(swimmer_id)
    
    if features.get("sessions_count", 0) < 3:
        return {
            "swimmer_id": swimmer_id,
            "name": info.get("name", "Inconnu"),
            "predicted_time_sec": None,
            "confidence": "NONE",
            "explanation": "Minimum 3 séances de performance requises pour la prédiction."
        }
    
    # Get historical performances to train the model
    perfs = get_swimmer_performances(swimmer_id, days=180)
    valid = perfs.dropna(subset=["time_seconds"]).copy()
    
    if len(valid) < 3:
        return {
            "swimmer_id": swimmer_id,
            "name": info.get("name", "Inconnu"),
            "predicted_time_sec": None,
            "confidence": "NONE",
            "explanation": "Pas assez de données de performance avec temps valides."
        }
    
    # Build feature matrix from historical sessions
    X_features = []
    y_times = []
    
    for i, (_, row) in enumerate(valid.iterrows()):
        row_features = [
            i,  # session index (time progression)
            float(row.get("intensity", 5) or 5),
            float(row.get("sessionLoad", 0) or 0),
            float(row.get("fatigueLevel", 5) or 5),
            float(row.get("duration", 60) or 60),
        ]
        X_features.append(row_features)
        y_times.append(float(row["time_seconds"]))
    
    X = np.array(X_features)
    y = np.array(y_times)
    
    # Train linear regression
    model = LinearRegression()
    model.fit(X, y)
    
    # Predict next session (index = len + 1)
    next_intensity = float(training_plan.get("avg_intensity", 7)) if training_plan else features.get("avg_intensity", 5)
    next_load = float(training_plan.get("avg_load_km", features.get("total_load_7d", 10))) if training_plan else features.get("total_load_7d", 10)
    
    X_pred = np.array([[
        len(valid),
        next_intensity,
        next_load,
        features.get("avg_fatigue_reported", 5),
        60,
    ]])
    
    predicted = float(model.predict(X_pred)[0])
    predicted = max(predicted, features.get("personal_best_sec", predicted) * 0.95)  # can't predict unrealistically fast
    
    current_best = features.get("personal_best_sec", predicted)
    delta = round(predicted - current_best, 2)
    
    # Confidence based on R² and data quantity
    from sklearn.metrics import r2_score
    y_pred_train = model.predict(X)
    r2 = r2_score(y, y_pred_train)
    
    if r2 > 0.7 and len(valid) >= 10:
        confidence = "HIGH"
    elif r2 > 0.4 and len(valid) >= 5:
        confidence = "MEDIUM"
    else:
        confidence = "LOW"
    
    # Feature importance (coefficients)
    feature_names = ["progression", "intensity", "session_load", "fatigue_level", "duration"]
    coefs = dict(zip(feature_names, [round(float(c), 4) for c in model.coef_]))
    
    # Build explanation
    top_factors = sorted(coefs.items(), key=lambda x: abs(x[1]), reverse=True)[:3]
    factor_strs = [f"{name} ({'+' if val > 0 else ''}{val:.3f}s)" for name, val in top_factors]
    
    expl = f"Temps prédit: {predicted:.2f}s (basé sur {len(valid)} séances). "
    expl += f"Facteurs principaux: {', '.join(factor_strs)}. "
    expl += f"Confiance: {confidence} (R²={r2:.2f})."
    
    return {
        "swimmer_id": swimmer_id,
        "name": info.get("name", "Inconnu"),
        "predicted_time_sec": round(predicted, 2),
        "current_best_sec": round(current_best, 2),
        "delta_sec": delta,
        "confidence": confidence,
        "r_squared": round(r2, 3),
        "model_used": "LinearRegression",
        "feature_importance": coefs,
        "explanation": expl
    }
