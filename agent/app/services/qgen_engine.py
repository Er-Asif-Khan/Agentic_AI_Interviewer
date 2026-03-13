from app.services.llm_client import call_llm
from app.config.difficulty_levels import (
    DIFFICULTY_DESCRIPTIONS,
    DIFFICULTY_PROMPT_INSTRUCTIONS,
    DEFAULT_DIFFICULTY,
)

QGEN_PROMPT = """
You are a senior technical interviewer.

Candidate resume:
{resume}

Target role: {role}
{topic_line}
Difficulty Level: {level} — {level_description}

Generate exactly 10 real interview questions {level_instruction}.
Rules:
- Questions must be open-ended
- Ask experience-based questions
- Ask HOW, WHY, and DECISION-based questions
- Avoid definitions unless difficulty level is 1
- Sound like a real interviewer
- All questions MUST match difficulty level {level}
Return STRICT JSON:
{{
  "questions": [string]
}}
"""

def generate_questions(
    resume_context: str,
    role: str,
    difficulty_level: int = DEFAULT_DIFFICULTY,
    topic: str | None = None,
):
    """Generate interview questions at a specific difficulty level.

    Args:
        resume_context: Extracted resume text.
        role: Target job role.
        difficulty_level: Bloom's taxonomy level 1-5 (default: 2).
        topic: Optional topic to focus questions on.
    """
    level = max(1, min(5, difficulty_level))  # clamp to valid range

    topic_line = f"Focus topic: {topic}" if topic else ""

    prompt = QGEN_PROMPT.format(
        role=role,
        resume=resume_context[:4000],
        level=level,
        level_description=DIFFICULTY_DESCRIPTIONS.get(level, ""),
        level_instruction=DIFFICULTY_PROMPT_INSTRUCTIONS.get(level, ""),
        topic_line=topic_line,
    )

    result = call_llm(prompt)
    return result["questions"]
