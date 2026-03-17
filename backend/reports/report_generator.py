"""
PDF-based AletheiaX interview report generation utilities.

Generates a professional, beautifully styled PDF report including:
- Candidate & interview metadata
- Summary & verdict
- Score breakdown (content quality, communication, behavioral, confidence)
- Face detection results & penalties
- Per-question Q&A with scores
- Behavioral communication metrics table
- Additional metrics table (vocabulary, coherence, hedging)
- Confidence trend & Difficulty progression charts
- Radar chart for score breakdown

Dependencies: reportlab, matplotlib 
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional
import io
import math

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
    KeepTogether,
)

# AletheiaX Brand Colors
BRAND_PRIMARY = colors.HexColor("#4f46e5")    # Indigo 600
BRAND_SECONDARY = colors.HexColor("#7c3aed")  # Violet 600
TEXT_MAIN = colors.HexColor("#1e293b")        # Slate 800
TEXT_MUTED = colors.HexColor("#64748b")       # Slate 500
BG_LIGHT = colors.HexColor("#f8fafc")         # Slate 50
BORDER_COLOR = colors.HexColor("#e2e8f0")     # Slate 200
SUCCESS_COLOR = colors.HexColor("#10b981")    # Emerald 500
DANGER_COLOR = colors.HexColor("#ef4444")     # Red 500
WARNING_COLOR = colors.HexColor("#f59e0b")    # Amber 500

LOGO_PATH = os.path.join(os.path.dirname(__file__), "aletheiax_logo.png")


@dataclass
class DifficultyProgressionEntry:
    question_number: int
    difficulty_level: int
    candidate_score: Optional[float] = None


@dataclass
class QuestionEntry:
    question: str
    answer: str
    score: Optional[float] = None
    analysis: Optional[Dict[str, Any]] = None


@dataclass
class InterviewSessionData:
    candidate_name: str
    interview_date: datetime
    questions: List[QuestionEntry]
    summary: str = ""
    rating: Optional[float] = None
    should_hire: Optional[bool] = None
    interpretation: str = ""
    score_breakdown: Optional[Dict[str, Any]] = None
    face_stats: Optional[Dict[str, Any]] = None
    difficulty_progression: List[DifficultyProgressionEntry] = None


def _normalize_session_data(session_data: Dict[str, Any]) -> InterviewSessionData:
    candidate_name = session_data.get("candidate_name") or "Unknown Candidate"

    raw_date = session_data.get("interview_date") or session_data.get("createdAt")
    if isinstance(raw_date, datetime):
        interview_date = raw_date
    else:
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

    difficulty_progression_raw = session_data.get("difficulty_progression") or []
    difficulty_progression = []
    for dp in difficulty_progression_raw:
        difficulty_progression.append(
            DifficultyProgressionEntry(
                question_number=dp.get("question_number", 0),
                difficulty_level=dp.get("difficulty_level", 2),
                candidate_score=dp.get("candidate_score")
            )
        )

    return InterviewSessionData(
        candidate_name=str(candidate_name),
        interview_date=interview_date,
        questions=questions,
        summary=str(session_data.get("summary") or ""),
        rating=float(session_data.get("rating")) if session_data.get("rating") is not None else None,
        should_hire=session_data.get("should_hire") if "should_hire" in session_data else session_data.get("shouldHire"),
        interpretation=str(session_data.get("interpretation") or ""),
        score_breakdown=session_data.get("score_breakdown"),
        face_stats=session_data.get("face_stats"),
        difficulty_progression=difficulty_progression,
    )


def draw_header_footer(canvas, doc):
    canvas.saveState()

    page_width, page_height = A4

    # --- Header Banner ---
    canvas.setFillColor(BRAND_PRIMARY)
    canvas.rect(0, page_height - 2.5 * cm, page_width, 2.5 * cm, fill=1, stroke=0)

    if os.path.exists(LOGO_PATH):
        try:
            canvas.drawImage(LOGO_PATH, 1.5 * cm, page_height - 2.1 * cm, width=1.4 * cm, height=1.4 * cm, mask="auto")
            canvas.setFillColor(colors.white)
            canvas.setFont("Helvetica-Bold", 18)
            canvas.drawString(3.3 * cm, page_height - 1.6 * cm, "AletheiaX")
            canvas.setFont("Helvetica", 10)
            canvas.setFillColor(colors.HexColor("#e0e7ff"))
            canvas.drawString(3.3 * cm, page_height - 2.0 * cm, "AI Interview Intelligence")
        except Exception:
            _draw_text_logo(canvas, page_height)
    else:
        _draw_text_logo(canvas, page_height)

    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 14)
    canvas.drawRightString(page_width - 2 * cm, page_height - 1.6 * cm, "Evaluation Report")

    # --- Footer Banner ---
    canvas.setFillColor(BG_LIGHT)
    canvas.rect(0, 0, page_width, 1.5 * cm, fill=1, stroke=0)
    canvas.setStrokeColor(BORDER_COLOR)
    canvas.line(0, 1.5 * cm, page_width, 1.5 * cm)

    canvas.setFillColor(TEXT_MUTED)
    canvas.setFont("Helvetica", 9)
    canvas.drawString(2 * cm, 0.7 * cm, f"Generated automatically by AletheiaX • {datetime.utcnow().strftime('%Y-%m-%d')}")
    canvas.drawRightString(page_width - 2 * cm, 0.7 * cm, f"Page {doc.page}")

    canvas.restoreState()


def _draw_text_logo(canvas, page_height):
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 18)
    canvas.drawString(2 * cm, page_height - 1.6 * cm, "AletheiaX")
    canvas.setFont("Helvetica", 10)
    canvas.setFillColor(colors.HexColor("#e0e7ff"))
    canvas.drawString(2 * cm, page_height - 2.0 * cm, "AI Interview Intelligence")


def _generate_radar_chart(breakdown: dict) -> Optional[Image]:
    """Generates a radar chart of the score breakdown categories."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import numpy as np

        categories = ['Content\nQuality', 'Communication', 'Behavioral', 'Confidence']
        scores = [
            breakdown.get('content_quality', 0),
            breakdown.get('communication_clarity', 0),
            breakdown.get('behavioral_analysis', 0),
            breakdown.get('confidence_trend', 0)
        ]

        N = len(categories)
        angles = [n / float(N) * 2 * np.pi for n in range(N)]
        scores += scores[:1]
        angles += angles[:1]

        fig, ax = plt.subplots(figsize=(4, 4), subplot_kw=dict(polar=True))
        ax.set_theta_offset(np.pi / 2)
        ax.set_theta_direction(-1)

        ax.set_xticks(angles[:-1])
        ax.set_xticklabels(categories, color="#1e293b", size=9, fontweight='bold')
        
        ax.set_rlabel_position(0)
        ax.set_yticks([25, 50, 75, 100])
        ax.set_yticklabels(["25", "50", "75", "100"], color="#64748b", size=7)
        ax.set_ylim(0, 100)

        ax.plot(angles, scores, linewidth=2, linestyle='solid', color="#4f46e5")
        ax.fill(angles, scores, color="#4f46e5", alpha=0.25)
        
        # Subtle grid
        ax.grid(color="#cbd5e1", linestyle="--", linewidth=0.5)
        ax.spines['polar'].set_color("#cbd5e1")

        img_buffer = io.BytesIO()
        plt.tight_layout()
        fig.savefig(img_buffer, format="png", dpi=150, transparent=True)
        plt.close(fig)
        img_buffer.seek(0)

        return Image(img_buffer, width=8*cm, height=8*cm)
    except Exception as e:
        print(f"Radar chart failed: {e}")
        return None


