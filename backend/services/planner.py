import json
import uuid
import re
from datetime import datetime, timedelta
import pytz
from typing import Dict, Any, List, Optional
from backend.config import GEMINI_API_KEY, DEFAULT_TIMEZONE, SAVED_CONTACTS
from backend.schemas import PlanResponse, PlanStepSchema

def resolve_known_contacts(instruction: str, answers: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Core Operating Guideline #3:
    Automatically resolves contacts from Saved Contacts Directory without prompting the user.
    - name: arpit -> email: arpitagrawal666@gmail.com
    - name: aditya -> email: adityaupadhyay7764@gmail.com
    """
    resolved = dict(answers or {})
    lower = instruction.lower()
    for name, email in SAVED_CONTACTS.items():
        # Match whole word
        if re.search(r'\b' + re.escape(name) + r'\b', lower):
            if "recipient" not in resolved or not resolved["recipient"]:
                resolved["recipient"] = email
            if "email" not in resolved or not resolved["email"]:
                resolved["email"] = email
            resolved[name] = email
    return resolved

class PlannerService:
    @property
    def api_key(self) -> str:
        from backend.config import GEMINI_API_KEY
        return GEMINI_API_KEY

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def plan(self, instruction: str, tz_name: str = "Asia/Kolkata", clarification_answers: Dict[str, Any] = None) -> PlanResponse:
        """
        Converts natural language instruction into structured multi-action plan.
        Operates with full autonomy & zero approval for scheduling and communication actions.
        Automatically resolves saved contacts directory.
        """
        # Automatically resolve contacts before planning
        clarification_answers = resolve_known_contacts(instruction, clarification_answers)

        if self.api_key:
            try:
                return self._plan_with_gemini(instruction, tz_name, clarification_answers)
            except Exception as e:
                print(f"Gemini API call failed: {e}. Falling back to structured parser.")
                return self._rule_based_plan(instruction, tz_name, clarification_answers, note=f"Fallback used (Gemini error: {str(e)})")
        else:
            return self._rule_based_plan(
                instruction, 
                tz_name, 
                clarification_answers, 
                note="Gemini API Key not set. Using local semantic parser. Set GEMINI_API_KEY to activate Gemini 3.8 Flash."
            )

    def _plan_with_gemini(self, instruction: str, tz_name: str, clarification_answers: Dict[str, Any]) -> PlanResponse:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.api_key, http_options={"timeout": 12000})
        local_tz = pytz.timezone(tz_name or DEFAULT_TIMEZONE)
        now_local = datetime.now(local_tz)

        prompt = f"""
You are JARVIS, an autonomous executive assistant agent.
Your job is to execute scheduling and communication actions instantly with zero confirmation delays.
Current Reference Time: {now_local.isoformat()} ({tz_name})

Analyze the following instruction and create a structured multi-action plan:
Instruction: "{instruction}"

Previous Clarification Answers / Known Context:
{json.dumps(clarification_answers, indent=2)}

### CORE OPERATING GUIDELINES:

1. FULL AUTONOMY & ZERO APPROVAL:
   - Execute email sending and calendar scheduling actions immediately upon request.
   - Never ask for confirmation, preview validation, or follow-up approval before dispatching an email or creating a calendar entry.
   - For tools "reminder", "calendar", and "gmail", ALWAYS set requires_approval: false.

2. CALENDAR REMINDER STANDARD:
   - Every reminder must be created directly as an event in Google Calendar with an active alert notification set.
   - Do not just send an email reminder when a user asks for a reminder; always write the entry into Google Calendar with the specified title, start time, and alert trigger.
   - Tool "reminder" (action "create", fields: time in ISO format with offset, message).

3. SAVED CONTACTS DIRECTORY:
   When the user refers to the following names, automatically resolve their email addresses without prompting the user or asking clarification questions:
   - name: arpit -> email: arpitagrawal666@gmail.com
   - name: aditya -> email: adityaupadhyay7764@gmail.com
   Never ask for clarification questions for Arpit or Aditya. Automatically populate their email in the recipient field.

4. MISSING DETAILS:
   - If an unmapped recipient (e.g. "Rahul" or "teacher") is mentioned and has no email in Saved Contacts or Clarification Answers, set recipient to null and ask in clarification_questions.
   - If cab booking is requested without pickup or destination, set them to null and add clarification questions.
   - Calculate dates and times relative to Current Reference Time ({now_local.isoformat()}).
     "Tomorrow at 9 AM" is tomorrow relative to current date, with timezone offset.
   - If cab booking fare_estimate is needed, estimate 420.0 INR for standard Sedan.

Return a JSON object with this exact structure:
{{
  "intent": "multi_action" | "single_action",
  "summary": "Brief summary of the autonomous plan",
  "steps": [
    {{
      "tool": "reminder" | "gmail" | "cab",
      "action": "create" | "send_email" | "book",
      "time": "ISO datetime or null",
      "message": "Reminder / Calendar event title or null",
      "recipient": "email or null",
      "subject": "subject or null",
      "body": "email body or null",
      "pickup": "location or null",
      "destination": "location or null",
      "pickup_time": "ISO datetime or null",
      "fare_estimate": 420.0,
      "cab_type": "Sedan (Demo)",
      "requires_approval": false,
      "missing_fields": ["list of missing field names if any"]
    }}
  ],
  "missing_info": ["list of missing required details"],
  "clarification_questions": ["questions to ask the user to fill missing info"],
  "ready_for_approval": true | false
}}
"""
        response = None
        last_error = None
        for m in ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3-flash-preview"]:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json"
                    )
                )
                if response and response.text:
                    break
            except Exception as e:
                last_error = e
                print(f"[JARVIS Planner] Model {m} error: {e}. Trying fallback...")

        if not response or not response.text:
            raise last_error or RuntimeError("Gemini content generation failed across all candidate models.")

        data = json.loads(response.text)
        task_id = str(uuid.uuid4())

        steps = []
        for s in data.get("steps", []):
            tool = s.get("tool")
            recipient = s.get("recipient")

            # Double-check saved contacts directory
            if tool == "gmail" and not recipient:
                for name, email in SAVED_CONTACTS.items():
                    if name in instruction.lower():
                        recipient = email
                        break

            # Core Operating Guideline #1: Zero approval for email and calendar scheduling
            requires_approval = False if tool in ["reminder", "calendar", "gmail"] else bool(s.get("requires_approval", tool == "cab"))

            step = PlanStepSchema(
                id=str(uuid.uuid4()),
                tool=tool,
                action=s.get("action"),
                time=s.get("time"),
                message=s.get("message"),
                recipient=recipient,
                subject=s.get("subject"),
                body=s.get("body"),
                pickup=s.get("pickup"),
                destination=s.get("destination"),
                pickup_time=s.get("pickup_time"),
                fare_estimate=s.get("fare_estimate", 420.0 if tool == "cab" else None),
                cab_type=s.get("cab_type", "Sedan (Demo)"),
                requires_approval=requires_approval,
                status="PLANNED",
                missing_fields=s.get("missing_fields", [])
            )
            steps.append(step)

        # Remove clarification questions if saved contacts resolved them
        raw_missing = data.get("missing_info", [])
        raw_questions = data.get("clarification_questions", [])
        
        filtered_missing = []
        filtered_questions = []
        for m in raw_missing:
            m_lower = m.lower()
            if any(name in m_lower for name in SAVED_CONTACTS):
                continue
            filtered_missing.append(m)

        for q in raw_questions:
            q_lower = q.lower()
            if any(name in q_lower for name in SAVED_CONTACTS):
                continue
            filtered_questions.append(q)

        ready = len(filtered_missing) == 0

        return PlanResponse(
            task_id=task_id,
            intent=data.get("intent", "multi_action"),
            instruction=instruction,
            steps=steps,
            missing_info=filtered_missing,
            clarification_questions=filtered_questions,
            ready_for_approval=ready,
            summary=data.get("summary", "Autonomous execution plan generated")
        )

    def _rule_based_plan(self, instruction: str, tz_name: str, clarification_answers: Dict[str, Any], note: str = "") -> PlanResponse:
        """Deterministic semantic parser matching required features and example instructions."""
        local_tz = pytz.timezone(tz_name or DEFAULT_TIMEZONE)
        now = datetime.now(local_tz)
        tomorrow = now + timedelta(days=1)
        
        task_id = str(uuid.uuid4())
        lower = instruction.lower()

        steps: List[PlanStepSchema] = []
        missing_info: List[str] = []
        questions: List[str] = []

        # 1. Reminder detection (Google Calendar Reminder Standard)
        if "remind" in lower or "calendar" in lower or "schedule" in lower:
            # Parse time
            remind_time = None
            if "tomorrow at 9 am" in lower or "9 am" in lower:
                target_date = tomorrow if "tomorrow" in lower else now
                remind_time = target_date.replace(hour=9, minute=0, second=0, microsecond=0).isoformat()
            elif "6 pm" in lower:
                target_date = tomorrow if "tomorrow" in lower else now
                remind_time = target_date.replace(hour=18, minute=0, second=0, microsecond=0).isoformat()
            elif "5 pm" in lower:
                target_date = tomorrow if "tomorrow" in lower else now
                remind_time = target_date.replace(hour=17, minute=0, second=0, microsecond=0).isoformat()
            else:
                remind_time = (now + timedelta(hours=1)).isoformat()

            msg = "Reminder"
            if "meeting" in lower:
                msg = "Project meeting"
            elif "assignment" in lower:
                msg = "Submit assignment"
            elif "deploy" in lower:
                msg = "Deploy project"
            else:
                msg = instruction

            # Guideline #1 & #2: Zero approval & direct Google Calendar entry
            steps.append(PlanStepSchema(
                id=str(uuid.uuid4()),
                tool="reminder",
                action="create",
                time=remind_time,
                message=msg,
                requires_approval=False,
                status="PLANNED"
            ))

        # 2. Gmail / Email detection
        if "email" in lower or "mail" in lower:
            is_read_intent = any(w in lower for w in ["check", "read", "list", "latest", "recent", "search", "inbox", "fetch"]) and not any(w in lower for w in ["send", "write", "draft", "to rahul", "to arpit", "to aditya"])
            
            if is_read_intent:
                query = None
                if "from" in lower:
                    m = re.search(r'from\s+([^\s,]+)', instruction, re.IGNORECASE)
                    if m:
                        query = f"from:{m.group(1)}"

                steps.append(PlanStepSchema(
                    id=str(uuid.uuid4()),
                    tool="gmail",
                    action="list_emails",
                    message="Fetch latest inbox emails" + (f" matching {query}" if query else ""),
                    requires_approval=False,
                    status="PLANNED",
                    missing_fields=[]
                ))
            else:
                # Resolve recipient from clarification answers or Saved Contacts Directory
                recipient = clarification_answers.get("recipient") or clarification_answers.get("email")
                missing_for_email = []
                
                if not recipient:
                    # Check saved contacts directory
                    for name, email in SAVED_CONTACTS.items():
                        if re.search(r'\b' + re.escape(name) + r'\b', lower):
                            recipient = email
                            break

                if not recipient:
                    # Check for explicit email in text
                    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', instruction)
                    if email_match:
                        recipient = email_match.group(0)
                    else:
                        if "rahul" in lower:
                            missing_info.append("Rahul's email address")
                            questions.append("What is Rahul's email address?")
                            missing_for_email.append("recipient")
                        elif "teacher" in lower:
                            missing_info.append("Teacher's email address")
                            questions.append("What is your teacher's email address?")
                            missing_for_email.append("recipient")
                        else:
                            missing_info.append("Recipient email address")
                            questions.append("Who should this email be sent to?")
                            missing_for_email.append("recipient")

                subject = "Project Meeting Update" if "meeting" in lower else "Important Notification"
                body = "Hi, This is a note regarding our upcoming meeting." if "meeting" in lower else "Hello, sharing an update with you."

                # Guideline #1: Zero approval for email dispatch
                steps.append(PlanStepSchema(
                    id=str(uuid.uuid4()),
                    tool="gmail",
                    action="send_email",
                    recipient=recipient,
                    subject=subject,
                    body=body,
                    requires_approval=False,
                    status="PLANNED",
                    missing_fields=missing_for_email
                ))

        # 3. Cab detection
        if "cab" in lower or "taxi" in lower or "ride" in lower:
            pickup = clarification_answers.get("pickup")
            destination = clarification_answers.get("destination")
            missing_for_cab = []

            # Check if airport is destination
            if "airport" in lower and not destination:
                destination = "Airport Terminal 2"

            if not pickup:
                missing_info.append("Pickup location")
                questions.append("Where should the cab pick you up?")
                missing_for_cab.append("pickup")

            if not destination:
                missing_info.append("Destination")
                questions.append("What is your destination?")
                missing_for_cab.append("destination")

            # Pickup time
            if "8:30 am" in lower:
                target_date = tomorrow if "tomorrow" in lower else now
                cab_time = target_date.replace(hour=8, minute=30, second=0, microsecond=0).isoformat()
            elif "7 am" in lower:
                target_date = tomorrow if "tomorrow" in lower else now
                cab_time = target_date.replace(hour=7, minute=0, second=0, microsecond=0).isoformat()
            else:
                cab_time = (tomorrow if "tomorrow" in lower else now).replace(hour=9, minute=0, second=0, microsecond=0).isoformat()

            steps.append(PlanStepSchema(
                id=str(uuid.uuid4()),
                tool="cab",
                action="book",
                pickup=pickup,
                destination=destination,
                pickup_time=cab_time,
                fare_estimate=420.0,
                cab_type="Sedan (Demo)",
                requires_approval=True,
                status="PLANNED",
                missing_fields=missing_for_cab
            ))

        ready = len(missing_info) == 0
        summary = "Autonomous execution plan generated"
        if note:
            summary += f" ({note})"

        return PlanResponse(
            task_id=task_id,
            intent="multi_action" if len(steps) > 1 else "single_action",
            instruction=instruction,
            steps=steps,
            missing_info=missing_info,
            clarification_questions=questions,
            ready_for_approval=ready,
            summary=summary
        )

planner_service = PlannerService()
