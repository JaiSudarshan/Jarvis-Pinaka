from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.services.scheduler_service import reminder_scheduler
from backend.routes import (
    health,
    planner_routes,
    execution_routes,
    reminders_routes,
    integrations_routes,
    demo_routes
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Reload existing scheduled reminders from SQLite into APScheduler
    print("[JARVIS Backend] Initializing scheduler and restoring active reminders from DB...")
    reminder_scheduler.reload_from_db()
    yield
    print("[JARVIS Backend] Shutting down...")

app = FastAPI(
    title="JARVIS ONE — Autonomous Multi-Action AI Assistant",
    description="Backend API supporting multi-task planning, verification, recovery, and reminders",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to configured domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health.router)
app.include_router(planner_routes.router)
app.include_router(execution_routes.router)
app.include_router(reminders_routes.router)
app.include_router(integrations_routes.router)
app.include_router(demo_routes.router)

# Mount frontend build if available
from pathlib import Path
from fastapi.staticfiles import StaticFiles

frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
