from pydantic import BaseModel
from config.interview_rules import MAX_QUESTIONS, MIN_PASS_SCORE, MIN_CONFIDENCE
from models.evaluation import EvaluationResult

class InterviewDecision(BaseModel):
    action: str

def decide_next_step(evaluation: EvaluationResult | None, asked_count: int) -> InterviewDecision:
    if asked_count >= MAX_QUESTIONS:
        return InterviewDecision(action="end")

    if not evaluation:
        return InterviewDecision(action="next")
  
    if evaluation.confidence < MIN_CONFIDENCE:
        return InterviewDecision(action="followup")

    if evaluation.score < MIN_PASS_SCORE and evaluation.weak_areas:
        return InterviewDecision(action="followup")
    
    return InterviewDecision(action="next")