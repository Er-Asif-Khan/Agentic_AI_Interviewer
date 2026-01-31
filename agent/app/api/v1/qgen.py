from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from app.models.qgen import QGenRequest, QGenResponse
from app.services.qgen_engine import generate_questions
from app.services.llm_client import LLMError

router = APIRouter()
    
@router.post("/", response_model=QGenResponse)
async def qgen(payload: QGenRequest):
    if len(payload.resume_context) > 8000:
        raise HTTPException(400, "Resume context too large")
    
    try:
        questions = await run_in_threadpool(
            generate_questions,
            payload.resume_context,
            payload.role
        )
        return {"questions": questions}
    except LLMError:
        raise HTTPException(502, "Question generation unavailable")
