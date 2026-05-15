"""
IDSS AI — ML Training Pipeline (STEP 4)
Trains, evaluates, and persists ML models for the IDSS Brain.

Models:
  1. FatigueClassifier    — Random Forest to predict fatigue level from features
  2. PerformancePredictor — Linear + Ridge Regression for time prediction
  3. ReadinessScorer      — Gradient Boosting for competition readiness scoring

All models are saved as joblib files for hot-reload in production.
"""
import numpy as np
import pandas as pd
import os
import sys
import json
from datetime import datetime
from typing import Dict, Tuple

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sklearn.linear_model import LinearRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.model_selection import cross_val_score, LeaveOneOut
from sklearn.metrics import (
    accuracy_score, classification_report,
    mean_squared_error, r2_score, mean_absolute_error
)
from sklearn.preprocessing import LabelEncoder
import joblib

from utils.features import compute_features, get_all_swimmer_ids, get_swimmer_performances
from modules.fatigue import detect_fatigue_single


MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODELS_DIR, exist_ok=True)


# ═══════════════════════════════════════════════════════════════
# MODEL 1: Fatigue Classifier (Random Forest)
# ═══════════════════════════════════════════════════════════════

def build_fatigue_training_data() -> Tuple[np.ndarray, np.ndarray, list]:
    """
    Build training data for fatigue classification.
    Since we don't have historical labeled fatigue data yet, we use the
    rule-based engine as a 'teacher' to generate labels for supervised learning.
    This is a standard 'knowledge distillation' approach.
    """
    swimmer_ids = get_all_swimmer_ids()
    X_rows = []
    y_labels = []
    feature_names = [
        "acwr", "consecutive_days", "avg_fatigue_reported",
        "sessions_last7d", "total_load_7d", "total_load_14d",
        "avg_training_intensity", "trend_slope", "consistency_std",
        "attendance_rate", "age"
    ]

    for sid in swimmer_ids:
        try:
            features = compute_features(sid, perf_days=90, train_days=30)
            fatigue = detect_fatigue_single(sid)

            row = [features.get(f, 0) for f in feature_names]
            # Replace None with 0
            row = [0 if v is None else float(v) for v in row]

            X_rows.append(row)
            y_labels.append(fatigue["fatigue_level"])
        except Exception:
            continue

    return np.array(X_rows), np.array(y_labels), feature_names


