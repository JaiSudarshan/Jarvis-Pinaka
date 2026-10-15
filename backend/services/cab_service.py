import uuid
from datetime import datetime, timezone
import random
from typing import Optional, Dict, Any, List
from backend.database import get_db

class CabBookingResult:
    def __init__(self, success: bool, booking_reference: Optional[str], fare: float, status: str, provider: str, error: Optional[str] = None, http_code: int = 200):
        self.success = success
        self.booking_reference = booking_reference
        self.fare = fare
        self.status = status
        self.provider = provider
        self.error = error
        self.http_code = http_code

    def to_dict(self):
        return {
            "success": self.success,
            "booking_reference": self.booking_reference,
            "fare": self.fare,
            "status": self.status,
            "provider": self.provider,
            "error": self.error,
            "http_code": self.http_code
        }

class DemoCabProvider:
    """
    Clearly labeled DEMO CAB PROVIDER.
    Simulates real ride-hailing interactions with persistent records, fare estimations,
    and test hooks for failure injection (e.g. silent HTTP 200 drop, cab unavailable).
    """
    PROVIDER_NAME = "DEMO CAB PROVIDER (Simulated)"

    def estimate_fare(self, pickup: str, destination: str) -> List[Dict[str, Any]]:
        # Deterministic simulation based on distance
        options = [
            {"cab_type": "Sedan (Demo)", "estimated_fare": 420.0, "eta_minutes": 6, "currency": "INR"},
            {"cab_type": "Prime SUV (Demo)", "estimated_fare": 650.0, "eta_minutes": 10, "currency": "INR"},
            {"cab_type": "Auto (Demo)", "estimated_fare": 180.0, "eta_minutes": 4, "currency": "INR"}
        ]
        return options

    def book_ride(self, pickup: str, destination: str, pickup_time: str, cab_type: str = "Sedan (Demo)", task_id: str = None, step_id: str = None) -> CabBookingResult:
        # Check failure injections
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT enabled FROM demo_failure_injections WHERE key = 'cab_unavailable'")
            unavailable_flag = c.fetchone()
            if unavailable_flag and unavailable_flag["enabled"] == 1 and "Sedan" in cab_type:
                return CabBookingResult(
                    success=False,
                    booking_reference=None,
                    fare=0.0,
                    status="FAILED",
                    provider=self.PROVIDER_NAME,
                    error="Cab unavailable: No drivers currently nearby matching Sedan tier.",
                    http_code=503
                )

            c.execute("SELECT enabled FROM demo_failure_injections WHERE key = 'cab_silent_fail'")
            silent_flag = c.fetchone()
            if silent_flag and silent_flag["enabled"] == 1 and "Sedan" in cab_type:
                # SILENT FAILURE: Provider returns HTTP 200 with a reference ID, BUT does not persist the booking!
                fake_ref = f"DEMO-SILENT-{uuid.uuid4().hex[:6].upper()}"
                return CabBookingResult(
                    success=True,
                    booking_reference=fake_ref,
                    fare=420.0,
                    status="CONFIRMED_BY_ENDPOINT",
                    provider=self.PROVIDER_NAME,
                    error=None,
                    http_code=200
                )

        # Real simulated booking (persisted)
        booking_id = str(uuid.uuid4())
        ref = f"DEMO-RIDE-{uuid.uuid4().hex[:8].upper()}"
        fare = 420.0 if "Sedan" in cab_type else (650.0 if "SUV" in cab_type else 180.0)
        now_iso = datetime.now(timezone.utc).isoformat()

        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            INSERT INTO cab_bookings (id, task_id, step_id, provider, booking_reference, pickup, destination, pickup_time, fare_estimate, currency, cab_type, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, 'CONFIRMED', ?)
            """, (booking_id, task_id, step_id, self.PROVIDER_NAME, ref, pickup, destination, pickup_time, fare, cab_type, now_iso))

        return CabBookingResult(
            success=True,
            booking_reference=ref,
            fare=fare,
            status="CONFIRMED",
            provider=self.PROVIDER_NAME
        )

    def verify_booking(self, booking_reference: str) -> bool:
        """Read-after-write verification against the database booking registry."""
        if not booking_reference:
            return False
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            SELECT status FROM cab_bookings WHERE booking_reference = ? AND status = 'CONFIRMED'
            """, (booking_reference,))
            return cursor.fetchone() is not None

    def cancel_booking(self, booking_reference: str) -> bool:
        """Cancel an existing demo booking."""
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute("""
            UPDATE cab_bookings
            SET status = 'CANCELLED'
            WHERE booking_reference = ? AND status = 'CONFIRMED'
            """, (booking_reference,))
            return cursor.rowcount > 0

cab_service = DemoCabProvider()
