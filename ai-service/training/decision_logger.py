"""
IDSS AI — Decision Logger (STEP 3/5)
Logs every AI decision to MongoDB for audit trail, explainability, and future training.
Also persists decisions to the IDSSDecision collection used by the Node.js backend.
"""
import os
import sys
import json
from datetime import datetime
from bson import ObjectId

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.mongo import get_collection


def log_decision(swimmer_id: str, decision_type: str, result: dict,
                 source: str = "ai_brain") -> str:
    """
    Log an AI decision to MongoDB.
    Returns the inserted document ID.
    
    Args:
        swimmer_id: ObjectId string of the swimmer
        decision_type: fatigue | prediction | recommendation | simulation | plan
        result: the full AI output dict
        source: 'rules' | 'ml' | 'hybrid' | 'ai_brain'
    """
    col = get_collection("idssdecisions")

    doc = {
        "nageur": ObjectId(swimmer_id),
        "decisionType": decision_type,
        "source": source,
        "timestamp": datetime.utcnow(),

        # Core fields mapped from AI result
        "fatigueScore": result.get("fatigue_score", 0),
        "fatigueLevel": result.get("fatigue_level", "LOW"),
        "triggeredRules": [
            {
                "ruleId": r.get("rule", ""),
                "severity": r.get("severity", "INFO"),
                "message": r.get("message", ""),
                "overridable": True
            }
            for r in result.get("triggered_rules", [])
        ],

        # Recommendation
        "recommendation": _map_recommendation(result),
        "recommendationMessage": result.get("recommendation", result.get("explanation", "")),

        # Confidence
        "confidence": result.get("confidence", "MEDIUM"),

        # Full result snapshot for debugging
        "inputSnapshot": _safe_snapshot(result),

        # Not yet acknowledged
        "acknowledged": False,
        "coachNote": "",

        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }

    inserted = col.insert_one(doc)
    return str(inserted.inserted_id)


def log_batch_decisions(decisions: list, decision_type: str = "fatigue") -> dict:
    """
    Log multiple decisions at once (e.g., from batch fatigue detection).
    Returns summary of logged decisions.
    """
    logged = []
    errors = []

    for decision in decisions:
        sid = decision.get("swimmer_id")
        if not sid:
            continue
        try:
            doc_id = log_decision(sid, decision_type, decision)
            logged.append({
                "swimmer_id": sid,
                "name": decision.get("name", ""),
                "decision_id": doc_id,
                "level": decision.get("fatigue_level", "")
            })
        except Exception as e:
            errors.append({"swimmer_id": sid, "error": str(e)})

    return {
        "total_logged": len(logged),
        "errors": len(errors),
        "decisions": logged,
        "error_details": errors
    }


def get_decision_history(swimmer_id: str, limit: int = 20) -> list:
    """Get recent AI decisions for a swimmer."""
    col = get_collection("idssdecisions")
    cursor = col.find(
        {"nageur": ObjectId(swimmer_id)},
        {"inputSnapshot": 0}  # Exclude large snapshot
    ).sort("createdAt", -1).limit(limit)

    results = []
    for doc in cursor:
        doc["_id"] = str(doc["_id"])
        doc["nageur"] = str(doc["nageur"])
        if "timestamp" in doc and doc["timestamp"]:
            doc["timestamp"] = doc["timestamp"].isoformat()
        if "createdAt" in doc and doc["createdAt"]:
            doc["createdAt"] = doc["createdAt"].isoformat()
        results.append(doc)

    return results


def get_decision_stats() -> dict:
    """Get aggregate stats about all decisions made."""
    col = get_collection("idssdecisions")

    total = col.count_documents({})
    acknowledged = col.count_documents({"acknowledged": True})
    unacknowledged = col.count_documents({"acknowledged": False})

    # Level distribution
    pipeline = [
        {"$group": {"_id": "$fatigueLevel", "count": {"$sum": 1}}}
    ]
    level_dist = {doc["_id"]: doc["count"] for doc in col.aggregate(pipeline)}

    # Source distribution
    pipeline = [
        {"$group": {"_id": "$source", "count": {"$sum": 1}}}
    ]
    source_dist = {doc["_id"]: doc["count"] for doc in col.aggregate(pipeline)}

    return {
        "total_decisions": total,
        "acknowledged": acknowledged,
        "unacknowledged": unacknowledged,
        "fatigue_distribution": level_dist,
        "source_distribution": source_dist
    }


def _map_recommendation(result: dict) -> str:
    """Map AI fatigue level to the IDSSDecision recommendation enum."""
    level = result.get("fatigue_level", "LOW")
    mapping = {
        "LOW": "NORMAL_TRAINING",
        "MEDIUM": "REDUCE_INTENSITY",
        "HIGH": "RECOVERY_SESSION",
        "CRITICAL": "MANDATORY_REST"
    }
    return mapping.get(level, "NORMAL_TRAINING")


def _safe_snapshot(result: dict) -> dict:
    """Create a MongoDB-safe snapshot (no ObjectId, no NaN)."""
    safe = {}
    for k, v in result.items():
        if isinstance(v, float) and (v != v):  # NaN check
            safe[k] = None
        elif isinstance(v, (str, int, float, bool, list)):
            safe[k] = v
        elif isinstance(v, dict):
            safe[k] = _safe_snapshot(v)
        elif v is None:
            safe[k] = None
        else:
            safe[k] = str(v)
    return safe
