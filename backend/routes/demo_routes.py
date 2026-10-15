from fastapi import APIRouter
from backend.schemas import FailureToggle
from backend.database import get_db

router = APIRouter(tags=["Demo Controls"])

@router.get("/api/demo/injections")
def list_injections():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM demo_failure_injections")
        return [dict(row) for row in c.fetchall()]

@router.post("/api/demo/injections")
def toggle_injection(payload: FailureToggle):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("""
        UPDATE demo_failure_injections
        SET enabled = ?
        WHERE key = ?
        """, (1 if payload.enabled else 0, payload.key))
        c.execute("SELECT * FROM demo_failure_injections WHERE key = ?", (payload.key,))
        row = c.fetchone()
        return dict(row) if row else {"key": payload.key, "enabled": payload.enabled}

@router.post("/api/demo/reset")
def reset_injections():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("UPDATE demo_failure_injections SET enabled = 0")
        c.execute("SELECT * FROM demo_failure_injections")
        return [dict(row) for row in c.fetchall()]
