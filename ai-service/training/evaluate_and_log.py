"""
IDSS AI -- Expanded Evaluation + Logging
Runs training, evaluates all swimmers, and logs decisions + summary to MongoDB.
"""
import sys
import os
import io
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.mongo import get_collection
from utils.features import get_all_swimmer_ids
from modules.fatigue import detect_fatigue_single
from modules.performance import predict_time
from modules.planning import generate_training_plan
from modules.recommendation import recommend_swimmers
from modules.simulation import simulate_scenario
from modules.explainability import explain_fatigue_decision
from training.decision_logger import log_decision
from training.ml_trainer import run_training_pipeline


def run_evaluation():
    print("\n" + "=" * 70)
    print("IDSS AI -- EXPANDED EVALUATION + LOGGING")
    print(datetime.utcnow().isoformat() + " UTC")
    print("=" * 70)

    # Step 1: Train models
    training_results = run_training_pipeline()

    swimmer_ids = get_all_swimmer_ids()
    if not swimmer_ids:
        print("No swimmers found. Exiting.")
        return

    # Step 2: Per-swimmer decisions
    logged = {"fatigue": 0, "prediction": 0, "plan": 0, "simulation": 0, "explainability": 0}
    errors = 0

    for sid in swimmer_ids:
        try:
            fatigue = detect_fatigue_single(sid)
            log_decision(sid, "fatigue", fatigue, source="ai_brain")
            logged["fatigue"] += 1
        except Exception:
            errors += 1

        try:
            pred = predict_time(sid)
            log_decision(sid, "prediction", pred, source="ai_brain")
            logged["prediction"] += 1
        except Exception:
            errors += 1

        try:
            plan = generate_training_plan(sid, target_weeks=4)
            log_decision(sid, "plan", plan, source="ai_brain")
            logged["plan"] += 1
        except Exception:
            errors += 1

        try:
            simulation = simulate_scenario(sid, simulation_weeks=4, changes={
                "sessions_per_week": 5,
                "avg_intensity": 7,
                "avg_load_km_per_session": 3.0
            })
            sim_log = {
                "fatigue_level": simulation.get("projected", {}).get("fatigue_level", "LOW"),
                "fatigue_score": 0,
                "explanation": simulation.get("explanation", ""),
                "recommendation": ""
            }
            log_decision(sid, "simulation", sim_log, source="ai_brain")
            logged["simulation"] += 1
        except Exception:
            errors += 1

        try:
            fatigue = detect_fatigue_single(sid)
            explain = explain_fatigue_decision(fatigue)
            explain_log = {
                "fatigue_level": fatigue.get("fatigue_level", "LOW"),
                "fatigue_score": fatigue.get("fatigue_score", 0),
                "explanation": explain.get("summary", ""),
                "recommendation": fatigue.get("recommendation", "")
            }
            log_decision(sid, "explainability", explain_log, source="ai_brain")
            logged["explainability"] += 1
        except Exception:
            errors += 1

    # Step 3: Global recommendation snapshot
    recommendation = recommend_swimmers(top_n=5)

    # Step 4: Save evaluation summary to DB
    eval_col = get_collection("idss_evaluations")
    summary_doc = {
        "timestamp": datetime.utcnow(),
        "swimmer_count": len(swimmer_ids),
        "decisions_logged": logged,
        "errors": errors,
        "training_summary": training_results.get("summary", {}),
        "recommendation_snapshot": recommendation
    }
    eval_col.insert_one(summary_doc)

    print("\nEvaluation complete.")
    print(f"Swimmers: {len(swimmer_ids)}")
    print(f"Logged decisions: {logged}")
    print(f"Errors: {errors}")
    print("Summary saved to collection: idss_evaluations")


if __name__ == "__main__":
    run_evaluation()
