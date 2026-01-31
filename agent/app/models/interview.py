from pydantic import BaseModel
from typing import List, Optional
from models.evaluation import EvaluationResult

class InterviewNextStepRequest(BaseModel):
    resume_context: str
    role: str
    questions: List[str]
    asked_count: int
    evaluation: Optional[EvaluationResult] = None

class InterviewNextStepResponse(BaseModel):
    action: str
    question: Optional[str] = None
    audio: Optional[str] = None