from app.services.llm_client import call_llm

SESSION_PROMPT = """
You are a senior FAANG interviewer.

Interview session:
{session}

Role: {role}

Analyze across the ENTIRE interview.
Analyze like a real interview.
Return STRICT JSON:
{{
  "consistency": string,
  "communication_trend": string,
  "technical_depth_trend": string,
  "strengths": [string],
  "improvement_suggestions": [string]
}}
"""

def analyze_session(session_context: list, role: str):
    prompt = SESSION_PROMPT.format(
        session = session_context,
        role = role
    )
    
    return call_llm(prompt)
