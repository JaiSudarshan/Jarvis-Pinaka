import uuid
from fastapi import APIRouter, HTTPException
from backend.schemas import ReminderCreate
from backend.services.scheduler_service import reminder_scheduler
from backend.database import get_db

router = APIRouter(tags=["Reminders"])

@router.get("/api/reminders")
def list_reminders():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM reminders ORDER BY remind_at ASC")
        return [dict(row) for row in c.fetchall()]

@router.post("/api/reminders")
def create_reminder(payload: ReminderCreate):
    reminder_id = str(uuid.uuid4())
    try:
        res = reminder_scheduler.schedule_reminder(
            reminder_id=reminder_id,
            message=payload.message,
            remind_at_iso=payload.remind_at
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/api/reminders/{reminder_id}")
def delete_reminder(reminder_id: str):
    success = reminder_scheduler.cancel_reminder(reminder_id)
    if not success:
        raise HTTPException(status_code=404, detail="Reminder not found or already completed/cancelled")
    return {"status": "CANCELLED", "id": reminder_id}
