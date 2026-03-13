from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from app.models.verdict import VerdictRequest, VerdictResponse
from app.services.verdict_engine import generate_verdict
from app.services.difficulty_analytics import generate_full_difficulty_report
from app.services.llm_client import LLMError

router = APIRouter()

@router.post("/", response_model=VerdictResponse)
async def interview_verdict(payload: VerdictRequest):
    try:
        result = await run_in_threadpool(
            generate_verdict,
            payload.session_context,
            payload.role
        )

        # Include difficulty analytics if progression data was provided
        if payload.difficulty_progression:
            result["difficulty_analysis"] = generate_full_difficulty_report(
                payload.difficulty_progression
            )

        return result
    except LLMError:
        raise HTTPException(502, "Verdict service unavailable")

