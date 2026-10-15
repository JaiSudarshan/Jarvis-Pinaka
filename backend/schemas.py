from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class PlanRequest(BaseModel):
    instruction: str = Field(..., description="The user's natural language command")
    timezone: Optional[str] = Field("Asia/Kolkata", description="Configured user timezone")
    clarification_answers: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Answers to previously asked clarification questions")

class PlanStepSchema(BaseModel):
    id: Optional[str] = None
    tool: str = Field(..., description="Tool name: 'reminder', 'gmail', or 'cab'")
    action: str = Field(..., description="Action name: 'create', 'send_email', 'book'")
    time: Optional[str] = None
    message: Optional[str] = None
    recipient: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    pickup: Optional[str] = None
    destination: Optional[str] = None
    pickup_time: Optional[str] = None
    fare_estimate: Optional[float] = None
    cab_type: Optional[str] = "Sedan (Demo)"
    requires_approval: bool = False
    approved: bool = False
    status: str = "PLANNED"
    missing_fields: List[str] = Field(default_factory=list)

class PlanResponse(BaseModel):
    task_id: str
    intent: str
    instruction: str
    steps: List[PlanStepSchema]
    missing_info: List[str] = Field(default_factory=list)
    clarification_questions: List[str] = Field(default_factory=list)
    ready_for_approval: bool = False
    summary: str

class ExecuteRequest(BaseModel):
    task_id: str
    approved_step_ids: Optional[List[str]] = None

class ReminderCreate(BaseModel):
    message: str
    remind_at: str

class FailureToggle(BaseModel):
    key: str
    enabled: bool
