"""
IDSS Integration Test & Training Pipeline
==========================================
Tests all 6 modules end-to-end against real MongoDB data.
Outputs:  accuracy metrics, decision quality, response times, and training logs.

Run:  python tests/integration_test.py
"""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from db.mongo import get_db
from utils.features import compute_features, get_all_swimmer_ids, get_swimmer_info

# ── Colors for terminal ──
G = "\033[92m"  # green
R = "\033[91m"  # red
Y = "\033[93m"  # yellow
B = "\033[94m"  # blue
W = "\033[0m"   # reset
BOLD = "\033[1m"

results_log = []
total_pass = 0
total_fail = 0
total_time = 0.0


def log(icon, msg, color=W):
    print(f"  {color}{icon} {msg}{W}")


def section(title):
    print(f"\n{BOLD}{B}{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}{W}")


def run_test(test_name, fn):
    global total_pass, total_fail, total_time
    t0 = time.time()
    try:
        result = fn()
        elapsed = round((time.time() - t0) * 1000, 1)
        total_time += elapsed
        total_pass += 1
        log("PASS", f"{test_name} ({elapsed}ms)", G)
        results_log.append({
            "test": test_name, "status": "PASS",
            "time_ms": elapsed, "detail": result
        })
        return result
    except Exception as e:
        elapsed = round((time.time() - t0) * 1000, 1)
        total_time += elapsed
        total_fail += 1
        log("FAIL", f"{test_name} ({elapsed}ms) — {e}", R)
        results_log.append({
            "test": test_name, "status": "FAIL",
            "time_ms": elapsed, "error": str(e)
        })
        return None


# ═══════════════════════════════════════════════════════════════
# STEP 1 — SYSTEM CONNECTION
# ═══════════════════════════════════════════════════════════════
section("STEP 1 — SYSTEM CONNECTION")

def test_mongodb_connection():
    db = get_db()
    collections = db.list_collection_names()
    assert len(collections) > 0, "No collections found"
    log("    ", f"Database: {db.name}", Y)
    log("    ", f"Collections: {', '.join(collections)}", Y)
    return {"db": db.name, "collections": collections}

def test_data_counts():
    db = get_db()
    counts = {}
    for col_name in ["nageurs", "performances", "entrainements", "users", "competitions"]:
        counts[col_name] = db[col_name].count_documents({})
        log("    ", f"  {col_name}: {counts[col_name]} documents", Y)
    assert counts["nageurs"] > 0, "No nageurs in database"
    return counts

def test_swimmer_ids():
    ids = get_all_swimmer_ids()
    assert len(ids) > 0, "No swimmer IDs returned"
    log("    ", f"  {len(ids)} swimmers found", Y)
    return {"count": len(ids), "sample": ids[:3]}

run_test("MongoDB Connection", test_mongodb_connection)
data_counts = run_test("Data Counts", test_data_counts)
swimmer_data = run_test("Swimmer IDs Retrieval", test_swimmer_ids)


# ═══════════════════════════════════════════════════════════════
# STEP 2 — DATA PIPELINE (Feature Engineering)
# ═══════════════════════════════════════════════════════════════
section("STEP 2 — DATA PIPELINE")

swimmer_ids = get_all_swimmer_ids()
test_swimmer_id = swimmer_ids[0] if swimmer_ids else None

def test_feature_extraction():
    features = compute_features(test_swimmer_id)
    assert "swimmer_id" in features, "swimmer_id missing"
    assert "acwr" in features, "ACWR missing"
    log("    ", f"  Features for {features.get('name', '?')}: "
              f"ACWR={features.get('acwr')}, "
              f"sessions_7d={features.get('sessions_last7d')}, "
              f"slope={features.get('trend_slope')}", Y)
    return features

def test_all_swimmers_features():
    """Extract features for ALL swimmers — validates data pipeline at scale."""
    results = {"success": 0, "fail": 0, "missing_data": 0, "features_sample": []}
    for sid in swimmer_ids:
        try:
            f = compute_features(sid)
            if f.get("sessions_count", 0) == 0:
                results["missing_data"] += 1
            else:
                results["success"] += 1
            if len(results["features_sample"]) < 3:
                results["features_sample"].append({
                    "name": f.get("name"),
                    "sessions": f.get("sessions_count"),
                    "acwr": f.get("acwr"),
                    "trend_slope": f.get("trend_slope")
                })
        except Exception:
            results["fail"] += 1
    log("    ", f"  Success: {results['success']}, Missing data: {results['missing_data']}, Failed: {results['fail']}", Y)
    return results

run_test("Single Swimmer Feature Extraction", test_feature_extraction)
pipeline_results = run_test("Full Pipeline — All Swimmers", test_all_swimmers_features)


