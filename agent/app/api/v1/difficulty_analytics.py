from fastapi import APIRouter
from app.models.difficulty_analytics import (
    DifficultyAnalyticsRequest,
    DifficultyAnalyticsResponse,
)
from app.services.difficulty_analytics import generate_full_difficulty_report

router = APIRouter()


@router.post("/", response_model=DifficultyAnalyticsResponse)
async def difficulty_analytics(payload: DifficultyAnalyticsRequest):
    """Generate a complete difficulty analytics report from session data.

    Accepts difficulty progression entries and returns:
    - Aggregate stats (averages, ceiling, fluctuations)
    - Timeline visualization data
    - Human-readable summary
    - Step-by-step explainability narrative
    """
    report = generate_full_difficulty_report(payload.difficulty_progression)
    return report