def _generate_line_charts(session: InterviewSessionData) -> Optional[Image]:
    """Generates a combined figure for Confidence Trend and Difficulty Progression."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt

        has_confidence = any((q.analysis or {}).get("confidence_score") for q in session.questions)
        has_difficulty = len(session.difficulty_progression) > 0

        if not has_confidence and not has_difficulty:
            return None

        # Determine subplots layout
        num_subplots = sum([int(has_confidence), int(has_difficulty)])
        fig, axes = plt.subplots(num_subplots, 1, figsize=(7, 2.8 * num_subplots))
        if num_subplots == 1:
            axes = [axes]
        
        ax_idx = 0

        if has_confidence:
            ax = axes[ax_idx]
            q_nums = []
            scores = []
            for idx, q in enumerate(session.questions):
                c_score = (q.analysis or {}).get("confidence_score")
                if c_score is not None and c_score > 0:
                    q_nums.append(idx + 1)
                    scores.append(float(c_score))
            
            if q_nums:
                ax.plot(q_nums, scores, marker="o", color="#4f46e5", linewidth=2, markersize=6)
                ax.fill_between(q_nums, scores, alpha=0.15, color="#4f46e5")
                ax.set_title("AletheiaX Confidence Trajectory", fontsize=11, fontweight="bold", color="#1e293b")
                ax.set_xlabel("Question Number", fontsize=9, color="#64748b")
                ax.set_ylabel("Confidence Score", fontsize=9, color="#64748b")
                ax.set_ylim(0, 100)
                ax_idx += 1

        if has_difficulty:
            ax = axes[ax_idx]
            q_nums = [dp.question_number for dp in session.difficulty_progression]
            diffs = [dp.difficulty_level for dp in session.difficulty_progression]
            
            if q_nums:
                ax.step(q_nums, diffs, where='mid', color="#f59e0b", linewidth=2.5, marker="s")
                ax.fill_between(q_nums, diffs, step="mid", alpha=0.15, color="#f59e0b")
                ax.set_title("Adaptive Difficulty Progression", fontsize=11, fontweight="bold", color="#1e293b")
                ax.set_xlabel("Question Number", fontsize=9, color="#64748b")
                ax.set_ylabel("Difficulty Level", fontsize=9, color="#64748b")
                ax.set_ylim(0.5, 5.5)
                ax.set_yticks([1, 2, 3, 4, 5])

        for ax in axes:
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color("#e2e8f0")
            ax.spines['bottom'].set_color("#e2e8f0")
            ax.grid(True, linestyle="--", linewidth=0.5, alpha=0.5, color="#e2e8f0")

        img_buffer = io.BytesIO()
        plt.tight_layout()
        fig.savefig(img_buffer, format="png", dpi=120, transparent=True)
        plt.close(fig)
        img_buffer.seek(0)
        
        return Image(img_buffer, width=15 * cm, height=(6 * num_subplots) * cm)
    except Exception as e:
        print(f"Line charts failed: {e}")
        return None

def _build_document_elements(session: InterviewSessionData) -> List[Any]:
    styles = getSampleStyleSheet()
    
    heading_style = ParagraphStyle(
        "AletheiaXHeading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=14,
        textColor=TEXT_MAIN,
        spaceAfter=10,
        spaceBefore=15,
        borderPadding=(0, 0, 4, 0),
        borderColor=BRAND_PRIMARY,
        borderWidth=1,
    )
    
    heading3_style = ParagraphStyle(
        "AletheiaXHeading3",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=TEXT_MAIN,
        spaceAfter=6,
        spaceBefore=10,
    )
    
    normal_style = ParagraphStyle(
        "AletheiaXBody",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10,
        textColor=TEXT_MAIN,
        spaceBefore=4,
        spaceAfter=4,
        leading=15,
    )

    elements: List[Any] = []

    # ── Candidate Overview Card ──────────────────────────────────────────────
    verdict = "Hire" if session.should_hire is True else ("No Hire" if session.should_hire is False else "Pending Verification")
    verdict_color = SUCCESS_COLOR if session.should_hire is True else (DANGER_COLOR if session.should_hire is False else TEXT_MUTED)
    rating_text = f"{session.rating:.1f} / 10" if session.rating is not None else "N/A"

    meta_label_style = ParagraphStyle("", parent=normal_style, textColor=TEXT_MUTED, fontSize=9, fontName="Helvetica-Bold", spaceAfter=0)
    meta_value_style = ParagraphStyle("", parent=normal_style, fontSize=11, fontName="Helvetica", spaceBefore=0, spaceAfter=8)

    meta_table_data = [
        [
            [Paragraph("CANDIDATE NAME", meta_label_style), Paragraph(session.candidate_name, meta_value_style)],
            [Paragraph("INTERVIEW DATE", meta_label_style), Paragraph(session.interview_date.strftime('%B %d, %Y - %H:%M UTC'), meta_value_style)],
        ],
        [
            [Paragraph("OVERALL RATING", meta_label_style), Paragraph(f"<b>{rating_text}</b>", meta_value_style)],
            [
                Paragraph("RECOMMENDATION", meta_label_style), 
                Paragraph(f"<font color='{verdict_color.hexval()}'><b>{verdict}</b></font>", meta_value_style)
            ],
        ]
    ]

    meta_table = Table(meta_table_data, colWidths=[8.5 * cm, 8.5 * cm])
    meta_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), BG_LIGHT),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (-1, -1), 15),
            ("RIGHTPADDING", (0, 0), (-1, -1), 15),
        ])
    )
    elements.append(meta_table)

    # ── Summary & Observations ─────────────────────────────────────────────
    if session.summary:
        elements.append(Paragraph("Executive Summary", heading_style))
        elements.append(Paragraph(session.summary, normal_style))

    if session.interpretation:
        elements.append(Paragraph("Key Observations", heading3_style))
        for line in session.interpretation.split("\n"):
            line = line.strip()
            if line:
                if line.startswith("-") or line.startswith("•"):
                    line = line[1:].strip()
                elements.append(Paragraph(f"<font color='{BRAND_PRIMARY.hexval()}'>•</font> {line}", normal_style))

    c_score_style = ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=10, alignment=1)

    # ── Score Breakdown & Radar Chart ───────────────────────────────────────
    if session.score_breakdown:
        elements.append(Paragraph("AletheiaX Score Analysis", heading_style))
        sb = session.score_breakdown
        breakdown = sb.get("breakdown", {})
        total_score = sb.get("total_score", 0)
        
        elements.append(
            Paragraph(
                f"<b>Total Evaluated Score: {total_score:.1f} / 100</b>",
                ParagraphStyle("TotalScore", parent=normal_style, fontSize=14, textColor=BRAND_PRIMARY, spaceAfter=8),
            )
        )

        score_table_data = [
            [
                Paragraph("<b>Evaluation Category</b>", ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=10)),
                Paragraph("<b>Score</b>", c_score_style),
                Paragraph("<b>Weight</b>", c_score_style),
            ]
        ]
        categories = [
            ("Content Quality (Technical)", breakdown.get("content_quality", 0), "40%"),
            ("Communication Clarity", breakdown.get("communication_clarity", 0), "25%"),
            ("Behavioral Analysis", breakdown.get("behavioral_analysis", 0), "25%"),
            ("Confidence Trend", breakdown.get("confidence_trend", 0), "10%"),
        ]
        for name, score, weight in categories:
            score_table_data.append([
                Paragraph(name, normal_style),
                Paragraph(f"<b>{score:.1f}</b>", ParagraphStyle("", parent=normal_style, alignment=1)),
                Paragraph(weight, ParagraphStyle("", parent=normal_style, alignment=1, textColor=TEXT_MUTED))
            ])

        score_table = Table(score_table_data, colWidths=[6 * cm, 3 * cm, 3 * cm], repeatRows=1)
        score_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), BRAND_PRIMARY),
                ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ])
        )

        radar_chart = _generate_radar_chart(breakdown)
        if radar_chart:
            # Layout table and chart side by side
            layout_data = [[score_table, radar_chart]]
            layout_table = Table(layout_data, colWidths=[12.5*cm, 4.5*cm])
            layout_table.setStyle(TableStyle([("VALIGN", (0,0), (-1,-1), "MIDDLE")]))
            elements.append(layout_table)
        else:
            elements.append(score_table)
            elements.append(Spacer(1, 0.5 * cm))

        # Face Penalty
        face_penalty = sb.get("face_penalty")
        if face_penalty and face_penalty.get("penalty", 0) > 0:
            penalty_box = [
                [Paragraph(f"<b><font color='{DANGER_COLOR.hexval()}'>⚠️ Integrity Penalty Applied: -{face_penalty['penalty']:.1f}%</font></b>", normal_style)]
            ]
            for reason in face_penalty.get("reasons", []):
                penalty_box.append([Paragraph(f"• {reason}", normal_style)])
            
            p_table = Table(penalty_box, colWidths=[17 * cm])
            p_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#fef2f2")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#fecaca")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
            ]))
            elements.append(Spacer(1, 0.5 * cm))
            elements.append(p_table)

    # ── Face Stats ──────────────────────────────────────────────────────────
    if session.face_stats:
        fs = session.face_stats
        total = fs.get("totalChecks", 0)
        if total > 0:
            elements.append(Paragraph("Candidate Integrity & Presence", heading3_style))

            no_face = fs.get("noFaceCount", 0)
            multi_face = fs.get("multipleFaceCount", 0)
            ok_count = total - no_face - multi_face

            face_data = [
                [
                    Paragraph("<b>Presense Metric</b>", ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=9)), 
                    Paragraph("<b>Count</b>", ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=9, alignment=1)), 
                    Paragraph("<b>Rate</b>", ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=9, alignment=1))
                ],
                ["Face OK (1 candidate)", str(ok_count), f"{ok_count/total*100:.0f}%"],
                ["No Face Detected", str(no_face), f"{no_face/total*100:.0f}%"],
                ["Multiple Faces Visible", str(multi_face), f"{multi_face/total*100:.0f}%"],
            ]
            face_table = Table(face_data, colWidths=[9 * cm, 4 * cm, 4 * cm], repeatRows=1)
            face_table.setStyle(
                TableStyle([
                    ("BACKGROUND", (0, 0), (-1, 0), BRAND_SECONDARY),
                    ("ALIGN", (1, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ])
            )
            elements.append(face_table)

    elements.append(Spacer(1, 1 * cm))

    # ── Q&A Table ───────────────────────────────────────────────────────────
    header_style = ParagraphStyle("", textColor=colors.white, fontName="Helvetica-Bold", fontSize=9)
    elements.append(KeepTogether([
        Paragraph("Interview Transcript", heading_style),
        Paragraph("Full transcript and scoring breakdown per question.", ParagraphStyle("", parent=normal_style, textColor=TEXT_MUTED, fontStyle="italic")),
        Spacer(1, 0.2 * cm)
    ]))

    qa_table_data = [
        [
            Paragraph("<b>#</b>", header_style),
            Paragraph("<b>Question</b>", header_style),
            Paragraph("<b>Answer</b>", header_style),
            Paragraph("<b>Score</b>", header_style),
        ]
    ]

    for idx, q in enumerate(session.questions, start=1):
        qa_table_data.append([
            str(idx),
            Paragraph(q.question, normal_style),
            Paragraph(q.answer or "<i>(No answer provided)</i>", normal_style),
            Paragraph(f"<b>{q.score:.1f}</b>", ParagraphStyle("", parent=normal_style, alignment=1, textColor=BRAND_PRIMARY)) if q.score is not None else "-",
        ])

    qa_table = Table(
        qa_table_data,
        colWidths=[1.0 * cm, 6.0 * cm, 8.0 * cm, 2.0 * cm],
        repeatRows=1,
    )
    qa_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), TEXT_MAIN),
            ("ALIGN", (0, 0), (0, -1), "CENTER"),
            ("ALIGN", (3, 0), (3, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(qa_table)

    # ── Behavioral Analysis ─────────────────────────────────────────────────
    elements.append(KeepTogether([
        Spacer(1, 1 * cm),
        Paragraph("Deep Behavioral Analysis", heading_style),
        Paragraph("Metrics calculated using NLP and linguistic pattern analysis on the speech-to-text output.", ParagraphStyle("", parent=normal_style, textColor=TEXT_MUTED, fontStyle="italic")),
        Spacer(1, 0.2 * cm)
    ]))

    beh_table_data = [
        [
            Paragraph("<b>#</b>", header_style),
            Paragraph("<b>Hesitation</b>", header_style),
            Paragraph("<b>Fillers</b>", header_style),
            Paragraph("<b>Coherence</b>", header_style),
            Paragraph("<b>Vocab Rich</b>", header_style),
            Paragraph("<b>Hedging</b>", header_style),
            Paragraph("<b>Confidence</b>", header_style),
        ]
    ]

    for idx, q in enumerate(session.questions, start=1):
        a = q.analysis or {}
        is_sub = a.get("is_substantive", True)
        if not is_sub:
            beh_table_data.append([str(idx), "-", "-", "-", "-", "-", "-"])
        else:
            beh_table_data.append([
                str(idx),
                f"{a.get('hesitation_rate', 0):.1f}%",
                str(a.get("filler_word_count", 0)),
                f"{(a.get('response_coherence', 0) * 100):.0f}%",
                f"{(a.get('vocabulary_richness', 0) * 100):.0f}%",
                str(a.get("hedging_count", 0)),
                Paragraph(f"<b>{int(a.get('confidence_score', 0))}</b>", ParagraphStyle("", textColor=BRAND_PRIMARY, alignment=1)),
            ])

    beh_table = Table(
        beh_table_data,
        colWidths=[1.0 * cm, 2.5 * cm, 2.0 * cm, 2.8 * cm, 2.8 * cm, 2.5 * cm, 3.4 * cm],
        repeatRows=1,
    )
    beh_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), BRAND_SECONDARY),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ("BOX", (0, 0), (-1, -1), 1, BORDER_COLOR),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_LIGHT]),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ])
    )
    elements.append(beh_table)

    # ── Line Charts (Confidence & Difficulty) ───────────────────────────────
    charts_image = _generate_line_charts(session)
    if charts_image:
        elements.append(KeepTogether([
            Spacer(1, 1 * cm),
            Paragraph("Session Progression Analytics", heading_style),
            Spacer(1, 0.2 * cm),
            charts_image
        ]))

    return elements


def generate_interview_report(session_data: Dict[str, Any], output_path: str) -> str:
    session = _normalize_session_data(session_data)

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=1.5 * cm,
        leftMargin=1.5 * cm,
        topMargin=3.5 * cm,     
        bottomMargin=2.5 * cm,  
        title=f"AletheiaX Interview Report - {session.candidate_name}",
        author="AletheiaX AI",
    )

    elements = _build_document_elements(session)
    doc.build(elements, onFirstPage=draw_header_footer, onLaterPages=draw_header_footer)

    return output_path


__all__ = [
    "generate_interview_report",
    "InterviewSessionData",
    "QuestionEntry",
]


def _main(argv: List[str]) -> int:
    import json
    import sys
    import traceback

    try:
        if len(argv) < 3:
            print("Usage: report_generator.py '<session_data_json>' '<output_path>'", file=sys.stderr)
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
