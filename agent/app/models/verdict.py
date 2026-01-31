from pydantic import BaseModel
from typing import List, Dict, Any

class VerdictResponse(BaseModel):
    interview_readiness_score: int
    hire_signal: str
    summary: str
    strengths: List[str]
    key_gaps: List[str]
    actionable_next_steps: List[str]

class VerdictRequest(BaseModel):
    role: str
    session_context: List[Dict[str, Any]]