def train_fatigue_classifier() -> Dict:
    """Train a Random Forest to classify fatigue levels."""
    print("\n--- Training Fatigue Classifier (Random Forest) ---")

    X, y, feature_names = build_fatigue_training_data()

    if len(X) < 2:
        return {"status": "SKIP", "reason": "Not enough swimmers for training", "count": len(X)}

    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    # Use Leave-One-Out for small datasets
    model = RandomForestClassifier(
        n_estimators=100, max_depth=5, random_state=42, class_weight="balanced"
    )

    if len(X) >= 4:
        # Cross-validation (bounded by smallest class size)
        unique, counts = np.unique(y_encoded, return_counts=True)
        min_class = int(counts.min()) if len(counts) else 1
        cv = min(len(X), 5, min_class)
        if cv >= 2:
            scores = cross_val_score(model, X, y_encoded, cv=cv, scoring="accuracy")
            cv_accuracy = float(scores.mean())
        else:
            cv_accuracy = None
    else:
        cv_accuracy = None

    # Train on full data
    model.fit(X, y_encoded)

    # Feature importance
    importances = dict(zip(feature_names, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)

    # Save model
    model_path = os.path.join(MODELS_DIR, "fatigue_classifier.joblib")
    joblib.dump({"model": model, "label_encoder": le, "features": feature_names}, model_path)

    # Training predictions
    y_pred = model.predict(X)
    train_accuracy = float(accuracy_score(y_encoded, y_pred))

    result = {
        "status": "OK",
        "model": "RandomForestClassifier",
        "n_samples": len(X),
        "n_features": len(feature_names),
        "classes": list(le.classes_),
        "train_accuracy": train_accuracy,
        "cv_accuracy": cv_accuracy,
        "feature_importance": dict(sorted_imp[:5]),
        "model_path": model_path
    }

    print(f"  Samples: {len(X)}, Train Acc: {train_accuracy:.1%}, CV Acc: {cv_accuracy}")
    print(f"  Top features: {', '.join([f'{k}({v:.3f})' for k, v in sorted_imp[:3]])}")

    return result


# ═══════════════════════════════════════════════════════════════
# MODEL 2: Performance Predictor (Ridge Regression)
# ═══════════════════════════════════════════════════════════════

def build_prediction_training_data() -> Tuple[np.ndarray, np.ndarray, list]:
    """
    Build training data for performance prediction.
    Each row = one performance session with its context features.
    Target = time in seconds.
    """
    swimmer_ids = get_all_swimmer_ids()
    X_rows = []
    y_times = []
    feature_names = [
        "session_index", "intensity", "session_load",
        "fatigue_level", "duration"
    ]

    for sid in swimmer_ids:
        try:
            perfs = get_swimmer_performances(sid, days=365)
            if perfs.empty or "time_seconds" not in perfs.columns:
                continue

            valid = perfs.dropna(subset=["time_seconds"])
            for i, (_, row) in enumerate(valid.iterrows()):
                x = [
                    float(i),
                    float(row.get("intensity", 5) or 5),
                    float(row.get("sessionLoad", 0) or 0),
                    float(row.get("fatigueLevel", 5) or 5),
                    float(row.get("duration", 60) or 60),
                ]
                X_rows.append(x)
                y_times.append(float(row["time_seconds"]))
        except Exception:
            continue

    return np.array(X_rows), np.array(y_times), feature_names


def train_performance_predictor() -> Dict:
    """Train Ridge Regression for performance prediction."""
    print("\n--- Training Performance Predictor (Ridge Regression) ---")

    X, y, feature_names = build_prediction_training_data()

    if len(X) < 3:
        return {"status": "SKIP", "reason": "Not enough performances for training", "count": len(X)}

    # Train Ridge (better than vanilla LR for small datasets)
    model = Ridge(alpha=1.0)
    model.fit(X, y)

    y_pred = model.predict(X)
    r2 = float(r2_score(y, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y, y_pred)))
    mae = float(mean_absolute_error(y, y_pred))

    # Cross-validation
    cv = min(len(X), 5)
    if cv >= 2:
        cv_scores = cross_val_score(model, X, y, cv=cv, scoring="r2")
        cv_r2 = float(cv_scores.mean())
    else:
        cv_r2 = None

    # Feature coefficients
    coefs = dict(zip(feature_names, [round(float(c), 4) for c in model.coef_]))

    # Save
    model_path = os.path.join(MODELS_DIR, "performance_predictor.joblib")
    joblib.dump({"model": model, "features": feature_names}, model_path)

    result = {
        "status": "OK",
        "model": "RidgeRegression",
        "n_samples": len(X),
        "n_features": len(feature_names),
        "train_r2": r2,
        "train_rmse": round(rmse, 3),
        "train_mae": round(mae, 3),
        "cv_r2": cv_r2,
        "coefficients": coefs,
        "model_path": model_path
    }

    print(f"  Samples: {len(X)}, R2: {r2:.3f}, RMSE: {rmse:.2f}s, MAE: {mae:.2f}s")
    if cv_r2:
        print(f"  CV R2: {cv_r2:.3f}")

    return result


# ═══════════════════════════════════════════════════════════════
# MODEL 3: Competition Readiness Scorer (Gradient Boosting)
# ═══════════════════════════════════════════════════════════════

