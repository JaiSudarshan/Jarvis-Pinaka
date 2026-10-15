from fastapi import APIRouter, HTTPException
from backend.schemas import PlanRequest, PlanResponse
from backend.services.planner import planner_service
from backend.services.execution_engine import execution_engine

router = APIRouter(tags=["Planner"])

@router.post("/api/plan", response_model=PlanResponse)
async def create_plan(request: PlanRequest):
    if not request.instruction or not request.instruction.strip():
        raise HTTPException(status_code=400, detail="Instruction cannot be empty")

    plan = planner_service.plan(
        instruction=request.instruction,
        tz_name=request.timezone or "Asia/Kolkata",
        clarification_answers=request.clarification_answers or {}
    )

    # Persist in SQLite
    await execution_engine.persist_plan(plan.model_dump())

    return plan
