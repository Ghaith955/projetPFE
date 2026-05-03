"""
IDSS AI — Complete System Validation (STEP 5 + 6)
Runs ALL tests: connection, data pipeline, ML training, decision logging,
performance benchmarks, and end-to-end validation.

Outputs:
  - Console summary with PASS/FAIL for each test
  - JSON results file with timing and details
  - Decision logs in MongoDB
"""
import sys
import os
import io
import json
import time
import traceback
from datetime import datetime

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def timed_test(name, fn):
    """Run a test function with timing and error handling."""
    start = time.perf_counter()
    try:
        result = fn()
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        print(f"  [PASS] {name} ({elapsed}ms)")
        return {"test": name, "status": "PASS", "time_ms": elapsed, "detail": result}
    except Exception as e:
        elapsed = round((time.perf_counter() - start) * 1000, 1)
        print(f"  [FAIL] {name} ({elapsed}ms) -- {e}")
        traceback.print_exc()
        return {"test": name, "status": "FAIL", "time_ms": elapsed, "error": str(e)}


def run_full_validation():
    """Execute the complete IDSS validation suite."""
    print("\n" + "=" * 70)
    print("  IDSS AI BRAIN -- FULL SYSTEM VALIDATION")
    print("  " + datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"))
    print("=" * 70)

    results = []

    # ═══════════════════════════════════════════════════════════
    # SECTION 1: System Connection (STEP 1)
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 1: System Connection ---")

    def test_mongo():
        from db.mongo import get_db
        db = get_db()
        db.command("ping")
        collections = db.list_collection_names()
        return {"db": db.name, "collections": collections}

    results.append(timed_test("MongoDB Connection", test_mongo))

    def test_data_counts():
        from db.mongo import get_collection
        return {
            "nageurs": get_collection("nageurs").count_documents({}),
            "performances": get_collection("performances").count_documents({}),
            "entrainements": get_collection("entrainements").count_documents({}),
            "users": get_collection("users").count_documents({}),
            "competitions": get_collection("competitions").count_documents({}),
            "idssdecisions": get_collection("idssdecisions").count_documents({})
        }

    results.append(timed_test("Data Counts", test_data_counts))

    def test_swimmer_ids():
        from utils.features import get_all_swimmer_ids
        ids = get_all_swimmer_ids()
        assert len(ids) > 0, "No swimmers found"
        return {"count": len(ids), "sample": ids[:3]}

    results.append(timed_test("Swimmer IDs Retrieval", test_swimmer_ids))

    # ═══════════════════════════════════════════════════════════
    # SECTION 2: Data Pipeline (STEP 2)
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 2: Data Pipeline ---")

    def test_feature_extraction():
        from utils.features import compute_features, get_all_swimmer_ids
        ids = get_all_swimmer_ids()
        features = compute_features(ids[0], perf_days=90, train_days=30)
        assert "acwr" in features, "ACWR missing from features"
        assert "personal_best_sec" in features, "personal_best missing"
        return {k: v for k, v in features.items() if k != "name"}

    results.append(timed_test("Feature Extraction (Single)", test_feature_extraction))

    def test_full_pipeline():
        from utils.features import compute_features, get_all_swimmer_ids
        ids = get_all_swimmer_ids()
        success = 0
        fail = 0
        samples = []
        for sid in ids:
            try:
                f = compute_features(sid, perf_days=90, train_days=30)
                success += 1
                samples.append({
                    "name": f.get("name", "?"),
                    "sessions": f.get("sessions_count", 0),
                    "acwr": f.get("acwr", 0),
                    "trend": f.get("trend_slope", 0)
                })
            except Exception:
                fail += 1
        return {"success": success, "fail": fail, "samples": samples}

    results.append(timed_test("Full Feature Pipeline (All Swimmers)", test_full_pipeline))

    def test_data_pipeline():
        from training.data_pipeline import extract_performances, extract_trainings, extract_feature_matrix
        perfs = extract_performances()
        trains = extract_trainings()
        features = extract_feature_matrix()
        return {
            "performances_extracted": len(perfs),
            "trainings_extracted": len(trains),
            "feature_matrix_rows": len(features),
            "feature_matrix_cols": len(features.columns) if not features.empty else 0
        }

    results.append(timed_test("Data Pipeline Extraction", test_data_pipeline))

    # ═══════════════════════════════════════════════════════════
    # SECTION 3: Business Logic / IDSS Rules (STEP 3)
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 3: Business Logic (IDSS Rules) ---")

    def test_fatigue_single():
        from modules.fatigue import detect_fatigue_single
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        result = detect_fatigue_single(sid)
        assert "fatigue_level" in result, "Missing fatigue_level"
        assert "fatigue_score" in result, "Missing fatigue_score"
        assert result["fatigue_level"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
        assert 0 <= result["fatigue_score"] <= 100
        return {k: v for k, v in result.items() if k != "explanation"}

    results.append(timed_test("Fatigue Detection (Single)", test_fatigue_single))

    def test_fatigue_batch():
        from modules.fatigue import detect_fatigue_batch
        result = detect_fatigue_batch()
        assert "total_analyzed" in result
        assert result["total_analyzed"] > 0
        return {
            "total": result["total_analyzed"],
            "distribution": result["level_distribution"],
            "at_risk": result["at_risk_count"]
        }

    results.append(timed_test("Fatigue Detection (Batch)", test_fatigue_batch))

    def test_performance_analysis():
        from modules.performance import analyze_performance
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        result = analyze_performance(sid, period_days=180)
        assert "trend" in result
        assert "sessions_analyzed" in result
        return {k: v for k, v in result.items() if k not in ["chart_data"]}

    results.append(timed_test("Performance Analysis", test_performance_analysis))

    def test_performance_prediction():
        from modules.performance import predict_time
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        result = predict_time(sid)
        assert "predicted_time_sec" in result or "confidence" in result
        return {k: v for k, v in result.items() if k != "explanation"}

    results.append(timed_test("Performance Prediction (ML)", test_performance_prediction))

    def test_recommendation():
        from modules.recommendation import recommend_swimmers
        result = recommend_swimmers(top_n=5)
        assert "ranked_swimmers" in result
        return {
            "total_evaluated": result["total_evaluated"],
            "top3": [{"name": s["name"], "score": s["score"]}
                     for s in result["ranked_swimmers"][:3]]
        }

    results.append(timed_test("Competition Recommendation", test_recommendation))

    def test_simulation():
        from modules.simulation import simulate_scenario
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        result = simulate_scenario(sid, simulation_weeks=4, changes={
            "sessions_per_week": 5,
            "avg_intensity": 7,
            "avg_load_km_per_session": 3.0
        })
        assert "projected" in result
        return {
            "current_acwr": result["current"]["acwr"],
            "projected_acwr": result["projected"]["acwr"],
            "delta_sec": result["projected"]["delta_sec"],
            "fatigue_change": result["projected"]["fatigue_change"],
            "warnings": len(result.get("warnings", []))
        }

    results.append(timed_test("Scenario Simulation", test_simulation))

    def test_explainability():
        from modules.explainability import explain_fatigue_decision
        from modules.fatigue import detect_fatigue_single
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        fatigue = detect_fatigue_single(sid)
        expl = explain_fatigue_decision(fatigue)
        assert "summary" in expl
        assert "reasoning_chain" in expl
        assert "data_quality" in expl
        return {
            "data_quality": expl["data_quality"],
            "method": expl["method"],
            "chain_steps": len(expl["reasoning_chain"])
        }

    results.append(timed_test("Explainability Layer", test_explainability))

    def test_planning():
        from modules.planning import generate_training_plan
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]
        plan = generate_training_plan(sid, target_weeks=4)
        assert "weekly_plans" in plan
        assert len(plan["weekly_plans"]) == 4
        return {
            "phase": plan["detected_phase"],
            "weeks": len(plan["weekly_plans"]),
            "load_direction": plan["adjustments"]["load_change_direction"]
        }

    results.append(timed_test("Training Plan Generation", test_planning))

    # ═══════════════════════════════════════════════════════════
    # SECTION 4: ML Training (STEP 4)
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 4: ML Training ---")

    def test_ml_training():
        from training.ml_trainer import run_training_pipeline
        result = run_training_pipeline()
        return result["summary"]

    results.append(timed_test("ML Training Pipeline", test_ml_training))

    # ═══════════════════════════════════════════════════════════
    # SECTION 5: Decision Logging
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 5: Decision Logging ---")

    def test_decision_logging():
        from training.decision_logger import log_decision, log_batch_decisions, get_decision_stats
        from modules.fatigue import detect_fatigue_batch

        # Log batch fatigue decisions
        batch_result = detect_fatigue_batch()
        log_result = log_batch_decisions(batch_result["decisions"], "fatigue")

        # Get stats
        stats = get_decision_stats()

        return {
            "decisions_logged": log_result["total_logged"],
            "errors": log_result["errors"],
            "total_in_db": stats["total_decisions"],
            "distribution": stats["fatigue_distribution"]
        }

    results.append(timed_test("Decision Logging & Audit", test_decision_logging))

    # ═══════════════════════════════════════════════════════════
    # SECTION 6: Performance Benchmarks (STEP 6)
    # ═══════════════════════════════════════════════════════════
    print("\n--- STEP 6: Performance & Optimization ---")

    def test_response_times():
        from modules.fatigue import detect_fatigue_batch
        from modules.recommendation import recommend_swimmers

        # Benchmark batch fatigue
        start = time.perf_counter()
        detect_fatigue_batch()
        fatigue_ms = round((time.perf_counter() - start) * 1000, 1)

        # Benchmark recommendation
        start = time.perf_counter()
        recommend_swimmers(top_n=5)
        rec_ms = round((time.perf_counter() - start) * 1000, 1)

        return {
            "batch_fatigue_ms": fatigue_ms,
            "recommendation_ms": rec_ms,
            "acceptable": fatigue_ms < 5000 and rec_ms < 5000
        }

    results.append(timed_test("Response Time Benchmarks", test_response_times))

    def test_multi_scenario_sweep():
        from modules.simulation import simulate_scenario
        from utils.features import get_all_swimmer_ids
        sid = get_all_swimmer_ids()[0]

        scenarios = [
            {"name": "Light",    "changes": {"sessions_per_week": 3, "avg_intensity": 4, "avg_load_km_per_session": 2}},
            {"name": "Moderate", "changes": {"sessions_per_week": 4, "avg_intensity": 6, "avg_load_km_per_session": 3}},
            {"name": "Intense",  "changes": {"sessions_per_week": 5, "avg_intensity": 8, "avg_load_km_per_session": 4}},
            {"name": "Extreme",  "changes": {"sessions_per_week": 7, "avg_intensity": 9, "avg_load_km_per_session": 5}},
        ]

        results_list = []
        for sc in scenarios:
            r = simulate_scenario(sid, 4, sc["changes"])
            results_list.append({
                "scenario": sc["name"],
                "delta_sec": r["projected"]["delta_sec"],
                "acwr": r["projected"]["acwr"],
                "fatigue": r["projected"]["fatigue_level"],
                "warnings": len(r.get("warnings", []))
            })

        return results_list

    results.append(timed_test("Multi-Scenario Decision Sweep", test_multi_scenario_sweep))

    def test_decision_quality():
        """Validate that IDSS decisions are logically consistent."""
        from modules.fatigue import detect_fatigue_batch

        batch = detect_fatigue_batch()
        decisions = batch["decisions"]

        quality_checks = {
            "all_have_level": all(d.get("fatigue_level") in ["LOW", "MEDIUM", "HIGH", "CRITICAL"] for d in decisions if "error" not in d),
            "scores_in_range": all(0 <= d.get("fatigue_score", 0) <= 100 for d in decisions if "error" not in d),
            "critical_has_rules": all(
                len(d.get("triggered_rules", [])) > 0
                for d in decisions
                if d.get("fatigue_level") in ("HIGH", "CRITICAL") and "error" not in d
            ),
            "low_has_low_score": all(
                d.get("fatigue_score", 0) < 20
                for d in decisions
                if d.get("fatigue_level") == "LOW" and "error" not in d
            ),
            "all_have_recommendation": all(
                d.get("recommendation", "") != ""
                for d in decisions if "error" not in d
            ),
        }

        all_pass = all(quality_checks.values())
        return {"all_consistent": all_pass, "checks": quality_checks}

    results.append(timed_test("Decision Quality Validation", test_decision_quality))

    # ═══════════════════════════════════════════════════════════
    # FINAL REPORT
    # ═══════════════════════════════════════════════════════════
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    total_time = sum(r["time_ms"] for r in results)

    print("\n" + "=" * 70)
    print(f"  VALIDATION COMPLETE: {passed}/{len(results)} PASS")
    if failed > 0:
        print(f"  FAILURES: {failed}")
        for r in results:
            if r["status"] == "FAIL":
                print(f"    - {r['test']}: {r.get('error', 'unknown')}")
    print(f"  Total time: {total_time:.0f}ms")
    print("=" * 70)

    # Save results
    output = {
        "timestamp": datetime.utcnow().isoformat(),
        "passed": passed,
        "failed": failed,
        "total_time_ms": total_time,
        "tests": results
    }

    output_path = os.path.join(os.path.dirname(__file__), "validation_results.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, default=str, ensure_ascii=False)

    print(f"\n  Results saved to: {output_path}")

    return output


if __name__ == "__main__":
    run_full_validation()
