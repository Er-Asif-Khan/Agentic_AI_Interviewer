import sys
import os

# Add the project root to sys.path so we can import from the 'backend' folder
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
if root_dir not in sys.path:
    sys.path.append(root_dir)

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

    # Behavioral communication analysis on the raw candidate answer.
    # If the candidate provided no real answer, pass empty string to get
    # zeroed-out metrics instead of fake analysis on the placeholder text.
    answer_text = answer or ""
    no_answer_markers = ["(no answer", "no answer provided", "(no response", "n/a"]
    is_no_answer = any(marker in answer_text.lower() for marker in no_answer_markers)
    analysis = analyze_transcript(
        "" if is_no_answer else answer_text,
        question=question,
    )

    return {
        "score": round(response["score"], 1),
        "strengths": response["strengths"],
        "weak_areas": response["weak_areas"],
        "feedback": response["feedback"],
        "confidence": min(1.0, response.get("score", 7) / 10),
        "analysis": analysis,
    }
