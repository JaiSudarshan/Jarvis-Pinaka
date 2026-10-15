import os
from pathlib import Path
from dotenv import load_dotenv

# Load from .env if present
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

import json

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "jarvis.db"
CREDENTIALS_FILE = Path(__file__).resolve().parent.parent / "credentials.json"

GEMINI_API_KEY = (
    os.getenv("GEMINI_API_KEY", "") or 
    os.getenv("Jarvis", "") or 
    os.getenv("JARVIS", "") or 
    os.getenv("jarvus", "")
)
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

if CREDENTIALS_FILE.exists():
    try:
        with open(CREDENTIALS_FILE, "r", encoding="utf-8") as f:
            cred_data = json.load(f)
            inst = cred_data.get("installed") or cred_data.get("web") or {}
            if not GOOGLE_CLIENT_ID:
                GOOGLE_CLIENT_ID = inst.get("client_id", "")
            if not GOOGLE_CLIENT_SECRET:
                GOOGLE_CLIENT_SECRET = inst.get("client_secret", "")
    except Exception as e:
        print(f"Error loading credentials.json: {e}")

DEFAULT_TIMEZONE = os.getenv("TIMEZONE", "Asia/Kolkata")
PORT = int(os.getenv("PORT", 8000))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:8000")

# Saved Contacts Directory (Guideline #3)
SAVED_CONTACTS = {
    "arpit": "arpitagrawal666@gmail.com",
    "aditya": "adityaupadhyay7764@gmail.com"
}

# Google Cloud OAuth Scopes (Gmail + Google Calendar)
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
]
