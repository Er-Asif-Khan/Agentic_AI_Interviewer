from services.llm_client import call_llm

VERDICT_PROMPT = """
You are a senior FAANG interviewer.

Interview session data:
{session}

Role: {role}

Analyze the full interview and return STRICT JSON:
{{
  "interview_readiness_score": number between 0 and 100,
  "hire_signal": "Hire" | "Borderline" | "No-Hire",
  "summary": string,
  "strengths": [string],
  "key_gaps": [string],
  "actionable_next_steps": [string]
}}
"""

def generate_verdict(session_context: list, role: str) -> dict:
    prompt = VERDICT_PROMPT.format(
        session=session_context,
        role=role
    )

    result = call_llm(prompt)

    score = max(0, min(100, result["interview_readiness_score"]))

    return {
        "interview_readiness_score": score,
        "hire_signal": result["hire_signal"],
        "summary": result["summary"],
        "strengths": result["strengths"],
        "key_gaps": result["key_gaps"],
        "actionable_next_steps": result["actionable_next_steps"], 
    }