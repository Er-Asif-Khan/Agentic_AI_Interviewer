"""
Behavioral communication analysis utilities for interview transcripts.

This module provides lightweight, rule-based metrics that assess
communication patterns from speech-to-text output.

IMPORTANT: Speech-to-text engines do NOT capture filler sounds like
literal "um" or "uh". Therefore:
- hesitation_rate: detects repeated words, false starts, stammering patterns
- filler_word_count: detects full filler WORDS that STT does capture
  (e.g. "basically", "like", "so", "actually", "literally", "right", "well")
- All other metrics use text-level analysis

Original metrics (kept): hesitation_rate, filler_word_count,
  average_sentence_length, confidence_score, interruptions
New metrics (added): vocabulary_richness, response_coherence,
  hedging_count, sentence_structure, response_length, word_count
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List
import math
import re


# ── Text processing helpers ──────────────────────────────────────────────────

_WORD_RE = re.compile(r"\b\w+\b")
_SENTENCE_SPLIT_RE = re.compile(r"[.!?]+")
_ELLIPSIS_RE = re.compile(r"\.\.\.+")

# Filler WORDS that speech-to-text DOES capture (full dictionary words)
# Note: "um" and "uh" are NOT here because STT doesn't capture them
_FILLER_SINGLE_WORDS = {
    "basically", "like", "actually", "literally", "right",
    "well", "anyway", "anyways", "whatever", "okay",
}
_FILLER_PHRASES = ["you know", "i mean", "kind of", "sort of"]

# Hedging / uncertainty phrases
_HEDGING_PHRASES = [
    "i think", "i guess", "i believe", "i suppose", "i feel like",
    "maybe", "probably", "perhaps", "possibly", "might be",
    "not sure", "not certain", "don't know", "dont know",
    "i'm not sure", "im not sure", "kind of", "sort of",
    "something like", "more or less", "if i remember",
    "if i recall", "as far as i know", "i would say",
]

# Confident / assertive phrases
_CONFIDENT_PHRASES = [
    "i have experience", "i implemented", "i built", "i designed",
    "i developed", "i managed", "i led", "i created",
    "in my experience", "specifically", "for example", "for instance",
    "the key point is", "the main reason", "what i did was",
    "i am confident", "definitely", "absolutely", "certainly",
    "i have worked with", "i have used", "my approach was",
]

# Stop words for vocabulary richness calculation
_STOP_WORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "to", "of", "in", "for",
    "on", "with", "at", "by", "from", "as", "into", "through", "during",
    "before", "after", "and", "but", "or", "not", "so", "yet", "both",
    "that", "this", "these", "those", "what", "which", "who", "how",
    "when", "where", "why", "i", "me", "my", "we", "our", "you", "your",
    "he", "she", "it", "they", "them", "his", "her", "its", "their",
    "about", "also", "up", "out", "if", "then", "than", "too", "very",
}

# Patterns that indicate no real answer was given
_NO_ANSWER_PATTERNS = [
    r"^\s*\(no answer",
    r"^\s*no answer",
    r"^\s*\(no response",
    r"^\s*n/?a\s*$",
    r"^\s*-\s*$",
    r"^\s*\.\s*$",
    r"^\s*$",
]
_NO_ANSWER_RE = re.compile("|".join(_NO_ANSWER_PATTERNS), re.IGNORECASE)

_MIN_SUBSTANTIVE_WORDS = 5


def _normalize_text(text: str) -> str:
    return text.lower().strip()


def _tokenize_words(text: str) -> List[str]:
    return _WORD_RE.findall(_normalize_text(text))


def _split_sentences(text: str) -> List[str]:
    segments = _SENTENCE_SPLIT_RE.split(text)
    result = [s.strip() for s in segments if s.strip()]
    if not result and text.strip():
        result = [text.strip()]
    return result


def _is_empty_or_no_answer(text: str) -> bool:
    if not text or not text.strip():
        return True
    return bool(_NO_ANSWER_RE.match(text.strip()))


def _content_words(words: List[str]) -> List[str]:
    return [w for w in words if w not in _STOP_WORDS and len(w) > 1]


# ── Original metrics (IMPROVED accuracy) ─────────────────────────────────────

def hesitation_rate(transcript: str) -> float:
    """
    Calculate hesitation rate as percentage of total words.

    Since STT doesn't capture "um"/"uh", we detect hesitation through:
    - Repeated consecutive words ("I I think", "the the problem")
    - Stammering / false starts in text
    - Ellipsis occurrences ("...")

    Returns float in [0, 100]. Returns 0.0 for empty/no-answer.
    """
    if _is_empty_or_no_answer(transcript):
        return 0.0

    text = _normalize_text(transcript)
    words = _tokenize_words(text)
    if not words:
        return 0.0

    total_hesitations = 0

    # 1) Consecutive repeated words ("I I", "the the")
    for i in range(1, len(words)):
        if words[i] == words[i - 1] and len(words[i]) > 1:
            total_hesitations += 1

    # 2) Ellipsis occurrences (pauses transcribed as "...")
    total_hesitations += len(_ELLIPSIS_RE.findall(text))

    # 3) Stammering pattern: "th- the", "I- I" (dashes in text)
    stammer_re = re.compile(r"\b(\w+)-\s*\1", re.IGNORECASE)
    total_hesitations += len(stammer_re.findall(transcript))

    rate = (total_hesitations / len(words)) * 100.0
    return round(rate, 2)


def detect_filler_words(transcript: str) -> Dict[str, Any]:
    """
    Detect filler words that speech-to-text DOES capture.

    These are full dictionary words used as fillers:
    - Single words: "basically", "like", "actually", "literally",
                    "right", "well", "okay", "anyway"
    - Multi-word phrases: "you know", "i mean", "kind of", "sort of"

    Note: "um" and "uh" are NOT detected because STT doesn't capture them.

    Returns: { "count": int, "words": [str] }
    """
    if _is_empty_or_no_answer(transcript):
        return {"count": 0, "words": []}

    text = _normalize_text(transcript)
    words = _tokenize_words(text)
    fillers: List[str] = []

    # Multi-word fillers
    for phrase in _FILLER_PHRASES:
        pattern = re.compile(r"\b" + re.escape(phrase) + r"\b")
        matches = list(pattern.finditer(text))
        fillers.extend([phrase] * len(matches))

    # Single-word fillers with context check for "like"
    _non_filler_like_preceding = {"would", "looks", "feels", "sounds", "seems", "dont", "i"}
    for idx, w in enumerate(words):
        if w in _FILLER_SINGLE_WORDS:
            if w == "like" and idx > 0 and words[idx - 1] in _non_filler_like_preceding:
                continue
            fillers.append(w)

    return {"count": len(fillers), "words": fillers}


def average_sentence_length(transcript: str) -> float:
    """
    Calculate average sentence length in words.
    Returns 0.0 for empty/no-answer.
    """
    if _is_empty_or_no_answer(transcript):
        return 0.0

    sentences = _split_sentences(transcript)
    if not sentences:
        return 0.0

    total_words = sum(len(_tokenize_words(s)) for s in sentences)
    if total_words == 0:
        return 0.0

    return round(total_words / len(sentences), 1)


def confidence_trend(transcript: str) -> int:
    """
    Compute a heuristic confidence score (0-100).

    Based on:
    - Hedging vs assertive language ratio (40 points)
    - Sentence structure quality (25 points)
    - Response length adequacy (20 points)
    - Vocabulary richness (15 points)

    Returns 0 for empty/no-answer/too-short transcripts.
    """
    if _is_empty_or_no_answer(transcript):
        return 0

    words = _tokenize_words(transcript)
    word_count = len(words)

    if word_count < _MIN_SUBSTANTIVE_WORDS:
        return max(0, min(10, word_count * 2))

    # Component 1: Hedging vs confidence language (0-40)
    hedge_data = _compute_hedging(transcript)
    hedging_ratio = hedge_data["hedging_ratio"]
    hedge_component = 40.0 * (1.0 - hedging_ratio)

    # Component 2: Sentence structure (0-25)
    structure = _compute_sentence_structure(transcript)
    structure_component = structure * 0.25

    # Component 3: Response length adequacy (0-20)
    length = _compute_response_length_score(transcript)
    length_component = length * 0.20

    # Component 4: Vocabulary richness (0-15)
    vocab = _compute_vocabulary_richness(transcript)
    vocab_component = vocab * 15.0

    total = hedge_component + structure_component + length_component + vocab_component

    # Short answer penalty
    if word_count < 15:
        total *= (word_count / 15.0)

    return int(round(max(0.0, min(100.0, total))))


def detect_interruptions(transcript: str) -> int:
    """
    Detect likely interruptions or incomplete sentences.

    Heuristic cues:
    - Ellipsis-based ("I was thinking that...")
    - Short trailing fragment after longer sentences
    - Dashes indicating cut-off speech ("I was going to-")

    Returns 0 for empty/no-answer/too-short transcripts.
    """
    if _is_empty_or_no_answer(transcript):
        return 0

    text = transcript.strip()
    words = _tokenize_words(text)

    if len(words) < _MIN_SUBSTANTIVE_WORDS:
        return 0

    sentences = _split_sentences(text)
    if not sentences:
        return 0

    interruptions = 0

    # 1) Ellipsis-based interruptions
    interruptions += len(_ELLIPSIS_RE.findall(text))

    # 2) Short trailing fragment after longer sentence
    if len(sentences) >= 2:
        lengths = [len(_tokenize_words(s)) for s in sentences]
        avg_len = sum(lengths[:-1]) / max(1, len(lengths) - 1)
        last_len = lengths[-1]
        if avg_len >= 8 and last_len <= max(3, avg_len / 3):
            interruptions += 1

    # 3) Dashes indicating cut-off speech
    dash_cutoff = re.compile(r"\w+-\s")
    interruptions += len(dash_cutoff.findall(text))

    return max(0, interruptions)


# ── NEW additional metrics ───────────────────────────────────────────────────

def _compute_vocabulary_richness(transcript: str) -> float:
    """Type-token ratio of content words. Returns 0.0-1.0."""
    if _is_empty_or_no_answer(transcript):
        return 0.0
    content = _content_words(_tokenize_words(transcript))
    if len(content) < 3:
        return 0.0
    return round(len(set(content)) / len(content), 3)


def _compute_response_coherence(transcript: str, question: str = "") -> float:
    """Keyword overlap between question and answer. Returns 0.0-1.0."""
    if _is_empty_or_no_answer(transcript):
        return 0.0
    if not question or not question.strip():
        words = _tokenize_words(transcript)
        return min(1.0, len(words) / 30.0) if len(words) >= _MIN_SUBSTANTIVE_WORDS else 0.0

    q_words = set(_content_words(_tokenize_words(question)))
    a_words = set(_content_words(_tokenize_words(transcript)))
    if not q_words or not a_words:
        return 0.0

    overlap = q_words.intersection(a_words)
    overlap_ratio = len(overlap) / len(q_words)
    richness_bonus = min(0.3, len(a_words) / 50.0)
    return round(min(1.0, overlap_ratio + richness_bonus), 3)


def _compute_hedging(transcript: str) -> Dict[str, Any]:
    """Detect hedging vs confident language."""
    if _is_empty_or_no_answer(transcript):
        return {"hedging_count": 0, "hedging_ratio": 0.0}

    text = _normalize_text(transcript)
    hedging_count = 0
    confident_count = 0

    for phrase in _HEDGING_PHRASES:
        hedging_count += text.count(phrase)
    for phrase in _CONFIDENT_PHRASES:
        confident_count += text.count(phrase)

    total = hedging_count + confident_count
    hedging_ratio = hedging_count / total if total > 0 else 0.5

    return {
        "hedging_count": hedging_count,
        "hedging_ratio": round(hedging_ratio, 3),
    }


def _compute_sentence_structure(transcript: str) -> float:
    """Sentence structure quality score (0-100)."""
    if _is_empty_or_no_answer(transcript):
        return 0.0

    sentences = _split_sentences(transcript)
    if not sentences:
        return 0.0

    sentence_lengths = [len(_tokenize_words(s)) for s in sentences]
    avg_len = sum(sentence_lengths) / len(sentence_lengths)
    total_words = sum(sentence_lengths)

    if total_words < _MIN_SUBSTANTIVE_WORDS:
        return max(0.0, total_words * 3.0)

    # Average length score (0-35)
    if avg_len < 3:
        length_score = 5.0
    elif avg_len < 10:
        length_score = 5.0 + (avg_len - 3) / 7.0 * 25.0
    elif avg_len <= 25:
        length_score = 30.0 + (min(avg_len, 25) - 10) / 15.0 * 5.0
    else:
        length_score = max(10.0, 35.0 - (avg_len - 25) * 1.5)

    # Variation score (0-25)
    if len(sentence_lengths) >= 2:
        mean = avg_len
        variance = sum((l - mean) ** 2 for l in sentence_lengths) / len(sentence_lengths)
        std_dev = math.sqrt(variance)
        if std_dev < 1:
            variation_score = 8.0
        elif std_dev <= 8:
            variation_score = 15.0 + (std_dev / 8.0) * 10.0
        else:
            variation_score = max(5.0, 25.0 - (std_dev - 8) * 2.0)
    else:
        variation_score = 10.0

    # Starter diversity (0-20)
    starters = [_tokenize_words(s)[0] if _tokenize_words(s) else "" for s in sentences]
    if len(starters) >= 2:
        starter_score = (len(set(starters)) / len(starters)) * 20.0
    else:
        starter_score = 10.0

    # Completeness (0-20)
    completeness = min(20.0, (total_words / 40.0) * 20.0)

    total = length_score + variation_score + starter_score + completeness
    return round(max(0.0, min(100.0, total)), 1)


def _compute_response_length_score(transcript: str) -> float:
    """Response length adequacy (0-100)."""
    if _is_empty_or_no_answer(transcript):
        return 0.0

    word_count = len(_tokenize_words(transcript))

    if word_count < 5:
        return max(0.0, word_count * 2.0)
    elif word_count <= 15:
        return 10.0 + (word_count - 5) / 10.0 * 30.0
    elif word_count <= 50:
        return 40.0 + (word_count - 15) / 35.0 * 40.0
    elif word_count <= 100:
        return 80.0 + (word_count - 50) / 50.0 * 15.0
    else:
        return max(75.0, 95.0 - (word_count - 100) * 0.1)


# ── Main analysis function ───────────────────────────────────────────────────

def analyze_transcript(
    transcript: str,
    question: str = "",
) -> Dict[str, Any]:
    """
    Run a complete behavioral communication analysis on a transcript.

    Returns both ORIGINAL metrics (improved accuracy) and NEW additional metrics.
    All return 0 for empty/no-answer transcripts.

    ORIGINAL metrics:
        - hesitation_rate: float (0-100%)
        - filler_word_count: int
        - average_sentence_length: float
        - confidence_score: int (0-100)
        - interruptions: int

    NEW additional metrics:
        - vocabulary_richness: float (0-1)
        - response_coherence: float (0-1)
        - hedging_count: int
        - hedging_ratio: float (0-1)
        - sentence_structure: float (0-100)
        - response_length: float (0-100)
        - word_count: int
        - is_substantive: bool
    """
    if _is_empty_or_no_answer(transcript):
        return {
            # Original metrics
            "hesitation_rate": 0.0,
            "filler_word_count": 0,
            "average_sentence_length": 0.0,
            "confidence_score": 0,
            "interruptions": 0,
            # New metrics
            "vocabulary_richness": 0.0,
            "response_coherence": 0.0,
            "hedging_count": 0,
            "hedging_ratio": 0.0,
            "sentence_structure": 0.0,
            "response_length": 0.0,
            "word_count": 0,
            "is_substantive": False,
        }

    words = _tokenize_words(transcript)
    word_count = len(words)
    substantive = word_count >= _MIN_SUBSTANTIVE_WORDS

    # Original metrics (improved)
    h_rate = hesitation_rate(transcript)
    filler = detect_filler_words(transcript)
    avg_len = average_sentence_length(transcript)
    confidence = confidence_trend(transcript)
    interrupt_count = detect_interruptions(transcript)

    # New additional metrics
    vocab = _compute_vocabulary_richness(transcript)
    coherence = _compute_response_coherence(transcript, question)
    hedge = _compute_hedging(transcript)
    structure = _compute_sentence_structure(transcript)
    length = _compute_response_length_score(transcript)

    return {
        # Original metrics (improved accuracy)
        "hesitation_rate": float(h_rate),
        "filler_word_count": int(filler.get("count", 0)),
        "average_sentence_length": float(avg_len),
        "confidence_score": int(confidence),
        "interruptions": int(interrupt_count),
        # New additional metrics
        "vocabulary_richness": vocab,
        "response_coherence": coherence,
        "hedging_count": hedge["hedging_count"],
        "hedging_ratio": hedge["hedging_ratio"],
        "sentence_structure": structure,
        "response_length": length,
        "word_count": word_count,
        "is_substantive": substantive,
    }


__all__ = [
    "hesitation_rate",
    "detect_filler_words",
    "average_sentence_length",
    "confidence_trend",
    "detect_interruptions",
    "analyze_transcript",
]
