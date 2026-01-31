from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from models.interview import InterviewNextStepRequest, InterviewNextStepResponse
from services.interview_logic import decide_next_step
from services.followup_engine import generate_followup
from services.tts_client import synthesize_speech
from services.llm_client import LLMError

router = APIRouter()

@router.post("/next-step", response_model=InterviewNextStepResponse)
async def interview_next_step(payload: InterviewNextStepRequest):
    decision = decide_next_step(payload.evaluation, payload.asked_count)

    if decision.action == "end":
        return InterviewNextStepResponse(action="end")
    
    try:
        if decision.action == "followup":
            if not payload.evaluation:
                raise HTTPException(400, "Evaluation required")
            
            question = await run_in_threadpool(
                generate_followup,
                payload.evaluation.question,
                payload.evaluation.weak_areas,
                payload.evaluation.feedback
            )
        else:
            if payload.asked_count >= len(payload.questions):
                return InterviewNextStepResponse(action="end")
            question = payload.questions[payload.asked_count]

        audio = await run_in_threadpool(synthesize_speech, question)

        return InterviewNextStepResponse(
            action=decision.action,
            question=question,
            audio=audio
        )
    
    except LLMError:
        raise HTTPException(502, "Interview service temporarily unavailable")