from fastapi import APIRouter, HTTPException
from fastapi.concurrency import run_in_threadpool
from app.models.interview import (
    InterviewNextStepRequest,
    InterviewNextStepResponse,
    DifficultyProgressionEntry,
)
from app.services.interview_logic import decide_next_step
from app.services.followup_engine import generate_followup
from app.services.tts_client import synthesize_speech
from app.services.llm_client import LLMError

router = APIRouter()

@router.post("/next-step", response_model=InterviewNextStepResponse)
async def interview_next_step(payload: InterviewNextStepRequest):
    # --- Build difficulty progression ---
    progression = list(payload.difficulty_progression)

    # If we have an evaluation, record this question's result
    if payload.evaluation:
        progression.append(
            DifficultyProgressionEntry(
                question_number=payload.asked_count,
                difficulty_level=payload.current_difficulty,
                candidate_score=payload.evaluation.score,
            )
        )

    # --- Decide next action (with adaptive difficulty adjustment) ---
    decision = decide_next_step(
        payload.evaluation,
        payload.asked_count,
        payload.current_difficulty,
    )

    if decision.action == "end":
        return InterviewNextStepResponse(
            action="end",
            current_difficulty=decision.current_difficulty,
            difficulty_progression=progression,
        )
    
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
                return InterviewNextStepResponse(
                    action="end",
                    current_difficulty=decision.current_difficulty,
                    difficulty_progression=progression,
                )
            question = payload.questions[payload.asked_count]

        audio = await run_in_threadpool(synthesize_speech, question)

        return InterviewNextStepResponse(
            action=decision.action,
            question=question,
            audio=audio,
            current_difficulty=decision.current_difficulty,
            difficulty_progression=progression,
        )
    
    except LLMError:
        raise HTTPException(502, "Interview service temporarily unavailable")


