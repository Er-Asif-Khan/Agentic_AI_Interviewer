from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from models.verdict import VerdictRequest, VerdictResponse
from services.verdict_engine import generate_verdict
from services.llm_client import LLMError

router = APIRouter()

@router.post("/", response_model=VerdictResponse)
async def interview_verdict(payload: VerdictRequest):
    try:
        return await run_in_threadpool(
            generate_verdict,
            payload.session_context,
            payload.role
        )
    except LLMError:
        raise HTTPException(502, "Verdict service unavailable")