import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
import pytz

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from google.auth.transport.requests import Request

from backend.config import GOOGLE_SCOPES, DEFAULT_TIMEZONE
from backend.services.gmail_service import gmail_service

logger = logging.getLogger("jarvis.calendar")

class CalendarService:
    def __init__(self):
        self.scopes = GOOGLE_SCOPES

    def is_authenticated(self) -> bool:
        """Checks if a valid Google account is authenticated."""
        return gmail_service.is_authenticated()

    def _get_calendar_client(self):
        """Builds authenticated Google Calendar client, refreshing tokens if needed."""
        creds = gmail_service._get_credentials()
        if not creds:
            raise PermissionError("Google account not authenticated. Please run the Google OAuth sign-in.")
        return build('calendar', 'v3', credentials=creds)

    def create_event(
        self,
        title: str,
        start_time_iso: str,
        end_time_iso: Optional[str] = None,
        alert_minutes: int = 10,
        description: str = "",
        tz_name: str = DEFAULT_TIMEZONE,
        max_retries: int = 2
    ) -> Dict[str, Any]:
        """
        Creates an event in Google Calendar with an active alert notification set.
        Follows Core Operating Guideline #2 (Calendar Reminder Standard) and #4 (Failure Recovery).
        Performs read-after-write verification on the created event.
        """
        tz = pytz.timezone(tz_name or DEFAULT_TIMEZONE)

        # Parse start time
        try:
            start_dt = datetime.fromisoformat(start_time_iso)
        except Exception:
            raise ValueError(f"Invalid start_time_iso format: {start_time_iso}")

        if start_dt.tzinfo is None:
            start_dt = tz.localize(start_dt)

        # Calculate end time if not specified (default 30 mins)
        if end_time_iso:
            try:
                end_dt = datetime.fromisoformat(end_time_iso)
                if end_dt.tzinfo is None:
                    end_dt = tz.localize(end_dt)
            except Exception:
                end_dt = start_dt + timedelta(minutes=30)
        else:
            end_dt = start_dt + timedelta(minutes=30)

        # Event payload with explicit active alert notification triggers
        event_body = {
            "summary": title,
            "description": description or f"JARVIS Autonomous Assistant Reminder: {title}",
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": tz_name,
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": tz_name,
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": alert_minutes},
                    {"method": "email", "minutes": alert_minutes},
                    {"method": "popup", "minutes": 0} # Immediate on-time alert
                ]
            }
        }

        last_error = None
        for attempt in range(max_retries + 1):
            try:
                service = self._get_calendar_client()
                created = service.events().insert(
                    calendarId='primary',
                    body=event_body
                ).execute()

                event_id = created.get("id")
                if not event_id:
                    raise RuntimeError("Google Calendar API returned response without event ID.")

                # Read-after-write verification
                verified_event = service.events().get(
                    calendarId='primary',
                    eventId=event_id
                ).execute()

                if verified_event and verified_event.get("id") == event_id:
                    return {
                        "event_id": event_id,
                        "title": title,
                        "html_link": verified_event.get("htmlLink"),
                        "start": verified_event.get("start"),
                        "end": verified_event.get("end"),
                        "alert_notification": f"{alert_minutes}m popup & email + on-time alert",
                        "verified": True,
                        "retries": attempt
                    }
                else:
                    raise RuntimeError("Read-after-write verification failed: Created calendar event could not be verified.")

            except HttpError as http_err:
                last_error = http_err
                err_detail = str(http_err)
                logger.warning(f"[CalendarService Attempt {attempt+1}] HttpError: {err_detail}")
                
                # Check for insufficient scopes
                if http_err.resp.status == 403 and "insufficient" in err_detail.lower():
                    raise PermissionError(
                        "Google Calendar API returned 403 Insufficient Scope. "
                        "Please re-run Google OAuth sign-in to grant the Google Calendar scopes."
                    ) from http_err

                # Refresh credentials and retry for auth/transient errors
                if attempt < max_retries:
                    try:
                        creds = gmail_service._get_credentials()
                        if creds and creds.refresh_token:
                            creds.refresh(Request())
                    except Exception as refresh_err:
                        logger.error(f"Token refresh during retry failed: {refresh_err}")
                    continue

            except Exception as e:
                last_error = e
                logger.warning(f"[CalendarService Attempt {attempt+1}] Error: {e}")
                if attempt < max_retries:
                    continue

        raise RuntimeError(f"Google Calendar event creation definitively failed after {max_retries + 1} attempts: {last_error}")

    def verify_event(self, event_id: str) -> bool:
        """Verifies if an event exists in the primary Google Calendar."""
        try:
            service = self._get_calendar_client()
            ev = service.events().get(calendarId='primary', eventId=event_id).execute()
            return bool(ev and ev.get("id") == event_id)
        except Exception:
            return False

    def list_events(self, max_results: int = 10, time_min_iso: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists upcoming events from primary Google Calendar."""
        service = self._get_calendar_client()
        time_min = time_min_iso or datetime.now(timezone.utc).isoformat()
        events_result = service.events().list(
            calendarId='primary',
            timeMin=time_min,
            maxResults=max_results,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        items = events_result.get('items', [])
        result = []
        for item in items:
            start = item.get('start', {}).get('dateTime', item.get('start', {}).get('date'))
            result.append({
                "id": item.get('id'),
                "title": item.get('summary', 'Untitled'),
                "start": start,
                "html_link": item.get('htmlLink'),
                "description": item.get('description', '')
            })
        return result

calendar_service = CalendarService()
