"""
IDSS AI Service — FastAPI Application
Intelligent Decision Support System for Stade Tunisien Swimming Club.
Main entry point. All endpoints proxy through Node.js backend.

Endpoints:
  GET  /health         — service health check
  POST /analyze        — performance trend analysis
  POST /predict        — predict next race time
  POST /fatigue        — detect fatigue (single or batch)
  POST /recommend      — rank swimmers for competition
  POST /simulate       — what-if scenario simulation
  POST /explain        — explainability layer for any decision
  POST /plan           — personalized training plan generation
  GET  /team-plan      — team-wide training planning
"""
import sys
import os
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Ensure the ai-service directory is on the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import traceback

from config import PORT


@asynccontextmanager
async def lifespan(application):
    """Test MongoDB connection on startup."""
    try:
        from db.mongo import get_db
        db = get_db()
        collections = db.list_collection_names()
        print(f"[OK] MongoDB connected! Database: {db.name}")
        print(f"     Collections: {', '.join(collections[:10])}")
        nageur_count = db["nageurs"].count_documents({})
        perf_count = db["performances"].count_documents({})
        train_count = db["entrainements"].count_documents({})
        print(f"     Data: Nageurs={nageur_count}, Performances={perf_count}, Entrainements={train_count}")
    except Exception as e:
        print(f"[WARN] MongoDB connection: {e}")
        print("        Service will still start -- MongoDB connects on first request.")
    yield


app = FastAPI(
    title="IDSS AI Service",
    description="Intelligent Decision Support System -- Swimming Club AI Engine",
    version="1.0.0",
    lifespan=lifespan
)

# CORS (for direct testing; in production Node.js proxies to this)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)




# ── Request Models ──────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    swimmer_id: str
    period_days: int = 90
    stroke: Optional[str] = None

class PredictRequest(BaseModel):
    swimmer_id: str
    competition_date: Optional[str] = None
    training_plan: Optional[dict] = None

class FatigueRequest(BaseModel):
    swimmer_ids: Optional[List[str]] = None
    use_ml: bool = False

class RecommendRequest(BaseModel):
    competition_id: Optional[str] = None
    stroke: Optional[str] = None
    distance: Optional[int] = None
    category: Optional[str] = None
    top_n: int = 5

class SimulateRequest(BaseModel):
    swimmer_id: str
    simulation_weeks: int = 4
    changes: Optional[dict] = None

class ExplainRequest(BaseModel):
    decision_type: str  # "fatigue", "prediction", "recommendation", "simulation"
    swimmer_id: Optional[str] = None
    params: Optional[dict] = None

class PlanRequest(BaseModel):
    swimmer_id: str
    target_weeks: int = 4


# ── Endpoints ───────────────────────────────────────────────────

@app.get("/health")
def health():
    """Service health check."""
    try:
        from db.mongo import get_db
        db = get_db()
        db.command("ping")
        mongo_status = "connected"
    except Exception:
        mongo_status = "disconnected"
    
    return {
        "status": "ok",
        "service": "IDSS AI",
        "version": "1.0.0",
        "mongodb": mongo_status
    }


@app.post("/analyze")
def analyze(req: AnalyzeRequest):
    """Analyze a swimmer's performance trend."""
    try:
        from modules.performance import analyze_performance
        return analyze_performance(req.swimmer_id, req.period_days, req.stroke)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict")
def predict(req: PredictRequest):
    """Predict next race time using Linear Regression."""
    try:
        from modules.performance import predict_time
        return predict_time(req.swimmer_id, req.competition_date, req.training_plan)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/fatigue")
