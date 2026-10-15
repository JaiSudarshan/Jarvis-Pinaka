from fastapi import APIRouter
from datetime import datetime, timezone

router = APIRouter(tags=["Health"])

@router.get("/api/health")
def get_health():
    return {
        "status": "ok",
        "app": "JARVIS ONE — Autonomous Multi-Action AI Assistant",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
