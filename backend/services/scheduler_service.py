import uuid
from datetime import datetime, timezone
import pytz
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.base import JobLookupError
from backend.database import get_db
from backend.services.sse_manager import sse_manager
import asyncio

class ReminderSchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.scheduler.start()

    def _on_reminder_due(self, reminder_id: str):
        """Called when a scheduled reminder is due."""
        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE reminders
            SET status = 'DELIVERED', delivered_at = ?
            WHERE id = ? AND status = 'SCHEDULED'
            """, (now_iso, reminder_id))
            
            cursor.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
            row = cursor.fetchone()
            if row:
                reminder_data = dict(row)
                # 1. Broadcast in-app real-time notification over SSE
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        asyncio.run_coroutine_threadsafe(
                            sse_manager.broadcast("reminder_notification", reminder_data),
                            loop
                        )
                except Exception:
                    pass

                # 2. Dispatch Email notification to Gmail
                try:
                    from backend.services.gmail_service import gmail_service
                    target_email = gmail_service.get_connected_account()
                    if target_email:
                        msg_text = reminder_data.get("message", "Scheduled Reminder")
                        gmail_service.send_email(
                            recipient=target_email,
                            subject=f"⏰ JARVIS Reminder: {msg_text}",
                            body=(
                                f"Hello,\n\n"
                                f"This is an automated reminder from your JARVIS ONE Assistant:\n\n"
                                f"🔔 \"{msg_text}\"\n\n"
                                f"Scheduled Time: {reminder_data.get('remind_at')}\n"
                                f"Delivered At: {now_iso}\n\n"
                                f"— JARVIS ONE Autonomous Assistant"
                            )
                        )
                        print(f"[JARVIS Scheduler] Successfully dispatched reminder email to {target_email}")
                    else:
                        print(f"[JARVIS Scheduler] Reminder '{reminder_data.get('message')}' triggered. Connect Google account in Integrations tab to receive inbox emails.")
                except Exception as e:
                    print(f"[JARVIS Scheduler] Note on email delivery: {e}")

    def schedule_reminder(
        self, 
        reminder_id: str, 
        message: str, 
        remind_at_iso: str, 
        task_id: str = None, 
        step_id: str = None,
        google_event_id: str = None,
        google_calendar_link: str = None
    ) -> dict:
        """Create and schedule a real reminder, linked with Google Calendar."""
        # Check demo failure injection
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT enabled FROM demo_failure_injections WHERE key = 'reminder_schedule_fail'")
            flag = c.fetchone()
            if flag and flag["enabled"] == 1:
                raise RuntimeError("Injected Failure: Simulated APScheduler lock failure while registering reminder job.")

        # Parse ISO datetime
        try:
            due_dt = datetime.fromisoformat(remind_at_iso)
        except Exception:
            raise ValueError(f"Invalid ISO datetime string: {remind_at_iso}")

        # If timezone-naive, assign UTC or local
        if due_dt.tzinfo is None:
            local_tz = pytz.timezone("Asia/Kolkata")
            due_dt = local_tz.localize(due_dt)

        now_iso = datetime.now(timezone.utc).isoformat()
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO reminders (id, task_id, step_id, message, remind_at, status, delivery_channel, google_event_id, google_calendar_link, created_at)
            VALUES (?, ?, ?, ?, ?, 'SCHEDULED', 'in_app', ?, ?, ?)
            """, (reminder_id, task_id, step_id, message, due_dt.isoformat(), google_event_id, google_calendar_link, now_iso))

        # Register in APScheduler
        self.scheduler.add_job(
            self._on_reminder_due,
            'date',
            run_date=due_dt,
            args=[reminder_id],
            id=reminder_id,
            replace_existing=True
        )

        return {
            "id": reminder_id,
            "message": message,
            "remind_at": due_dt.isoformat(),
            "status": "SCHEDULED",
            "delivery_channel": "in_app",
            "google_event_id": google_event_id,
            "google_calendar_link": google_calendar_link
        }

    def cancel_reminder(self, reminder_id: str) -> bool:
        """Cancel an active reminder."""
        try:
            self.scheduler.remove_job(reminder_id)
        except JobLookupError:
            pass
        
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE reminders
            SET status = 'CANCELLED'
            WHERE id = ? AND status = 'SCHEDULED'
            """, (reminder_id,))
            return cursor.rowcount > 0

    def verify_reminder(self, reminder_id: str) -> bool:
        """Read-after-write verification: check database and active scheduler job."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status FROM reminders WHERE id = ?", (reminder_id,))
            row = cursor.fetchone()
            if not row or row["status"] != "SCHEDULED":
                return False
            # Check if job exists in APScheduler
            job = self.scheduler.get_job(reminder_id)
            return job is not None

    def reload_from_db(self):
        """Restore active SCHEDULED reminders across server restarts."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reminders WHERE status = 'SCHEDULED'")
            rows = cursor.fetchall()
            now_dt = datetime.now(timezone.utc)
            for row in rows:
                reminder_id = row["id"]
                try:
                    due_dt = datetime.fromisoformat(row["remind_at"])
                    if due_dt <= now_dt:
                        # Due while server was offline -> trigger immediately
                        self._on_reminder_due(reminder_id)
                    else:
                        self.scheduler.add_job(
                            self._on_reminder_due,
                            'date',
                            run_date=due_dt,
                            args=[reminder_id],
                            id=reminder_id,
                            replace_existing=True
                        )
                except Exception as e:
                    print(f"Error restoring reminder {reminder_id}: {e}")

reminder_scheduler = ReminderSchedulerService()
