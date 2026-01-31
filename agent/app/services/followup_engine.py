from services.llm_client import call_llm

FOLLOWUP_PROMPT = """
You are a senior technical interviewer.

Original Question:
{question}

Candidate Answer:
{answer}

Identified Weak Areas:
{weak}

Generate ONE realistic follow-up question.
Rules:
- Probe reasoning depth
- Ask WHY, TRADE-OFFS, or FAILURE SCENARIOS
- Avoid definitions
- Sound like a human interviewer
Return STRICT JSON:
{{ "followup": string }}
"""

def generate_followup(previous_question: str, weak_areas: list, answer: str) -> str:
    prompt = FOLLOWUP_PROMPT.format(
        question = previous_question,
        answer = answer,
        weak = ", ".join(weak_areas)
    )

    result = call_llm(prompt)
    return result["followup"]