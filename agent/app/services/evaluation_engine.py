from app.services.llm_client import call_llm
from backend.behavioral_ai.analyzer import analyze_transcript

EVAL_PROMPT = """
You are a senior technical interviewer.

Question:
{question}

Candidate Answer:
{answer}

Resume Context:
{resume}

Evaluate the answer like a real interviewer.

Return STRICT JSON:
{{
  "score": number between 0 and 10,
  "strengths": [string],
  "weak_areas": [string],
  "feedback": string
}}
"""

def evaluate_answer(question: str, answer: str, resume_context: str = ""):
    prompt = EVAL_PROMPT.format(
        question=question,
        answer=answer,
        resume=resume_context[:3000]
    )

    response = call_llm(prompt)

    # Behavioral communication analysis on the raw candidate answer
    # (using rule-based metrics from the behavioral_ai analyzer).
    analysis = analyze_transcript(answer or "")

    return {
        "score": round(response["score"], 1),
        "strengths": response["strengths"],
        "weak_areas": response["weak_areas"],
        "feedback": response["feedback"],
        "confidence": min(1.0, response.get("score", 7) / 10),
        "analysis": analysis,
    }
