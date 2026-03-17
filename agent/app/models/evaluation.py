from pydantic import BaseModel
from typing import List, Optional

class EvaluationResult(BaseModel):
    score: float
    strengths: List[str]
    weak_areas: List[str]
    feedback: str
    confidence: float
    # Optional per-answer behavioral communication analysis, populated from
    # backend.behavioral_ai.analyzer.analyze_transcript
    analysis: Optional[dict] = None

class EvaluationRequest(BaseModel):
    question: str
    answer: str
    resume_context: str | None = ""