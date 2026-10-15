import json
import asyncio
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from backend.schemas import ExecuteRequest
from backend.services.execution_engine import execution_engine
from backend.services.sse_manager import sse_manager
from backend.database import get_db

router = APIRouter(tags=["Execution"])

@router.post("/api/execute")
async def execute_task(request: ExecuteRequest, background_tasks: BackgroundTasks):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT id FROM tasks WHERE id = ?", (request.task_id,))
        if not c.fetchone():
            raise HTTPException(status_code=404, detail="Task not found")

    # Run execution in background task so UI gets immediate ACK and receives live SSE events
    background_tasks.add_task(execution_engine.execute_task, request.task_id, request.approved_step_ids)

    return {
        "status": "RUNNING",
        "task_id": request.task_id,
        "message": "Execution started"
    }

@router.get("/api/tasks/{task_id}")
def get_task(task_id: str):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
        task_row = c.fetchone()
        if not task_row:
            raise HTTPException(status_code=404, detail="Task not found")

        c.execute("SELECT * FROM steps WHERE task_id = ? ORDER BY step_order ASC", (task_id,))
        steps = []
        for r in c.fetchall():
            step_dict = dict(r)
            step_dict["params"] = json.loads(step_dict["params_json"])
            step_dict["result"] = json.loads(step_dict["result_json"]) if step_dict["result_json"] else {}
            steps.append(step_dict)

        task_data = dict(task_row)
        task_data["clarifications"] = json.loads(task_data["clarifications"]) if task_data["clarifications"] else []
        task_data["steps"] = steps
        return task_data

@router.get("/api/tasks")
def list_tasks(limit: int = 10):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM tasks ORDER BY created_at DESC LIMIT ?", (limit,))
        tasks = []
        for row in c.fetchall():
            t = dict(row)
            c.execute("SELECT COUNT(*) as cnt FROM steps WHERE task_id = ?", (t["id"],))
            t["step_count"] = c.fetchone()["cnt"]
            tasks.append(t)
        return tasks

@router.get("/api/events")
async def sse_events():
    """SSE endpoint for live progress streaming and cross-device synchronization."""
    async def event_generator():
        queue = await sse_manager.subscribe()
        try:
            # Send initial keepalive
            yield "event: connected\ndata: {\"status\": \"connected\"}\n\n"
            while True:
                msg = await queue.get()
                yield msg
        except asyncio.CancelledError:
            sse_manager.unsubscribe(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
