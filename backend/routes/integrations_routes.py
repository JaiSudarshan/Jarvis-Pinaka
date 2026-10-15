import asyncio
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse
from backend.services.gmail_service import gmail_service, GMAIL_SCOPES
from backend.services.calendar_service import calendar_service
from backend.services.planner import planner_service
from backend.services.cab_service import cab_service
from backend.config import FRONTEND_URL, GEMINI_API_KEY, GOOGLE_CLIENT_ID, SAVED_CONTACTS
from backend.database import get_db

router = APIRouter(tags=["Integrations"])

@router.get("/api/integrations")
def get_integrations():
    return {
        "gemini": {
            "name": "Google Gemini 3.8 Flash",
            "is_configured": planner_service.is_configured(),
            "model": "gemini-3.8-flash",
            "notes": "Configured via GEMINI_API_KEY in .env" if planner_service.is_configured() else "Local deterministic semantic parser active."
        },
        "gmail": {
            "name": "Gmail API (Desktop OAuth 2.0)",
            "is_configured": gmail_service.is_configured(),
            "is_authenticated": gmail_service.is_authenticated(),
            "connected_account": gmail_service.get_connected_account(),
            "scopes": GMAIL_SCOPES,
            "notes": "Desktop OAuth flow active (read, search, send with verified receipt)."
        },
        "calendar": {
            "name": "Google Calendar API",
            "is_configured": gmail_service.is_configured(),
            "is_authenticated": gmail_service.is_authenticated(),
            "connected_account": gmail_service.get_connected_account(),
            "notes": "Core Guideline #2: Calendar Reminder Standard with active popup & email alerts."
        },
        "saved_contacts": {
            "name": "Executive Saved Contacts Directory",
            "contacts": SAVED_CONTACTS,
            "notes": "Core Guideline #3: Zero-prompt automatic email resolution."
        },
        "cab": {
            "name": cab_service.PROVIDER_NAME,
            "provider_type": "DEMO",
            "status": "ONLINE",
            "notes": "Simulated ride provider with persistent SQLite records, read-after-write verification, and failure testing."
        }
    }

@router.post("/api/auth/google/local-flow")
async def trigger_local_oauth_flow():
    """
    Triggers local desktop OAuth flow: launches browser window for Google authentication,
    captures authorization token, and saves credentials to database.
    """
    try:
        email = await asyncio.to_thread(gmail_service.run_local_oauth_flow)
        return {"status": "AUTHENTICATED", "email": email}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth flow failed: {str(e)}")

@router.post("/api/auth/google/disconnect")
def disconnect_google():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("DELETE FROM oauth_tokens WHERE provider = 'google'")
    return {"status": "DISCONNECTED"}

# -------------------------------------------------------------------------
# Required Gmail API Operations
# -------------------------------------------------------------------------

@router.get("/api/gmail/messages")
def get_latest_emails(
    max_results: int = Query(default=10, ge=1, le=50),
    q: Optional[str] = Query(default=None)
):
    """
    Operation 1: users.messages.list (with maxResults)
    Retrieves latest messages, optionally filtered by search query.
    """
    if not gmail_service.is_authenticated():
        raise HTTPException(status_code=401, detail="Gmail not authenticated. Please run the OAuth flow first.")
    try:
        messages = gmail_service.list_messages(max_results=max_results, query=q)
        return {
            "count": len(messages),
            "account": gmail_service.get_connected_account(),
            "messages": messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/gmail/messages/{message_id}")
def get_email_detail(message_id: str):
    """
    Operation 2: users.messages.get (passing message ID)
    Retrieves full details including headers and decoded message body.
    """
    if not gmail_service.is_authenticated():
        raise HTTPException(status_code=401, detail="Gmail not authenticated. Please run the OAuth flow first.")
    try:
        detail = gmail_service.get_message_detail(message_id=message_id, include_body=True)
        return detail
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/api/gmail/search")
def search_emails(
    q: str = Query(..., description="Gmail search query, e.g. from:user, is:unread, subject:..."),
    max_results: int = Query(default=10, ge=1, le=50)
):
    """
    Operation 3: users.messages.list with query parameter (q="...")
    Searches user's mailbox.
    """
    if not gmail_service.is_authenticated():
        raise HTTPException(status_code=401, detail="Gmail not authenticated. Please run the OAuth flow first.")
    try:
        messages = gmail_service.search_emails(query=q, max_results=max_results)
        return {
            "query": q,
            "count": len(messages),
            "account": gmail_service.get_connected_account(),
            "messages": messages
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