# ═══════════════════════════════════════════════════════════════
# STEP 3 — IDSS DECISION LOGIC
# ═══════════════════════════════════════════════════════════════
section("STEP 3 — IDSS DECISION LOGIC")

def test_fatigue_single():
    from modules.fatigue import detect_fatigue_single
    result = detect_fatigue_single(test_swimmer_id)
    assert "fatigue_level" in result, "fatigue_level missing"
    assert "fatigue_score" in result, "fatigue_score missing"
    assert result["fatigue_score"] >= 0, "Invalid score"
    log("    ", f"  {result.get('name')}: level={result['fatigue_level']}, "
              f"score={result['fatigue_score']}/100, "
              f"ACWR={result.get('acwr')}", Y)
    return {k: v for k, v in result.items() if k != "triggered_rules"}

def test_fatigue_batch():
    from modules.fatigue import detect_fatigue_batch
    result = detect_fatigue_batch()
    assert "total_analyzed" in result, "total_analyzed missing"
    assert "level_distribution" in result, "distribution missing"
    dist = result["level_distribution"]
    log("    ", f"  Analyzed: {result['total_analyzed']}, "
              f"Distribution: LOW={dist.get('LOW')}, MED={dist.get('MEDIUM')}, "
              f"HIGH={dist.get('HIGH')}, CRIT={dist.get('CRITICAL')}", Y)
    return {"total": result["total_analyzed"], "distribution": dist,
            "at_risk": result.get("at_risk_count")}

def test_performance_analysis():
    from modules.performance import analyze_performance
    result = analyze_performance(test_swimmer_id)
    assert "trend" in result, "trend missing"
    log("    ", f"  {result.get('name')}: trend={result['trend']}, "
              f"sessions={result.get('sessions_analyzed')}, "
              f"best={result.get('personal_best_sec')}s", Y)
    return {k: v for k, v in result.items() if k != "chart_data"}

def test_prediction():
    from modules.performance import predict_time
    result = predict_time(test_swimmer_id)
    log("    ", f"  {result.get('name')}: predicted={result.get('predicted_time_sec')}s, "
              f"confidence={result.get('confidence')}, "
              f"R²={result.get('r_squared')}", Y)
    return result

def test_recommendation():
    from modules.recommendation import recommend_swimmers
    result = recommend_swimmers(top_n=3)
    ranked = result.get("ranked_swimmers", [])
    for s in ranked:
        log("    ", f"  #{s.get('rank')} {s.get('name')}: "
                  f"score={s.get('score'):.3f}, "
                  f"trend={s.get('trend')}, "
                  f"fatigue={s.get('fatigue_level')}", Y)
    return {"total_evaluated": result.get("total_evaluated"),
            "top3": [{"name": s.get("name"), "score": s.get("score")} for s in ranked]}

def test_simulation():
    from modules.simulation import simulate_scenario
    changes = {"sessions_per_week": 5, "avg_intensity": 7, "avg_load_km_per_session": 4}
    result = simulate_scenario(test_swimmer_id, simulation_weeks=4, changes=changes)
    proj = result.get("projected", {})
    log("    ", f"  {result.get('name')}: delta={proj.get('delta_sec')}s, "
              f"ACWR={proj.get('acwr')}, "
              f"fatigue={proj.get('fatigue_change')}", Y)
    return {"delta": proj.get("delta_sec"), "acwr": proj.get("acwr"),
            "warnings": len(result.get("warnings", []))}

def test_explainability():
    from modules.explainability import explain_fatigue_decision
    from modules.fatigue import detect_fatigue_single
    fatigue = detect_fatigue_single(test_swimmer_id)
    result = explain_fatigue_decision(fatigue)
    assert "summary" in result, "summary missing"
    assert "reasoning_chain" in result, "reasoning_chain missing"
    log("    ", f"  Data quality: {result.get('data_quality')}", Y)
    log("    ", f"  Factors: {len(result.get('factor_contributions', []))}", Y)
    return {"data_quality": result.get("data_quality"),
            "method": result.get("method"),
            "chain_steps": len(result.get("reasoning_chain", []))}

def test_training_plan():
    from modules.planning import generate_training_plan
    result = generate_training_plan(test_swimmer_id, target_weeks=4)
    log("    ", f"  {result.get('swimmer_name')}: phase={result.get('current_phase')}, "
              f"weeks={len(result.get('weekly_plans', []))}", Y)
    return {"phase": result.get("current_phase"),
            "weeks_generated": len(result.get("weekly_plans", []))}

run_test("Fatigue Detection — Single", test_fatigue_single)
run_test("Fatigue Detection — Batch", test_fatigue_batch)
run_test("Performance Analysis", test_performance_analysis)
run_test("Performance Prediction (ML)", test_prediction)
run_test("Competition Recommendation", test_recommendation)
run_test("Scenario Simulation", test_simulation)
run_test("Explainability Layer", test_explainability)
run_test("Training Plan Generation", test_training_plan)


