from pydantic import BaseModel
from typing import List

class EvaluationResult(BaseModel):
    score: float
    strengths: List[str]
    weak_areas: List[str]
    feedback: str
    confidence: float

class EvaluationRequest(BaseModel):
    question: str
    answer: str
    resume_context: str | None = ""