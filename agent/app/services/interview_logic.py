from pydantic import BaseModel
from app.config.interview_rules import MAX_QUESTIONS, MIN_PASS_SCORE, MIN_CONFIDENCE
from app.config.difficulty_levels import DEFAULT_DIFFICULTY
from app.models.evaluation import EvaluationResult
from app.services.difficulty_adjustment import adjust_difficulty

class InterviewDecision(BaseModel):
    action: str
    current_difficulty: int = DEFAULT_DIFFICULTY

def decide_next_step(
    evaluation: EvaluationResult | None,
    asked_count: int,
    current_difficulty: int = DEFAULT_DIFFICULTY,
) -> InterviewDecision:
    if asked_count >= MAX_QUESTIONS:
        return InterviewDecision(action="end", current_difficulty=current_difficulty)

    if not evaluation:
        return InterviewDecision(action="next", current_difficulty=current_difficulty)

    # --- Adaptive difficulty adjustment ---
    # Use the candidate's score to compute the next difficulty level.
    next_difficulty = adjust_difficulty(current_difficulty, evaluation.score)

    if evaluation.confidence < MIN_CONFIDENCE:
        return InterviewDecision(action="followup", current_difficulty=next_difficulty)

    if evaluation.score < MIN_PASS_SCORE and evaluation.weak_areas:
        return InterviewDecision(action="followup", current_difficulty=next_difficulty)
    
    return InterviewDecision(action="next", current_difficulty=next_difficulty)

