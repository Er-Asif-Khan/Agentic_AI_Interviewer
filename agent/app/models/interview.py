from pydantic import BaseModel, Field
from typing import List, Optional
from app.models.evaluation import EvaluationResult


class DifficultyProgressionEntry(BaseModel):
    """Tracks difficulty and score for a single question in the session."""
    question_number: int
    difficulty_level: int = Field(ge=1, le=5)
    candidate_score: Optional[float] = Field(default=None, ge=0, le=10)


class InterviewNextStepRequest(BaseModel):
    resume_context: str
    role: str
    questions: List[str]
    asked_count: int
    evaluation: Optional[EvaluationResult] = None
    current_difficulty: int = Field(default=2, ge=1, le=5, description="Current difficulty level (1-5)")
    difficulty_progression: List[DifficultyProgressionEntry] = Field(
        default_factory=list,
        description="Per-question difficulty and score history",
    )

class InterviewNextStepResponse(BaseModel):
    action: str
    question: Optional[str] = None
    audio: Optional[str] = None
    current_difficulty: int = Field(default=2, ge=1, le=5, description="Current difficulty level (1-5)")
    difficulty_progression: List[DifficultyProgressionEntry] = Field(
        default_factory=list,
        description="Updated per-question difficulty and score history",
    )