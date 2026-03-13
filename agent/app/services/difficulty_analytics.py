"""
Difficulty Analytics & Explainability Engine

Pure rule-based analytics for interview difficulty progression.
No ML, no external services — just structured analysis.
"""

from typing import List, Dict, Any, Optional
from app.config.difficulty_levels import DIFFICULTY_DESCRIPTIONS


# A level is "mastered" if the candidate scored >= this threshold (on 0-10 scale)
MASTERY_THRESHOLD = 7.0  # corresponds to 70%


def compute_skill_ceiling(progression: List[Dict[str, Any]]) -> int:
    """Find the highest difficulty level the candidate mastered.

    A level is mastered if candidate_score >= MASTERY_THRESHOLD (7.0).

    Args:
        progression: List of {question_number, difficulty_level, candidate_score}.

    Returns:
        Highest mastered difficulty level (1-5), or 0 if none mastered.
    """
    mastered_levels = set()
    for entry in progression:
        score = entry.get("candidate_score")
        level = entry.get("difficulty_level", 1)
        if score is not None and score >= MASTERY_THRESHOLD:
            mastered_levels.add(level)

    return max(mastered_levels) if mastered_levels else 0


def build_difficulty_timeline(progression: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Return a clean, structured timeline of the difficulty journey.

    Args:
        progression: Raw progression entries.

    Returns:
        Sorted list of {q, difficulty, score, level_name} dicts.
    """
    timeline = []
    for entry in progression:
        timeline.append({
            "q": entry.get("question_number", 0),
            "difficulty": entry.get("difficulty_level", 1),
            "score": entry.get("candidate_score"),
            "level_name": DIFFICULTY_DESCRIPTIONS.get(
                entry.get("difficulty_level", 1), "Unknown"
            ),
        })
    return sorted(timeline, key=lambda x: x["q"])


def compute_difficulty_stats(progression: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute aggregate difficulty statistics for the session.

    Returns dict with:
        - average_difficulty
        - highest_difficulty
        - lowest_difficulty
        - average_score
        - total_questions
        - difficulty_changes (number of times difficulty shifted)
        - skill_ceiling
    """
    if not progression:
        return {
            "average_difficulty": 0,
            "highest_difficulty": 0,
            "lowest_difficulty": 0,
            "average_score": 0,
            "total_questions": 0,
            "difficulty_changes": 0,
            "skill_ceiling": 0,
        }

    levels = [e.get("difficulty_level", 1) for e in progression]
    scores = [
        e.get("candidate_score", 0)
        for e in progression
        if e.get("candidate_score") is not None
    ]

    # Count difficulty fluctuations (times level changed between consecutive Qs)
    changes = sum(
        1 for i in range(1, len(levels)) if levels[i] != levels[i - 1]
    )

    return {
        "average_difficulty": round(sum(levels) / len(levels), 2),
        "highest_difficulty": max(levels),
        "lowest_difficulty": min(levels),
        "average_score": round(sum(scores) / len(scores), 2) if scores else 0,
        "total_questions": len(progression),
        "difficulty_changes": changes,
        "skill_ceiling": compute_skill_ceiling(progression),
    }


def generate_difficulty_summary(progression: List[Dict[str, Any]]) -> str:
    """Generate a human-readable difficulty analysis summary.

    Suitable for research reports and hackathon presentations.
    """
    stats = compute_difficulty_stats(progression)

    if stats["total_questions"] == 0:
        return "No questions were answered in this session."

    ceiling = stats["skill_ceiling"]
    ceiling_name = DIFFICULTY_DESCRIPTIONS.get(ceiling, "none")
    highest = stats["highest_difficulty"]
    avg_diff = stats["average_difficulty"]
    avg_score = stats["average_score"]
    changes = stats["difficulty_changes"]
    total = stats["total_questions"]

    # Build summary paragraphs
    parts = []

    # Overall performance sentence
    if avg_score >= 8.0:
        parts.append(
            f"The candidate demonstrated strong overall performance across "
            f"{total} questions with an average score of {avg_score}/10."
        )
    elif avg_score >= 5.0:
        parts.append(
            f"The candidate showed moderate performance across "
            f"{total} questions with an average score of {avg_score}/10."
        )
    else:
        parts.append(
            f"The candidate struggled across "
            f"{total} questions with an average score of {avg_score}/10."
        )

    # Difficulty range
    parts.append(
        f"The average difficulty reached was Level {avg_diff} "
        f"and the highest difficulty attempted was Level {highest} "
        f"({DIFFICULTY_DESCRIPTIONS.get(highest, 'Unknown')})."
    )

    # Skill ceiling
    if ceiling > 0:
        parts.append(
            f"The highest sustained difficulty handled was Level {ceiling} "
            f"({ceiling_name}), indicating the candidate's skill ceiling."
        )
    else:
        parts.append(
            "The candidate did not demonstrate mastery (score >= 7.0) "
            "at any difficulty level."
        )

    # Fluctuations
    if changes == 0:
        parts.append("Difficulty remained constant throughout the interview.")
    elif changes <= 2:
        parts.append(
            f"There were {changes} difficulty adjustment(s), "
            f"indicating a relatively stable performance trajectory."
        )
    else:
        parts.append(
            f"There were {changes} difficulty adjustments across {total} questions, "
            f"indicating variable performance with notable fluctuations."
        )

    return " ".join(parts)


def generate_difficulty_explanation(progression: List[Dict[str, Any]]) -> str:
    """Produce a step-by-step explanation of how difficulty evolved.

    Describes each transition: why the level increased, decreased,
    or stayed the same, and identifies strengths/weaknesses.
    """
    if not progression:
        return "No progression data available."

    sorted_prog = sorted(progression, key=lambda x: x.get("question_number", 0))
    lines = ["## Difficulty Progression Explanation\n"]

    for i, entry in enumerate(sorted_prog):
        q_num = entry.get("question_number", i + 1)
        level = entry.get("difficulty_level", 1)
        score = entry.get("candidate_score")
        level_name = DIFFICULTY_DESCRIPTIONS.get(level, "Unknown")

        score_str = f"{score}/10" if score is not None else "N/A"

        if i == 0:
            lines.append(
                f"**Q{q_num}** - Started at Level {level} ({level_name}). "
                f"Score: {score_str}."
            )
        else:
            prev_level = sorted_prog[i - 1].get("difficulty_level", 1)
            prev_score = sorted_prog[i - 1].get("candidate_score")

            if level > prev_level:
                reason = (
                    f"Difficulty increased from Level {prev_level} -> {level} "
                    f"because the previous answer scored {prev_score}/10 (>= 8.0, strong performance)."
                )
            elif level < prev_level:
                reason = (
                    f"Difficulty decreased from Level {prev_level} -> {level} "
                    f"because the previous answer scored {prev_score}/10 (< 5.0, weak performance)."
                )
            else:
                reason = (
                    f"Difficulty remained at Level {level} "
                    f"because the previous answer scored {prev_score}/10 (adequate range 5.0-7.9)."
                )

            lines.append(
                f"**Q{q_num}** - {reason} "
                f"Current level: {level_name}. Score: {score_str}."
            )

    # Strengths and weaknesses summary
    stats = compute_difficulty_stats(progression)
    lines.append("")

    strong_levels = set()
    weak_levels = set()
    for entry in sorted_prog:
        score = entry.get("candidate_score")
        level = entry.get("difficulty_level", 1)
        if score is not None:
            if score >= MASTERY_THRESHOLD:
                strong_levels.add(level)
            elif score < 5.0:
                weak_levels.add(level)

    if strong_levels:
        strong_names = [
            f"Level {l} ({DIFFICULTY_DESCRIPTIONS.get(l, '')})"
            for l in sorted(strong_levels)
        ]
        lines.append(f"**Strengths:** Performed well at {', '.join(strong_names)}.")

    if weak_levels:
        weak_names = [
            f"Level {l} ({DIFFICULTY_DESCRIPTIONS.get(l, '')})"
            for l in sorted(weak_levels)
        ]
        lines.append(f"**Weaknesses:** Struggled at {', '.join(weak_names)}.")

    if stats["skill_ceiling"] > 0:
        lines.append(
            f"**Skill Ceiling:** Level {stats['skill_ceiling']} "
            f"({DIFFICULTY_DESCRIPTIONS.get(stats['skill_ceiling'], '')})."
        )

    return "\n".join(lines)


def generate_full_difficulty_report(progression: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Generate a complete difficulty analytics report.

    Returns a structured dict containing:
        - stats: aggregate metrics
        - timeline: per-question timeline
        - summary: human-readable summary paragraph
        - explanation: step-by-step difficulty explanation
        - skill_ceiling: highest mastered level
    """
    stats = compute_difficulty_stats(progression)
    timeline = build_difficulty_timeline(progression)
    summary = generate_difficulty_summary(progression)
    explanation = generate_difficulty_explanation(progression)

    return {
        "stats": stats,
        "timeline": timeline,
        "summary": summary,
        "explanation": explanation,
        "skill_ceiling": stats["skill_ceiling"],
        "skill_ceiling_name": DIFFICULTY_DESCRIPTIONS.get(
            stats["skill_ceiling"], "None"
        ),
    }