def build_readiness_training_data() -> Tuple[np.ndarray, np.ndarray, list]:
    """
    Build training data for competition readiness scoring.
    Target = composite readiness score (0-1) computed from multiple factors.
    """
    swimmer_ids = get_all_swimmer_ids()
    X_rows = []
    y_scores = []
    feature_names = [
        "personal_best_sec", "avg_time_last5", "trend_slope",
        "consistency_std", "acwr", "sessions_last7d",
        "total_load_7d", "attendance_rate", "avg_fatigue_reported", "age"
    ]

    for sid in swimmer_ids:
        try:
            f = compute_features(sid, perf_days=90, train_days=30)
            if f.get("sessions_count", 0) < 1:
                continue

            row = [f.get(fn, 0) for fn in feature_names]
            row = [0 if v is None else float(v) for v in row]

            # Compute readiness score as target (weighted formula)
            best = f.get("personal_best_sec") or 999
            slope = f.get("trend_slope", 0)
            acwr = f.get("acwr", 1.0)
            attend = f.get("attendance_rate", 0.5)
            fatigue = f.get("avg_fatigue_reported", 5)

            # Normalized readiness (higher = more ready)
            readiness = 0.0
            readiness += 0.3 * max(0, 1 - slope / 5)       # Improvement bonus
            readiness += 0.2 * (1 if 0.8 <= acwr <= 1.3 else 0.5)  # Optimal ACWR
            readiness += 0.2 * attend                        # Attendance
            readiness += 0.2 * max(0, 1 - fatigue / 10)     # Low fatigue
            readiness += 0.1 * (1 if best < 120 else 0.5)   # Reasonable best time
            readiness = min(1.0, max(0.0, readiness))

            X_rows.append(row)
            y_scores.append(readiness)
        except Exception:
            continue

    return np.array(X_rows), np.array(y_scores), feature_names


def train_readiness_scorer() -> Dict:
    """Train Gradient Boosting for competition readiness scoring."""
    print("\n--- Training Readiness Scorer (Gradient Boosting) ---")

    X, y, feature_names = build_readiness_training_data()

    if len(X) < 2:
        return {"status": "SKIP", "reason": "Not enough data", "count": len(X)}

    model = GradientBoostingRegressor(
        n_estimators=50, max_depth=3, learning_rate=0.1, random_state=42
    )
    model.fit(X, y)

    y_pred = model.predict(X)
    r2 = float(r2_score(y, y_pred))
    mae = float(mean_absolute_error(y, y_pred))

    # Feature importance
    importances = dict(zip(feature_names, [round(float(v), 4) for v in model.feature_importances_]))
    sorted_imp = sorted(importances.items(), key=lambda x: x[1], reverse=True)

    # Save
    model_path = os.path.join(MODELS_DIR, "readiness_scorer.joblib")
    joblib.dump({"model": model, "features": feature_names}, model_path)

    result = {
        "status": "OK",
        "model": "GradientBoostingRegressor",
        "n_samples": len(X),
        "n_features": len(feature_names),
        "train_r2": r2,
        "train_mae": round(mae, 4),
        "feature_importance": dict(sorted_imp[:5]),
        "model_path": model_path
    }

    print(f"  Samples: {len(X)}, R2: {r2:.3f}, MAE: {mae:.4f}")

    return result


# ═══════════════════════════════════════════════════════════════
# MASTER TRAINING FUNCTION
# ═══════════════════════════════════════════════════════════════

def run_training_pipeline() -> Dict:
    """
    Run the complete ML training pipeline:
    1. Train Fatigue Classifier
    2. Train Performance Predictor
    3. Train Readiness Scorer
    4. Save all results
    """
    print("\n" + "=" * 60)
    print("  IDSS ML TRAINING PIPELINE")
    print("=" * 60)

    results = {
        "timestamp": datetime.utcnow().isoformat(),
        "models": {}
    }

    # Model 1: Fatigue
    results["models"]["fatigue_classifier"] = train_fatigue_classifier()

    # Model 2: Performance
    results["models"]["performance_predictor"] = train_performance_predictor()

    # Model 3: Readiness
    results["models"]["readiness_scorer"] = train_readiness_scorer()

    # Summary
    trained = sum(1 for m in results["models"].values() if m.get("status") == "OK")
    skipped = sum(1 for m in results["models"].values() if m.get("status") == "SKIP")

    results["summary"] = {
        "models_trained": trained,
        "models_skipped": skipped,
        "total_models": len(results["models"])
    }

    # Save results
    results_path = os.path.join(MODELS_DIR, "training_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)

    print("\n" + "=" * 60)
    print(f"  TRAINING COMPLETE: {trained} trained, {skipped} skipped")
    print(f"  Results saved to: {results_path}")
    print("=" * 60)

    return results


if __name__ == "__main__":
    results = run_training_pipeline()
    print(json.dumps(results, indent=2, default=str))
