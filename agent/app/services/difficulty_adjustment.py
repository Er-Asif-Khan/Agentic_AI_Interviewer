"""
Adaptive Difficulty Adjustment Engine

Adjusts the next question's difficulty based on the candidate's score
on the current question.

Score thresholds (on 0-10 scale):
  - score >= 8.0  → increase difficulty by 1 (strong answer)
  - 5.0 <= score < 8.0 → keep difficulty unchanged (adequate answer)
  - score < 5.0   → decrease difficulty by 1 (weak answer)

Difficulty is always clamped between 1 and 5.
"""

from app.config.difficulty_levels import DIFFICULTY_LEVELS

# Thresholds on the 0-10 evaluation scale
SCORE_THRESHOLD_HIGH = 8.0   # score >= this → increase difficulty
SCORE_THRESHOLD_LOW = 5.0    # score < this  → decrease difficulty


def adjust_difficulty(current_difficulty: int, candidate_score: float) -> int:
    """Compute the next difficulty level based on candidate performance.

    Args:
        current_difficulty: Current Bloom's taxonomy level (1-5).
        candidate_score: Candidate's score on the last answer (0-10).

    Returns:
        The adjusted difficulty level, clamped to [1, 5].
    """
    if candidate_score >= SCORE_THRESHOLD_HIGH:
        next_difficulty = current_difficulty + 1
    elif candidate_score < SCORE_THRESHOLD_LOW:
        next_difficulty = current_difficulty - 1
    else:
        next_difficulty = current_difficulty

    # Clamp to valid range
    return max(min(next_difficulty, max(DIFFICULTY_LEVELS)), min(DIFFICULTY_LEVELS))