def fatigue(req: FatigueRequest):
    """Detect fatigue for one or all swimmers."""
    try:
        from modules.fatigue import detect_fatigue_batch, detect_fatigue_single
        if req.swimmer_ids and len(req.swimmer_ids) == 1:
            return detect_fatigue_single(req.swimmer_ids[0], req.use_ml)
        return detect_fatigue_batch(req.swimmer_ids, req.use_ml)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """Rank swimmers for competition selection."""
    try:
        from modules.recommendation import recommend_swimmers
        return recommend_swimmers(
            req.competition_id, req.stroke,
            req.distance, req.category, req.top_n
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulate")
def simulate(req: SimulateRequest):
    """Simulate training plan changes."""
    try:
        from modules.simulation import simulate_scenario
        return simulate_scenario(req.swimmer_id, req.simulation_weeks, req.changes)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/dashboard")
def dashboard():
    """
    Combined dashboard endpoint — returns fatigue status for ALL swimmers in one call.
    Used by the Angular admin/coach dashboard to show real-time IDSS state.
    """
    try:
        from modules.fatigue import detect_fatigue_batch
        result = detect_fatigue_batch()
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-analyze")
def batch_analyze():
    """
    Analyze all swimmers at once and return combined fatigue + performance summary.
    Useful for seeding the IDSS dashboard with real data.
    """
    try:
        from modules.fatigue import detect_fatigue_batch
        from utils.features import get_all_swimmer_ids
        swimmer_ids = get_all_swimmer_ids()
        if not swimmer_ids:
            return {"message": "No swimmers found in database", "total": 0, "results": []}
        result = detect_fatigue_batch(swimmer_ids)
        return result
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/explain")
def explain(req: ExplainRequest):
    """
    Explainability layer — provides transparent, structured reasoning
    for any IDSS decision. Ensures all recommendations are understandable.
    """
    try:
        from modules.explainability import (
            explain_fatigue_decision, explain_prediction,
            explain_recommendation, explain_simulation
        )
        
        if req.decision_type == "fatigue" and req.swimmer_id:
            from modules.fatigue import detect_fatigue_single
            fatigue_result = detect_fatigue_single(req.swimmer_id)
            return explain_fatigue_decision(fatigue_result)
        
        elif req.decision_type == "prediction" and req.swimmer_id:
            from modules.performance import predict_time
            pred_result = predict_time(req.swimmer_id)
            return explain_prediction(pred_result)
        
        elif req.decision_type == "recommendation":
            from modules.recommendation import recommend_swimmers
            params = req.params or {}
            rec_result = recommend_swimmers(
                params.get("competition_id"),
                params.get("stroke"),
                params.get("distance"),
                params.get("category"),
                params.get("top_n", 5)
            )
            return explain_recommendation(rec_result)
        
        elif req.decision_type == "simulation" and req.swimmer_id:
            from modules.simulation import simulate_scenario
            params = req.params or {}
            sim_result = simulate_scenario(
                req.swimmer_id,
                params.get("simulation_weeks", 4),
                params.get("changes")
            )
            return explain_simulation(sim_result)
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Type de décision invalide: '{req.decision_type}'. "
                       f"Types valides: fatigue, prediction, recommendation, simulation"
            )
    except HTTPException:
        raise
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/plan")
def plan(req: PlanRequest):
    """Generate a personalized training plan for a swimmer."""
    try:
        from modules.planning import generate_training_plan
        return generate_training_plan(req.swimmer_id, req.target_weeks)
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/team-plan")
def team_plan():
    """Generate training planning recommendations for the entire team."""
    try:
        from modules.planning import generate_team_planning
        return generate_team_planning()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# ── Training & Decision Logging Endpoints ───────────────────────

@app.post("/train")
def train():
    """
    Trigger the ML training pipeline.
    Trains all models: Fatigue Classifier, Performance Predictor, Readiness Scorer.
    Returns training metrics (accuracy, R2, feature importances).
    """
    try:
        from training.ml_trainer import run_training_pipeline
        return run_training_pipeline()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class DecisionHistoryRequest(BaseModel):
    swimmer_id: str
    limit: int = 20


@app.post("/decision-history")
def decision_history(req: DecisionHistoryRequest):
    """Get AI decision history for a swimmer (audit trail)."""
    try:
        from training.decision_logger import get_decision_history
        return {"decisions": get_decision_history(req.swimmer_id, req.limit)}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/decision-stats")
def decision_stats():
    """Get aggregate statistics about all AI decisions made."""
    try:
        from training.decision_logger import get_decision_stats
        return get_decision_stats()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/validate")
def validate():
    """Run the full system validation suite and return results."""
    try:
        from training.validate_system import run_full_validation
        return run_full_validation()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    print(f"[IDSS AI] Starting on port {PORT}...")
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)

