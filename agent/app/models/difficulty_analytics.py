from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class DifficultyTimelineEntry(BaseModel):
    """Single entry in the difficulty progression timeline."""
    q: int
    difficulty: int
    score: Optional[float] = None
    level_name: str = ""


class DifficultyStats(BaseModel):
    """Aggregate difficulty statistics for a session."""
    average_difficulty: float = 0
    highest_difficulty: int = 0
    lowest_difficulty: int = 0
    average_score: float = 0
    total_questions: int = 0
    difficulty_changes: int = 0
    skill_ceiling: int = 0


class DifficultyAnalyticsRequest(BaseModel):
    """Request to generate difficulty analytics from session progression."""
    difficulty_progression: List[Dict[str, Any]] = Field(
        description="List of {question_number, difficulty_level, candidate_score} entries"
    )


class DifficultyAnalyticsResponse(BaseModel):
    """Full difficulty analytics report."""
    stats: DifficultyStats
    timeline: List[DifficultyTimelineEntry]
    summary: str
    explanation: str
    skill_ceiling: int
    skill_ceiling_name: str
