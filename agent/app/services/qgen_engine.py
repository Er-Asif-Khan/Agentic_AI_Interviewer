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

Generate exactly {count} real interview question(s) {level_instruction}.
{previous_questions_block}
Rules:
- Questions must be open-ended
- Ask experience-based questions
- Ask HOW, WHY, and DECISION-based questions
- Avoid definitions unless difficulty level is 1
- Sound like a real interviewer
- All questions MUST match difficulty level {level}
- Each new question MUST cover a DIFFERENT topic/concept than all previously asked questions
- Do NOT repeat or rephrase any previous question
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
    count: int = 10,
    previous_questions: list[str] | None = None,
):
    """Generate interview questions at a specific difficulty level.

    Args:
        resume_context: Extracted resume text.
        role: Target job role.
        difficulty_level: Bloom's taxonomy level 1-5 (default: 2).
        topic: Optional topic to focus questions on.
        count: Number of questions to generate (1-10, default: 10).
        previous_questions: List of previously asked questions to avoid repetition.
    """
    level = max(1, min(5, difficulty_level))  # clamp to valid range
    count = max(1, min(10, count))

    topic_line = f"Focus topic: {topic}" if topic else ""

    # Build the previous-questions block for the prompt
    if previous_questions and len(previous_questions) > 0:
        numbered = "\n".join(f"  {i+1}. {q}" for i, q in enumerate(previous_questions))
        previous_questions_block = (
            f"The following questions have ALREADY been asked. "
            f"Do NOT repeat these topics or rephrase them. "
            f"Pick a completely different skill/concept from the resume:\n{numbered}"
        )
    else:
        previous_questions_block = ""

    prompt = QGEN_PROMPT.format(
        role=role,
        resume=resume_context[:4000],
        level=level,
        level_description=DIFFICULTY_DESCRIPTIONS.get(level, ""),
        level_instruction=DIFFICULTY_PROMPT_INSTRUCTIONS.get(level, ""),
        topic_line=topic_line,
        count=count,
        previous_questions_block=previous_questions_block,
    )

    result = call_llm(prompt)
    return result["questions"]

