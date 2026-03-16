"""
Behavioral communication analysis utilities for interview transcripts.

This module provides lightweight, rule-based metrics that can be used
to assess communication patterns such as hesitation, filler usage,
sentence structure and interruptions.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List
import math
import re


# Basic normalisation ---------------------------------------------------------

_WORD_RE = re.compile(r"\b\w+\b")
_SENTENCE_SPLIT_RE = re.compile(r"[.!?]+")
_ELLIPSIS_RE = re.compile(r"\.\.\.+")

_HESITATION_MARKERS = {"uh", "um"}
_FILLER_PHRASES = ["you know"]
_FILLER_SINGLE_WORDS = {"um", "uh", "basically", "like", "so"}


@dataclass
class FillerAnalysis:
    """Structured result for filler word detection."""

    count: int
    words: List[str]

    def to_dict(self) -> Dict[str, object]:
        """Return a plain-`dict` representation suitable for JSON."""
        return {"count": self.count, "words": list(self.words)}


def _normalize_text(transcript: str) -> str:
    """Normalize transcript for simple text processing."""
    return transcript.lower().strip()


def _tokenize_words(transcript: str) -> List[str]:
    """Tokenize transcript into word tokens (lower-cased)."""
    text = _normalize_text(transcript)
    return _WORD_RE.findall(text)


def _split_sentences(transcript: str) -> List[str]:
    """
    Split transcript into sentence-like chunks.

    Uses punctuation (., !, ?) as delimiters and strips whitespace.
    Empty segments are removed.
    """
    segments = _SENTENCE_SPLIT_RE.split(transcript)
    return [s.strip() for s in segments if s.strip()]


# Public metric functions -----------------------------------------------------

def hesitation_rate(transcript: str) -> float:
    """
    Calculate hesitation rate as a percentage of total words.

    Hesitation markers currently include "uh", "um" and explicit ellipses ("...").
    The returned value is a float in the range \[0, 100].
    """
    if not transcript or not transcript.strip():
        return 0.0

    text = _normalize_text(transcript)
    words = _tokenize_words(text)
    if not words:
        return 0.0

    # Count explicit hesitation words.
    hesitation_word_count = sum(1 for w in words if w in _HESITATION_MARKERS)

    # Count ellipsis occurrences as additional hesitations.
    ellipsis_count = len(_ELLIPSIS_RE.findall(text))

    total_hesitations = hesitation_word_count + ellipsis_count
    rate = (total_hesitations / len(words)) * 100.0
    return float(rate)


def detect_filler_words(transcript: str) -> Dict[str, object]:
    """
    Detect and count filler words within the transcript.

    Filler lexicon:
    - Single words: "um", "uh", "basically", "like", "so"
    - Multi-word phrases: "you know"

    Returns a dictionary:
    {
        "count": int,           # total number of filler occurrences
        "words": list[str],     # filler tokens/phrases in order of appearance
    }
    """
    if not transcript or not transcript.strip():
        return {"count": 0, "words": []}

    text = _normalize_text(transcript)
    words = _tokenize_words(text)
    fillers: List[str] = []

    # Detect multi-word filler phrases first using a sliding window over words.
    # We also detect them via simple substring search for robustness.
    for phrase in _FILLER_PHRASES:
        # Count phrase occurrences based on word boundaries to avoid overlaps
        phrase_pattern = re.compile(r"\b" + re.escape(phrase) + r"\b")
        matches = list(phrase_pattern.finditer(text))
        fillers.extend([phrase] * len(matches))

    # Detect single-word fillers.
    for w in words:
        if w in _FILLER_SINGLE_WORDS:
            fillers.append(w)

    analysis = FillerAnalysis(count=len(fillers), words=fillers)
    return analysis.to_dict()


def average_sentence_length(transcript: str) -> float:
    """
    Calculate the average sentence length in words.

    Sentences are split on ".", "!" and "?" characters. The metric is defined as:

        average_length = total_word_count / max(sentence_count, 1)

    Returns 0.0 when the transcript is empty or contains no detectable words.
    """
    if not transcript or not transcript.strip():
        return 0.0

    sentences = _split_sentences(transcript)
    if not sentences:
        return 0.0

    total_words = 0
    for s in sentences:
        total_words += len(_tokenize_words(s))

    if total_words == 0:
        return 0.0

    avg = total_words / len(sentences)
    return float(avg)


def confidence_trend(transcript: str) -> int:
    """
    Compute a heuristic confidence score between 0 and 100.

    Heuristics:
    - Fewer filler words → higher confidence
    - Longer, more structured sentences (up to a point) → higher confidence
    - Lower hesitation rate → higher confidence

    The scoring is intentionally simple and interpretable, not statistically
    calibrated. It is meant for relative comparisons across transcripts.
    """
    if not transcript or not transcript.strip():
        return 0

    # Get component metrics.
    h_rate = hesitation_rate(transcript)  # percentage
    filler = detect_filler_words(transcript)
    filler_count = int(filler["count"])
    avg_len = average_sentence_length(transcript)

    # Sub-score 1: hesitation (0–40). 0% → 40, 20%+ → 0, linear in between.
    hesitation_score = 40.0 * max(0.0, 1.0 - min(h_rate, 20.0) / 20.0)

    # Sub-score 2: filler usage (0–30). 0 → 30, 20+ → 0, logarithmic decay.
    if filler_count <= 0:
        filler_score = 30.0
    else:
        # More sensitive to the first few fillers, then flattens.
        filler_score = 30.0 * max(0.0, 1.0 - math.log1p(filler_count) / math.log1p(20.0))

    # Sub-score 3: sentence structure via average length (0–30).
    # Around 12–20 words is considered strong; much shorter/longer reduces score.
    if avg_len <= 4:
        structure_score = 5.0
    elif avg_len <= 12:
        # Scale from 5 to 25 between 4 and 12
        structure_score = 5.0 + (avg_len - 4) / 8.0 * 20.0
    elif avg_len <= 20:
        # Scale from 25 to 30 between 12 and 20
        structure_score = 25.0 + (avg_len - 12) / 8.0 * 5.0
    else:
        # Penalize very long, possibly rambling sentences.
        structure_score = max(0.0, 30.0 - (avg_len - 20) * 2.0)

    total = hesitation_score + filler_score + structure_score
    # Clamp to \[0, 100] and round to nearest integer for a stable score.
    total_clamped = int(round(max(0.0, min(100.0, total))))
    return total_clamped


def detect_interruptions(transcript: str) -> int:
    """
    Detect likely interruptions, incomplete sentences, or abrupt stops.

    This is a heuristic, rule-based detector using cues such as:
    - sentences ending with explicit ellipses ("...")
    - very short trailing fragments after a long sentence
    - unfinished clauses where the final "sentence" has no closing punctuation

    Returns the estimated number of interruptions (non-negative integer).
    """
    if not transcript or not transcript.strip():
        return 0

    text = transcript.strip()
    sentences = _split_sentences(text)

    if not sentences:
        return 0

    interruptions = 0

    # 1) Ellipsis-based interruptions ("I was thinking that..." → interruption).
    interruptions += len(_ELLIPSIS_RE.findall(text))

    # 2) Short trailing fragment after at least one longer sentence.
    if len(sentences) >= 2:
        lengths = [len(_tokenize_words(s)) for s in sentences]
        avg_len = sum(lengths[:-1]) / max(1, len(lengths) - 1)
        last_len = lengths[-1]
        if avg_len >= 8 and last_len <= max(3, avg_len / 3):
            interruptions += 1

    # 3) Trailing text without terminating punctuation that does not look complete.
    if text[-1] not in ".!?":
        last_segment = sentences[-1]
        if len(_tokenize_words(last_segment)) <= 5:
            interruptions += 1

    return max(0, interruptions)


def analyze_transcript(transcript: str) -> Dict[str, object]:
    """
    Run a complete behavioral communication analysis on a transcript.

    Returns a dictionary in the format:
    {
        "hesitation_rate": float,
        "filler_word_count": int,
        "average_sentence_length": float,
        "confidence_score": int,
        "interruptions": int,
    }
    """
    h_rate = hesitation_rate(transcript)
    filler = detect_filler_words(transcript)
    avg_len = average_sentence_length(transcript)
    confidence = confidence_trend(transcript)
    interruptions = detect_interruptions(transcript)

    return {
        "hesitation_rate": float(h_rate),
        "filler_word_count": int(filler.get("count", 0)),
        "average_sentence_length": float(avg_len),
        "confidence_score": int(confidence),
        "interruptions": int(interruptions),
    }


__all__ = [
    "hesitation_rate",
    "detect_filler_words",
    "average_sentence_length",
    "confidence_trend",
    "detect_interruptions",
    "analyze_transcript",
]

