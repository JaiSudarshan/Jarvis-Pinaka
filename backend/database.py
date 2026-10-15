import sqlite3
import json
from datetime import datetime, timezone
from contextlib import contextmanager
from backend.config import DB_PATH

def get_db_connection():
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

@contextmanager
def get_db():
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Tasks table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            instruction TEXT NOT NULL,
            intent TEXT NOT NULL DEFAULT 'multi_action',
            status TEXT NOT NULL DEFAULT 'PLANNED',
            clarifications TEXT DEFAULT '[]',
            summary TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """)

        # Steps table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS steps (
            id TEXT PRIMARY KEY,
            task_id TEXT NOT NULL,
            step_order INTEGER NOT NULL,
            tool TEXT NOT NULL,
            action TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'PLANNED',
            params_json TEXT NOT NULL DEFAULT '{}',
            result_json TEXT DEFAULT '{}',
            verification_status TEXT DEFAULT 'PENDING',
            error_message TEXT DEFAULT '',
            idempotency_key TEXT NOT NULL,
            requires_approval INTEGER DEFAULT 0,
            approved INTEGER DEFAULT 0,
            FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE
        )
        """)

        # Reminders table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reminders (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            step_id TEXT,
            message TEXT NOT NULL,
            remind_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'SCHEDULED',
            delivery_channel TEXT DEFAULT 'in_app',
            google_event_id TEXT,
            google_calendar_link TEXT,
            created_at TEXT NOT NULL,
            delivered_at TEXT
        )
        """)

        # Safely ensure google_event_id and google_calendar_link exist in existing DB
        try:
            cursor.execute("ALTER TABLE reminders ADD COLUMN google_event_id TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE reminders ADD COLUMN google_calendar_link TEXT")
        except Exception:
            pass

        # Cab Bookings table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS cab_bookings (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            step_id TEXT,
            provider TEXT NOT NULL DEFAULT 'DEMO CAB PROVIDER',
            booking_reference TEXT NOT NULL,
            pickup TEXT NOT NULL,
            destination TEXT NOT NULL,
            pickup_time TEXT NOT NULL,
            fare_estimate REAL NOT NULL,
            currency TEXT NOT NULL DEFAULT 'INR',
            cab_type TEXT NOT NULL DEFAULT 'Sedan (Demo)',
            status TEXT NOT NULL DEFAULT 'CONFIRMED',
            created_at TEXT NOT NULL
        )
        """)

        # OAuth tokens
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS oauth_tokens (
            provider TEXT PRIMARY KEY,
            access_token TEXT,
            refresh_token TEXT,
            token_uri TEXT,
            client_id TEXT,
            client_secret TEXT,
            scopes TEXT,
            expiry TEXT,
            email TEXT,
            updated_at TEXT NOT NULL
        )
        """)

        # Demo failure injection flags
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS demo_failure_injections (
            key TEXT PRIMARY KEY,
            enabled INTEGER NOT NULL DEFAULT 0,
            description TEXT NOT NULL
        )
        """)

        # Seed initial failure injection options if not existing
        initial_flags = [
            ("reminder_schedule_fail", 0, "Inject failure when scheduling reminder"),
            ("email_timeout", 0, "Simulate email provider network timeout"),
            ("cab_silent_fail", 0, "Cab API returns HTTP 200 OK without saving booking record (Silent Failure)"),
            ("cab_unavailable", 0, "Cab booking unavailable (triggers recovery/alternatives)"),
            ("recovery_fail", 0, "Simulate recovery action failure"),
        ]
        for key, enabled, desc in initial_flags:
            cursor.execute("""
            INSERT OR IGNORE INTO demo_failure_injections (key, enabled, description)
            VALUES (?, ?, ?)
            """, (key, enabled, desc))

init_db()
