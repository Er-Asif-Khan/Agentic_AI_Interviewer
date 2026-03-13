"""
Adaptive Difficulty Scaling — Bloom's Taxonomy-Based Levels

Level 1: Basic recall (definitions, simple knowledge)
Level 2: Conceptual understanding (explanations, comparisons)
Level 3: Practical application (implementation, coding)
Level 4: Analytical reasoning (debugging, architecture, tradeoffs)
Level 5: Expert / system design (large-scale design, complex reasoning)
"""

# Reusable constant — all valid difficulty levels
DIFFICULTY_LEVELS = [1, 2, 3, 4, 5]

# Human-readable descriptions keyed by level
DIFFICULTY_DESCRIPTIONS = {
    1: "Basic recall — definition or simple knowledge questions",
    2: "Conceptual understanding — explanation or comparison questions",
    3: "Practical application — implementation or coding questions",
    4: "Analytical reasoning — debugging, architecture, or tradeoff questions",
    5: "Expert / system design — design large systems or complex reasoning",
}

# Prompt instruction snippets used inside LLM prompts
DIFFICULTY_PROMPT_INSTRUCTIONS = {
    1: "that tests basic recall and definitions",
    2: "that requires conceptual understanding and explanation",
    3: "that requires practical application or implementation",
    4: "that requires analytical reasoning about architecture, debugging, or tradeoffs",
    5: "that requires expert-level system design or complex reasoning",
}

# Default difficulty when a new interview session starts
DEFAULT_DIFFICULTY = 2
