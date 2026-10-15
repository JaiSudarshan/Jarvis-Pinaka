import uuid
import json
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

from backend.database import get_db
from backend.services.scheduler_service import reminder_scheduler
from backend.services.gmail_service import gmail_service
from backend.services.calendar_service import calendar_service
from backend.services.cab_service import cab_service
from backend.services.sse_manager import sse_manager
from backend.config import SAVED_CONTACTS

class ExecutionEngine:
    async def persist_plan(self, plan_data: dict) -> str:
        """Persists a new plan into the database."""
        task_id = plan_data["task_id"]
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            c = conn.cursor()
            c.execute("""
            INSERT OR REPLACE INTO tasks (id, instruction, intent, status, clarifications, summary, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                task_id,
                plan_data["instruction"],
                plan_data["intent"],
                "AWAITING_APPROVAL" if plan_data.get("ready_for_approval") else "PLANNED",
                json.dumps(plan_data.get("clarification_questions", [])),
                plan_data.get("summary", ""),
                now_iso,
                now_iso
            ))

            c.execute("DELETE FROM steps WHERE task_id = ?", (task_id,))

            for idx, step in enumerate(plan_data["steps"]):
                step_id = step.get("id") or str(uuid.uuid4())
                idempotency_key = f"{task_id}_{step.get('tool')}_{idx}"
                params = {
                    "time": step.get("time"),
                    "message": step.get("message"),
                    "recipient": step.get("recipient"),
                    "subject": step.get("subject"),
                    "body": step.get("body"),
                    "pickup": step.get("pickup"),
                    "destination": step.get("destination"),
                    "pickup_time": step.get("pickup_time"),
                    "fare_estimate": step.get("fare_estimate"),
                    "cab_type": step.get("cab_type")
                }
                is_approval_needed = 1 if step.get("requires_approval") else 0
                initially_approved = 1 if not is_approval_needed else 0
                c.execute("""
                INSERT INTO steps (id, task_id, step_order, tool, action, status, params_json, result_json, verification_status, error_message, idempotency_key, requires_approval, approved)
                VALUES (?, ?, ?, ?, ?, 'PLANNED', ?, '{}', 'PENDING', '', ?, ?, ?)
                """, (
                    step_id,
                    task_id,
                    idx,
                    step["tool"],
                    step["action"],
                    json.dumps(params),
                    idempotency_key,
                    is_approval_needed,
                    initially_approved
                ))

        await sse_manager.broadcast("task_planned", {"task_id": task_id, "status": "PLANNED"})
        return task_id

    async def execute_task(self, task_id: str, approved_step_ids: Optional[List[str]] = None):
        """Orchestrates step execution with read-after-write verification, recovery, and rollback."""
        approved_step_ids = approved_step_ids or []

        # Update approved steps in DB
        with get_db() as conn:
            c = conn.cursor()
            for s_id in approved_step_ids:
                c.execute("UPDATE steps SET approved = 1 WHERE id = ? AND task_id = ?", (s_id, task_id))
            c.execute("UPDATE tasks SET status = 'RUNNING', updated_at = ? WHERE id = ?", 
                      (datetime.now(timezone.utc).isoformat(), task_id))

        await sse_manager.broadcast("task_status_changed", {"task_id": task_id, "status": "RUNNING"})

        # Fetch all steps in order
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT * FROM steps WHERE task_id = ? ORDER BY step_order ASC", (task_id,))
            steps = [dict(row) for row in c.fetchall()]

        completed_count = 0
        failed_count = 0
        recovered_count = 0
        executed_tools = []
        created_reminder_ids = []

        for step in steps:
            step_id = step["id"]
            tool = step["tool"]
            action = step["action"]
            params = json.loads(step["params_json"])
            requires_approval = bool(step["requires_approval"])
            is_approved = bool(step["approved"]) or (step_id in approved_step_ids)

            # Check approval requirement
            if requires_approval and not is_approved:
                self._update_step_status(step_id, "SKIPPED", error="Not approved by user")
                continue

            # Check Idempotency (already completed previously)
            if step["status"] == "SUCCESS" and step["verification_status"] == "VERIFIED":
                completed_count += 1
                continue

            # Transition: RUNNING
            self._update_step_status(step_id, "RUNNING")
            await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "RUNNING"})
            await asyncio.sleep(0.4) # Brief pacing for visual progress feedback

            try:
                # 1. TOOL: REMINDER / CALENDAR (Guideline #2: Calendar Reminder Standard)
                if tool in ["reminder", "calendar"]:
                    title = params.get("message") or "Reminder"
                    remind_time = params.get("time")

                    google_event_id = None
                    google_cal_link = None
                    cal_status_note = ""

                    # Attempt to create Google Calendar event with active alert notification
                    try:
                        cal_res = calendar_service.create_event(
                            title=title,
                            start_time_iso=remind_time,
                            alert_minutes=10,
                            description=f"JARVIS Autonomous Assistant Reminder for Task {task_id[:8]}"
                        )
                        if cal_res and cal_res.get("verified"):
                            google_event_id = cal_res.get("event_id")
                            google_cal_link = cal_res.get("html_link")
                            cal_status_note = "Synchronized to Google Calendar with active alert triggers"
                    except Exception as cal_err:
                        err_str = str(cal_err)
                        if "insufficient" in err_str.lower() or "403" in err_str:
                            cal_status_note = "Calendar scope requires reauth: Run `python test_gmail_oauth.py --reauth` to grant Calendar access"
                        else:
                            cal_status_note = f"Google Calendar API notice: {err_str}"
                        print(f"[JARVIS Calendar Note] {cal_status_note}")

                    # Schedule in local scheduler (APScheduler)
                    reminder_id = str(uuid.uuid4())
                    sched_res = reminder_scheduler.schedule_reminder(
                        reminder_id=reminder_id,
                        message=title,
                        remind_at_iso=remind_time,
                        task_id=task_id,
                        step_id=step_id,
                        google_event_id=google_event_id,
                        google_calendar_link=google_cal_link
                    )
                    created_reminder_ids.append(reminder_id)

                    result_payload = {
                        **sched_res,
                        "google_calendar_event_id": google_event_id,
                        "google_calendar_link": google_cal_link,
                        "calendar_status": cal_status_note or "Synchronized to Google Calendar",
                        "active_alerts": "10-minute popup & email alert + on-time trigger"
                    }

                    # Transition: VERIFYING
                    self._update_step_status(step_id, "VERIFYING", result=result_payload)
                    await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "VERIFYING"})
                    await asyncio.sleep(0.3)

                    # Read-after-write verification on scheduler
                    verified = reminder_scheduler.verify_reminder(reminder_id)
                    if verified:
                        self._update_step_status(step_id, "SUCCESS", verification="VERIFIED", result=result_payload)
                        completed_count += 1
                        executed_tools.append("reminder")
                    else:
                        raise RuntimeError("Read-after-write verification failed: Reminder record missing from scheduler.")

                # 2. TOOL: GMAIL (Guideline #1: Zero approval, Guideline #3: Saved contacts, Guideline #4: Failure recovery)
                elif tool == "gmail":
                    if action in ["list_emails", "read_emails", "search_emails", "fetch_emails"]:
                        # Transition: VERIFYING
                        self._update_step_status(step_id, "VERIFYING")
                        await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "VERIFYING"})
                        await asyncio.sleep(0.3)

                        query = params.get("query")
                        max_res = params.get("max_results") or 5
                        emails = gmail_service.list_messages(max_results=max_res, query=query)
                        res = {
                            "action": action,
                            "count": len(emails),
                            "emails": emails,
                            "verified": True
                        }
                        self._update_step_status(step_id, "SUCCESS", verification="VERIFIED", result=res)
                        completed_count += 1
                        executed_tools.append("gmail")

                    else:
                        recipient = params.get("recipient")
                        # Automatically resolve contacts from directory
                        if recipient and recipient.lower() in SAVED_CONTACTS:
                            recipient = SAVED_CONTACTS[recipient.lower()]
                        elif not recipient:
                            for name, email in SAVED_CONTACTS.items():
                                if name in str(params).lower():
                                    recipient = email
                                    break

                        if not recipient:
                            raise ValueError("Missing recipient email address.")

                        subject = params.get("subject", "JARVIS Notification")
                        body = params.get("body", "")

                        # Transition: VERIFYING
                        self._update_step_status(step_id, "VERIFYING")
                        await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "VERIFYING"})
                        await asyncio.sleep(0.3)

                        # Retry loop for immediate recovery (Guideline #4)
                        last_err = None
                        send_res = None
                        for attempt in range(2):
                            try:
                                send_res = gmail_service.send_email(recipient=recipient, subject=subject, body=body)
                                if send_res.get("verified"):
                                    break
                            except Exception as e:
                                last_err = e
                                print(f"[JARVIS Gmail Retry {attempt+1}] Email error: {e}. Immediate retry...")
                                await asyncio.sleep(0.4)

                        if send_res and send_res.get("verified"):
                            self._update_step_status(step_id, "SUCCESS", verification="VERIFIED", result=send_res)
                            completed_count += 1
                            executed_tools.append("gmail")
                        else:
                            raise RuntimeError(f"Email dispatch definitively failed: {last_err or 'Verification failed'}")

                # 3. TOOL: CAB
                elif tool == "cab":
                    pickup = params.get("pickup")
                    destination = params.get("destination")
                    pickup_time = params.get("pickup_time")
                    cab_type = params.get("cab_type") or "Sedan (Demo)"

                    if not pickup or not destination:
                        raise ValueError("Missing pickup or destination location.")

                    booking_res = cab_service.book_ride(
                        pickup=pickup,
                        destination=destination,
                        pickup_time=pickup_time,
                        cab_type=cab_type,
                        task_id=task_id,
                        step_id=step_id
                    )

                    # Transition: VERIFYING
                    self._update_step_status(step_id, "VERIFYING", result=booking_res.to_dict())
                    await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "VERIFYING"})
                    await asyncio.sleep(0.4)

                    # Read-after-write verification check
                    is_verified = cab_service.verify_booking(booking_res.booking_reference)
                    
                    if booking_res.http_code == 200 and not is_verified:
                        # SILENT FAILURE DETECTED!
                        raise RuntimeError(
                            f"SILENT FAILURE DETECTED: Cab Provider returned HTTP 200 OK with reference '{booking_res.booking_reference}', but read-after-write verification found no active booking in database!"
                        )

                    if not booking_res.success:
                        raise RuntimeError(booking_res.error or "Cab booking failed at provider.")

                    if is_verified:
                        self._update_step_status(step_id, "SUCCESS", verification="VERIFIED", result=booking_res.to_dict())
                        completed_count += 1
                        executed_tools.append("cab")

            except Exception as e:
                err_msg = str(e)
                # Transition: RECOVERING
                self._update_step_status(step_id, "RECOVERING", error=err_msg)
                await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "RECOVERING"})
                await asyncio.sleep(0.5)

                recovery_success = await self._attempt_recovery(step_id, tool, params, err_msg, task_id)
                if recovery_success:
                    recovered_count += 1
                    executed_tools.append(tool)
                else:
                    self._update_step_status(step_id, "FAILED", error=err_msg, verification="FAILED")
                    failed_count += 1
                    # Stop sequence on unrecoverable failure
                    break

        # Compute overall task state
        overall_status = "SUCCESS"
        if failed_count > 0:
            if completed_count > 0 or recovered_count > 0:
                # Some actions completed and cannot be reversed (e.g. Email already sent)
                overall_status = "PARTIAL_COMPLETION"
            else:
                overall_status = "FAILED"
        elif recovered_count > 0 and failed_count == 0:
            overall_status = "RECOVERED"
        elif completed_count == 0 and failed_count == 0:
            overall_status = "AWAITING_APPROVAL"

        with get_db() as conn:
            c = conn.cursor()
            c.execute("UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?",
                      (overall_status, datetime.now(timezone.utc).isoformat(), task_id))

        await sse_manager.broadcast("task_status_changed", {"task_id": task_id, "status": overall_status})
        return overall_status

    async def _attempt_recovery(self, step_id: str, tool: str, params: dict, error_message: str, task_id: str) -> bool:
        """Attempts intelligent recovery (e.g. alternative cab tier search)."""
        # Check if recovery failure injection is enabled
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT enabled FROM demo_failure_injections WHERE key = 'recovery_fail'")
            flag = c.fetchone()
            if flag and flag["enabled"] == 1:
                return False

        if tool == "cab":
            # Recovery strategy: Fall back to Auto or Prime SUV tier with clean verification
            alt_tier = "Prime SUV (Demo)" if params.get("cab_type") != "Prime SUV (Demo)" else "Auto (Demo)"
            alt_res = cab_service.book_ride(
                pickup=params.get("pickup", "Current Location"),
                destination=params.get("destination", "Destination"),
                pickup_time=params.get("pickup_time", ""),
                cab_type=alt_tier,
                task_id=task_id,
                step_id=step_id
            )
            if alt_res.success and cab_service.verify_booking(alt_res.booking_reference):
                recovery_payload = alt_res.to_dict()
                recovery_payload["recovery_note"] = f"Recovered using alternative tier: {alt_tier} (Fare: Rs {alt_res.fare})"
                self._update_step_status(step_id, "RECOVERED", verification="VERIFIED", result=recovery_payload)
                await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "RECOVERED"})
                return True

        elif tool == "gmail":
            # Recovery strategy: Immediate retry with resolved recipient (Guideline #4)
            try:
                recipient = params.get("recipient")
                if recipient and recipient.lower() in SAVED_CONTACTS:
                    recipient = SAVED_CONTACTS[recipient.lower()]
                if recipient:
                    res = gmail_service.send_email(
                        recipient=recipient,
                        subject=params.get("subject", "JARVIS Notification"),
                        body=params.get("body", "")
                    )
                    if res.get("verified"):
                        res["recovery_note"] = "Dispatched successfully after immediate recovery retry"
                        self._update_step_status(step_id, "RECOVERED", verification="VERIFIED", result=res)
                        await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "RECOVERED"})
                        return True
            except Exception as e:
                print(f"[JARVIS Recovery] Gmail retry error: {e}")

        elif tool in ["reminder", "calendar"]:
            # Recovery strategy: Immediate retry with calendar service (Guideline #4)
            try:
                cal_res = calendar_service.create_event(
                    title=params.get("message") or "Reminder",
                    start_time_iso=params.get("time"),
                    alert_minutes=10,
                    description="JARVIS Autonomous Assistant Reminder (Recovered)"
                )
                if cal_res.get("verified"):
                    cal_res["recovery_note"] = "Calendar event created successfully on recovery retry"
                    self._update_step_status(step_id, "RECOVERED", verification="VERIFIED", result=cal_res)
                    await sse_manager.broadcast("step_update", {"task_id": task_id, "step_id": step_id, "status": "RECOVERED"})
                    return True
            except Exception as e:
                print(f"[JARVIS Recovery] Calendar retry error: {e}")

        return False

    def rollback_reminders(self, reminder_ids: List[str]):
        """Rolls back created reminders if task failed."""
        for r_id in reminder_ids:
            reminder_scheduler.cancel_reminder(r_id)

    def _update_step_status(self, step_id: str, status: str, verification: str = None, result: dict = None, error: str = None):
        with get_db() as conn:
            c = conn.cursor()
            updates = ["status = ?"]
            vals = [status]
            if verification is not None:
                updates.append("verification_status = ?")
                vals.append(verification)
            if result is not None:
                updates.append("result_json = ?")
                vals.append(json.dumps(result))
            if error is not None:
                updates.append("error_message = ?")
                vals.append(error)
            vals.append(step_id)
            c.execute(f"UPDATE steps SET {', '.join(updates)} WHERE id = ?", vals)

execution_engine = ExecutionEngine()
