"""
PDF-based interview report generation utilities.

This module generates a downloadable PDF report for a completed interview
session, including:

- Candidate name
- Interview date
- Questions asked
- User answers
- Score per question
- Behavioral analysis metrics for each answer:
  - hesitation rate
  - filler words
  - average sentence length
  - confidence score
  - interruptions

Dependencies
------------
This module uses `reportlab` for PDF generation. Make sure it is installed:

    pip install reportlab
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
)


@dataclass
class QuestionEntry:
    """Represents a single question/answer pair with scoring and analysis."""

    question: str
    answer: str
    score: Optional[float] = None
    analysis: Optional[Dict[str, Any]] = None


@dataclass
class InterviewSessionData:
    """
    Normalized input data for report generation.

    This abstraction allows `generate_interview_report` to work with a simple,
    backend-agnostic data shape.
    """

    candidate_name: str
    interview_date: datetime
    questions: List[QuestionEntry]


def _normalize_session_data(session_data: Dict[str, Any]) -> InterviewSessionData:
    """
    Normalize raw `session_data` into `InterviewSessionData`.

    Expected minimal shape (keys are examples, not strict requirements):

    {
        "candidate_name": "Jane Doe",
        "interview_date": "2026-03-16T12:34:56Z" | timestamp | datetime,
        "transcript": [
            {
                "question": "...",
                "answer": "...",
                "score": 8.5,
                "analysis": {
                    "hesitation_rate": float,
                    "filler_word_count": int,
                    "average_sentence_length": float,
                    "confidence_score": int,
                    "interruptions": int,
                },
            },
            ...
        ],
    }
    """
    candidate_name = session_data.get("candidate_name") or "Unknown Candidate"

    raw_date = session_data.get("interview_date") or session_data.get("createdAt")
    interview_date: datetime
    if isinstance(raw_date, datetime):
        interview_date = raw_date
    else:
        # Try to parse ISO string or timestamp; fall back to now on failure
        try:
            if isinstance(raw_date, (int, float)):
                interview_date = datetime.fromtimestamp(raw_date)
            elif isinstance(raw_date, str):
                interview_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
            else:
                interview_date = datetime.utcnow()
        except Exception:
            interview_date = datetime.utcnow()

    transcript = session_data.get("transcript") or []
    questions: List[QuestionEntry] = []

    for entry in transcript:
        if not isinstance(entry, dict):
            continue

        question = entry.get("question") or entry.get("text") or ""
        answer = entry.get("answer") or ""
        score = entry.get("candidate_score")
        analysis = entry.get("analysis") or {}

        questions.append(
            QuestionEntry(
                question=str(question),
                answer=str(answer),
                score=float(score) if score is not None else None,
                analysis=analysis if isinstance(analysis, dict) else None,
            )
        )

    return InterviewSessionData(
        candidate_name=str(candidate_name),
        interview_date=interview_date,
        questions=questions,
    )


def _build_document_elements(session: InterviewSessionData) -> List[Any]:
    """
    Build platypus flowables for the report body.

    This function is the heart of the PDF layout: it takes the normalized
    interview session data (including per-question behavioral analysis) and
    renders:
    - Header with candidate + date
    - Q&A table
    - Behavioral analysis metrics table
    - Optional confidence trend chart (if data is available)
    """
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    normal_style = styles["BodyText"]

    # Slightly tighter body text.
    normal_style = ParagraphStyle(
        "BodyTextTight",
        parent=normal_style,
        spaceBefore=4,
        spaceAfter=4,
        leading=14,
    )

    elements: List[Any] = []

    # --- Header ---
    elements.append(Paragraph("Interview Evaluation Report", title_style))
    elements.append(Spacer(1, 0.5 * cm))

    meta_lines = [
        f"<b>Candidate:</b> {session.candidate_name}",
        f"<b>Interview Date:</b> {session.interview_date.strftime('%Y-%m-%d %H:%M %Z')}",
    ]
    for line in meta_lines:
        elements.append(Paragraph(line, normal_style))
    elements.append(Spacer(1, 0.8 * cm))

    # --- Questions & Answers Table ---
    elements.append(Paragraph("Per-Question Details", heading_style))
    elements.append(Spacer(1, 0.3 * cm))

    table_data: List[List[Any]] = [
        [
            Paragraph("<b>#</b>", normal_style),
            Paragraph("<b>Question</b>", normal_style),
            Paragraph("<b>Answer</b>", normal_style),
            Paragraph("<b>Score</b>", normal_style),
        ]
    ]

    for idx, q in enumerate(session.questions, start=1):
        table_data.append(
            [
                str(idx),
                Paragraph(q.question, normal_style),
                Paragraph(q.answer or "-", normal_style),
                f"{q.score:.1f}" if q.score is not None else "-",
            ]
        )

    qa_table = Table(
        table_data,
        colWidths=[1.0 * cm, 6.0 * cm, 7.0 * cm, 2.0 * cm],
        repeatRows=1,
    )
    qa_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(qa_table)
    elements.append(Spacer(1, 0.8 * cm))

    # --- Behavioral Analysis per Question ---
    elements.append(Paragraph("Behavioral Communication Analysis", heading_style))
    elements.append(Spacer(1, 0.3 * cm))

    beh_table_data: List[List[Any]] = [
        [
            Paragraph("<b>#</b>", normal_style),
            Paragraph("<b>Hesitation Rate (%)</b>", normal_style),
            Paragraph("<b>Filler Words</b>", normal_style),
            Paragraph("<b>Avg. Sentence Length</b>", normal_style),
            Paragraph("<b>Confidence Score</b>", normal_style),
            Paragraph("<b>Interruptions</b>", normal_style),
        ]
    ]

    for idx, q in enumerate(session.questions, start=1):
        a = q.analysis or {}
        beh_table_data.append(
            [
                str(idx),
                f"{a.get('hesitation_rate', 0):.1f}",
                str(a.get("filler_word_count", 0)),
                f"{a.get('average_sentence_length', 0):.1f}",
                str(a.get("confidence_score", 0)),
                str(a.get("interruptions", 0)),
            ]
        )

    beh_table = Table(
        beh_table_data,
        colWidths=[1.0 * cm, 3.0 * cm, 2.5 * cm, 3.0 * cm, 3.0 * cm, 2.5 * cm],
        repeatRows=1,
    )
    beh_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
                ("ALIGN", (0, 0), (0, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.grey),
            ]
        )
    )
    elements.append(beh_table)

    # --- Confidence trend chart (if confidence scores are available) ---
    try:
        confidence_scores = [
            (idx + 1, (q.analysis or {}).get("confidence_score"))
            for idx, q in enumerate(session.questions)
            if (q.analysis or {}).get("confidence_score") is not None
        ]

        if confidence_scores:
            import io

            import matplotlib.pyplot as plt

            question_numbers = [q for (q, _) in confidence_scores]
            scores = [float(s) for (_, s) in confidence_scores]

            fig, ax = plt.subplots(figsize=(6, 2.2))
            ax.plot(
                question_numbers,
                scores,
                marker="o",
                color="#6366f1",
                linewidth=2,
            )
            ax.set_title("Confidence Trend Across Interview")
            ax.set_xlabel("Question #")
            ax.set_ylabel("Confidence Score")
            ax.set_ylim(0, 100)
            ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.4)

            img_buffer = io.BytesIO()
            plt.tight_layout()
            fig.savefig(img_buffer, format="png")
            plt.close(fig)
            img_buffer.seek(0)

            elements.append(Spacer(1, 0.8 * cm))
            elements.append(
                Paragraph("Confidence Trend Across Interview", heading_style)
            )
            elements.append(Spacer(1, 0.3 * cm))

            chart_image = Image(img_buffer, width=14 * cm, height=5 * cm)
            elements.append(chart_image)
    except Exception:
        # Chart generation is best-effort; PDF creation should not fail
        # if matplotlib or plotting encounters an error.
        pass

    return elements


def generate_interview_report(session_data: Dict[str, Any], output_path: str) -> str:
    """
    Generate a PDF report for a given interview session.

    Parameters
    ----------
    session_data:
        Dictionary describing the completed interview session. At minimum,
        should contain:

        - candidate_name: str
        - interview_date: ISO string / timestamp / datetime (optional)
        - transcript: list of entries with:
          - question: str
          - answer: str
          - candidate_score: float (optional; used as "Score per Question")
          - analysis: dict with:
            - hesitation_rate: float
            - filler_word_count: int
            - average_sentence_length: float
            - confidence_score: int
            - interruptions: int

    output_path:
        Filesystem path where the generated PDF should be written.

    Returns
    -------
    str
        The `output_path` where the PDF was saved (for convenience).
    """
    session = _normalize_session_data(session_data)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title=f"Interview Report - {session.candidate_name}",
        author="AI Interviewer",
    )

    elements = _build_document_elements(session)
    doc.build(elements)

    return output_path


__all__ = [
    "generate_interview_report",
    "InterviewSessionData",
    "QuestionEntry",
]


def _main(argv: List[str]) -> int:
    """
    CLI entrypoint.

    Usage:
        python backend/reports/report_generator.py '<session_data_json>' '<output_path>'

    - session_data_json: JSON string
    - output_path: where to write the PDF
    """
    import json
    import sys
    import traceback

    try:
        if len(argv) < 3:
            print(
                "Usage: report_generator.py '<session_data_json>' '<output_path>'",
                file=sys.stderr,
            )
            return 2

        session_data_json = argv[1]
        output_path = argv[2]

        session_data = json.loads(session_data_json)
        generate_interview_report(session_data, output_path)
        return 0
    except Exception as exc:
        print(f"PDF generation failed: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return 1


if __name__ == "__main__":
    import sys

    raise SystemExit(_main(sys.argv))

