from app.services.llm_client import call_llm

QGEN_PROMPT = """
You are a senior technical interviewer

Candidate resume:
{resume}

Target role: {role}

Generate exactly 10 real interview questions.
Rules:
- Questions must be open-ended
- Ask experience-based questions
- Ask HOW, WHY, and DECISION-based questions
- Avoid definitions
- Sound like a real interviewer
Return STRICT JSON:
{{
  "questions": [string]
}}
"""

def generate_questions(resume_context: str, role: str):
    prompt = QGEN_PROMPT.format(
        role = role,
        resume = resume_context[:4000]
    )

    result = call_llm(prompt)
    return result["questions"]