# ═══════════════════════════════════════════════════════════════
# STEP 4 — TRAINING VALIDATION (ML Model Quality)
# ═══════════════════════════════════════════════════════════════
section("STEP 4 — ML TRAINING VALIDATION")

def test_model_quality():
    """Test the LinearRegression model quality across all swimmers with enough data."""
    from modules.performance import predict_time
    model_stats = {"total": 0, "with_prediction": 0, "confidence_dist": {},
                   "r2_values": [], "avg_r2": 0}
    
    for sid in swimmer_ids:
        model_stats["total"] += 1
        try:
            result = predict_time(sid)
            if result.get("predicted_time_sec") is not None:
                model_stats["with_prediction"] += 1
                conf = result.get("confidence", "NONE")
                model_stats["confidence_dist"][conf] = model_stats["confidence_dist"].get(conf, 0) + 1
                r2 = result.get("r_squared", 0)
                if r2 > 0:
                    model_stats["r2_values"].append(r2)
        except Exception:
            pass
    
    if model_stats["r2_values"]:
        model_stats["avg_r2"] = round(sum(model_stats["r2_values"]) / len(model_stats["r2_values"]), 3)
    
    log("    ", f"  Swimmers with prediction: {model_stats['with_prediction']}/{model_stats['total']}", Y)
    log("    ", f"  Confidence: {model_stats['confidence_dist']}", Y)
    log("    ", f"  Average R²: {model_stats['avg_r2']}", Y)
    return model_stats

run_test("ML Model Quality Assessment", test_model_quality)


# ═══════════════════════════════════════════════════════════════
# STEP 5 — DECISION SIMULATION
# ═══════════════════════════════════════════════════════════════
section("STEP 5 — MULTI-SCENARIO DECISION TESTING")

def test_scenario_sweep():
    """Run multiple simulation scenarios and validate decision consistency."""
    from modules.simulation import simulate_scenario
    scenarios = [
        {"label": "Light", "changes": {"sessions_per_week": 3, "avg_intensity": 4, "avg_load_km_per_session": 2}},
        {"label": "Moderate", "changes": {"sessions_per_week": 4, "avg_intensity": 6, "avg_load_km_per_session": 3.5}},
        {"label": "Intense", "changes": {"sessions_per_week": 6, "avg_intensity": 8, "avg_load_km_per_session": 5}},
        {"label": "Extreme", "changes": {"sessions_per_week": 7, "avg_intensity": 10, "avg_load_km_per_session": 8}},
    ]
    results = []
    for sc in scenarios:
        r = simulate_scenario(test_swimmer_id, 4, sc["changes"])
        proj = r.get("projected", {})
        results.append({
            "scenario": sc["label"],
            "delta_sec": proj.get("delta_sec", 0),
            "acwr": proj.get("acwr", 0),
            "fatigue": proj.get("fatigue_level", "?"),
            "warnings": len(r.get("warnings", []))
        })
        log("    ", f"  {sc['label']}: delta={proj.get('delta_sec')}s, "
                  f"ACWR={proj.get('acwr')}, fatigue={proj.get('fatigue_level')}, "
                  f"warnings={len(r.get('warnings', []))}", Y)
    
    # Validate logical consistency: extreme should have worse outcomes than light
    if len(results) >= 2:
        light_delta = results[0]["delta_sec"]
        extreme_delta = results[-1]["delta_sec"]
        assert extreme_delta >= light_delta or results[-1]["warnings"] > results[0]["warnings"], \
            "Decision consistency check: extreme scenario should not outperform light"
    
    return results

run_test("Multi-Scenario Decision Sweep", test_scenario_sweep)


# ═══════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════
section("FINAL REPORT")

print(f"\n  {BOLD}Test Results:{W}")
print(f"    {G}Passed: {total_pass}{W}")
print(f"    {R}Failed: {total_fail}{W}")
print(f"    Total time: {total_time:.0f}ms")
print(f"    Average: {total_time/(total_pass+total_fail):.0f}ms per test")

# Save results to log file
log_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                         "tests", "integration_results.json")
with open(log_path, "w", encoding="utf-8") as f:
    json.dump({
        "timestamp": datetime.utcnow().isoformat(),
        "passed": total_pass,
        "failed": total_fail,
        "total_time_ms": round(total_time, 1),
        "tests": results_log
    }, f, indent=2, ensure_ascii=False, default=str)

print(f"\n  {B}Results saved to: {log_path}{W}")
print(f"{'='*60}\n")

sys.exit(0 if total_fail == 0 else 1)
