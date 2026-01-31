from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from models.evaluation import EvaluationRequest, EvaluationResult
from services.evaluation_engine import evaluate_answer
from services.llm_client import LLMError

router = APIRouter()

@router.post("/", response_model=EvaluationResult)
async def evaluate(payload: EvaluationRequest):
    try:
        return await run_in_threadpool(
            evaluate_answer,
            payload.question,
            payload.answer,
            payload.resume_context
        )
    except LLMError:
        raise HTTPException(status_code=502, detail="Evaluation service temporarily unavailable")