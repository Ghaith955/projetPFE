"""
IDSS AI — Data Pipeline (STEP 2)
Extracts, cleans, normalizes, and splits data from MongoDB
into structured ML-ready datasets for training and evaluation.
"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Tuple, Dict, List
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.mongo import get_collection
from utils.features import (
    parse_time_to_seconds, get_all_swimmer_ids,
    compute_features, get_swimmer_info
)


# ── STEP 2a: Extract raw data from MongoDB ──────────────────────

def extract_performances() -> pd.DataFrame:
    """Extract all performance records with swimmer info joined."""
    col = get_collection("performances")
    rows = list(col.find({}))
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["time_seconds"] = df["temps"].apply(parse_time_to_seconds)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["swimmer_id"] = df["nageur"].apply(str)

    # Join swimmer names
    for idx, row in df.iterrows():
        info = get_swimmer_info(str(row["nageur"]))
        df.at[idx, "swimmer_name"] = info.get("name", "Inconnu")
        df.at[idx, "swimmer_age"] = info.get("age", 18)

    return df


def extract_trainings() -> pd.DataFrame:
    """Extract all training records."""
    col = get_collection("entrainements")
    rows = list(col.find({}))
    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")

    # Map intensity to numeric
    intensity_map = {"Faible": 3, "Moderee": 5, "Elevee": 7, "Maximale": 9,
                     "Modérée": 5, "Élevée": 7}
    df["intensity_num"] = df["intensite"].map(intensity_map).fillna(5)
    df["estimated_load_km"] = (df["duree"] / 60) * df["intensity_num"] * 0.5

    return df


def extract_feature_matrix() -> pd.DataFrame:
    """Build the full feature matrix for all swimmers (ML-ready)."""
    swimmer_ids = get_all_swimmer_ids()
    records = []

    for sid in swimmer_ids:
        try:
            features = compute_features(sid, perf_days=180, train_days=60)
            records.append(features)
        except Exception as e:
            print(f"  [WARN] Skipping swimmer {sid}: {e}")

    if not records:
        return pd.DataFrame()

    return pd.DataFrame(records)


# ── STEP 2b: Clean and handle missing/inconsistent data ────────

def clean_dataset(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict]:
    """
    Clean the dataset:
    - Remove rows with no valid time
    - Fill missing numeric values with column medians
    - Remove extreme outliers (>3 std from mean)
    - Log cleaning stats
    """
    report = {
        "original_rows": len(df),
        "null_time_removed": 0,
        "outliers_removed": 0,
        "missing_filled": {},
    }

    # Remove invalid times
    if "time_seconds" in df.columns:
        before = len(df)
        df = df.dropna(subset=["time_seconds"])
        report["null_time_removed"] = before - len(df)

    # Fill missing numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        missing_count = df[col].isna().sum()
        if missing_count > 0:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val)
            report["missing_filled"][col] = {
                "count": int(missing_count),
                "filled_with": float(median_val)
            }

    # Remove outliers (for time_seconds specifically)
    if "time_seconds" in df.columns and len(df) > 5:
        mean_t = df["time_seconds"].mean()
        std_t = df["time_seconds"].std()
        if std_t > 0:
            before = len(df)
            df = df[(df["time_seconds"] >= mean_t - 3 * std_t) &
                     (df["time_seconds"] <= mean_t + 3 * std_t)]
            report["outliers_removed"] = before - len(df)

    report["final_rows"] = len(df)
    return df, report


# ── STEP 2c: Normalize and format for ML ───────────────────────

def normalize_features(df: pd.DataFrame, target_col: str = None) -> Tuple[pd.DataFrame, Dict]:
    """
    Min-Max normalize all numeric features to [0, 1].
    Keeps track of scaling parameters for inverse transform.
    """
    scaling_params = {}
    exclude = [target_col, "swimmer_id", "name"] if target_col else ["swimmer_id", "name"]

    df_normalized = df.copy()
    for col in df.select_dtypes(include=[np.number]).columns:
        if col in exclude:
            continue
        min_val = df[col].min()
        max_val = df[col].max()
        if max_val > min_val:
            df_normalized[col] = (df[col] - min_val) / (max_val - min_val)
            scaling_params[col] = {"min": float(min_val), "max": float(max_val)}
        else:
            df_normalized[col] = 0.5

    return df_normalized, scaling_params


def split_dataset(df: pd.DataFrame, target_col: str,
                  test_ratio: float = 0.2, val_ratio: float = 0.1) -> Dict:
    """
    Split dataset into train/validation/test sets.
    Uses chronological split if date column exists, otherwise random.
    """
    if "date" in df.columns:
        df = df.sort_values("date").reset_index(drop=True)

    n = len(df)
    test_n = max(1, int(n * test_ratio))
    val_n = max(1, int(n * val_ratio))
    train_n = n - test_n - val_n

    if train_n < 2:
        # Not enough data to split meaningfully
        return {
            "train": df,
            "validation": df,
            "test": df,
            "split_info": {
                "method": "no_split (insufficient data)",
                "total": n, "train": n, "validation": n, "test": n
            }
        }

    feature_cols = [c for c in df.select_dtypes(include=[np.number]).columns
                    if c != target_col]

    train_df = df.iloc[:train_n]
    val_df = df.iloc[train_n:train_n + val_n]
    test_df = df.iloc[train_n + val_n:]

    return {
        "train": train_df,
        "validation": val_df,
        "test": test_df,
        "feature_columns": feature_cols,
        "target_column": target_col,
        "split_info": {
            "method": "chronological" if "date" in df.columns else "sequential",
            "total": n,
            "train": len(train_df),
            "validation": len(val_df),
            "test": len(test_df)
        }
    }


# ── STEP 2d: Save prepared datasets ───────────────────────────

def save_dataset(df: pd.DataFrame, name: str, output_dir: str = None) -> str:
    """Save a prepared dataset as CSV for reproducibility."""
    if output_dir is None:
        output_dir = os.path.join(os.path.dirname(__file__), "datasets")
    os.makedirs(output_dir, exist_ok=True)

    # Filter to serializable columns only
    safe_cols = []
    for col in df.columns:
        try:
            if df[col].dtype in [np.float64, np.float32, np.int64, np.int32, object]:
                safe_cols.append(col)
        except Exception:
            continue

    filepath = os.path.join(output_dir, f"{name}.csv")
    df[safe_cols].to_csv(filepath, index=False, encoding="utf-8")
    return filepath


# ── Master pipeline function ──────────────────────────────────

def run_data_pipeline() -> Dict:
    """
    Run the complete data pipeline:
    1. Extract from MongoDB
    2. Clean and validate
    3. Build feature matrix
    4. Normalize
    5. Split for training
    6. Save datasets
    """
    print("\n" + "=" * 60)
    print("  IDSS DATA PIPELINE")
    print("=" * 60)

    results = {"timestamp": datetime.utcnow().isoformat(), "steps": []}

    # Step 1: Extract
    print("\n[1/6] Extracting data from MongoDB...")
    perfs = extract_performances()
    trains = extract_trainings()
    features = extract_feature_matrix()
    results["steps"].append({
        "step": "extract",
        "performances": len(perfs),
        "trainings": len(trains),
        "swimmers_with_features": len(features)
    })
    print(f"  -> {len(perfs)} performances, {len(trains)} trainings, {len(features)} swimmer features")

    # Step 2: Clean
    print("\n[2/6] Cleaning performance data...")
    if not perfs.empty:
        perfs_clean, clean_report = clean_dataset(perfs)
        results["steps"].append({"step": "clean_performances", **clean_report})
        print(f"  -> {clean_report['original_rows']} -> {clean_report['final_rows']} rows")
    else:
        perfs_clean = perfs
        results["steps"].append({"step": "clean_performances", "status": "no_data"})

    # Step 3: Feature matrix
    print("\n[3/6] Building feature matrix...")
    if not features.empty:
        results["steps"].append({
            "step": "feature_matrix",
            "swimmers": len(features),
            "dimensions": len(features.columns),
            "columns": list(features.columns)
        })
        print(f"  -> {len(features)} swimmers x {len(features.columns)} features")
    else:
        results["steps"].append({"step": "feature_matrix", "status": "no_data"})

    # Step 4: Normalize
    print("\n[4/6] Normalizing features...")
    if not features.empty:
        # Select numeric features only for normalization
        numeric_features = features.select_dtypes(include=[np.number])
        if not numeric_features.empty:
            norm_features, scaling = normalize_features(features, target_col="personal_best_sec")
            results["steps"].append({
                "step": "normalize",
                "features_normalized": len(scaling),
                "scaling_params": scaling
            })
            print(f"  -> {len(scaling)} features normalized")
        else:
            norm_features = features
    else:
        norm_features = features

    # Step 5: Split
    print("\n[5/6] Splitting dataset...")
    if not perfs_clean.empty and "time_seconds" in perfs_clean.columns:
        split = split_dataset(perfs_clean, target_col="time_seconds")
        results["steps"].append({"step": "split", **split["split_info"]})
        print(f"  -> Train: {split['split_info']['train']}, "
              f"Val: {split['split_info']['validation']}, "
              f"Test: {split['split_info']['test']}")
    else:
        results["steps"].append({"step": "split", "status": "no_data"})

    # Step 6: Save
    print("\n[6/6] Saving datasets...")
    saved = []
    datasets_dir = os.path.join(os.path.dirname(__file__), "datasets")
    if not perfs_clean.empty:
        p = save_dataset(perfs_clean, "performances_clean", datasets_dir)
        saved.append(p)
    if not features.empty:
        p = save_dataset(features, "feature_matrix", datasets_dir)
        saved.append(p)
    results["steps"].append({"step": "save", "files": saved})
    print(f"  -> Saved {len(saved)} dataset(s)")

    print("\n" + "=" * 60)
    print("  DATA PIPELINE COMPLETE")
    print("=" * 60)

    return results


if __name__ == "__main__":
    results = run_data_pipeline()
    print(json.dumps(results, indent=2, default=str))
