import json
from report_generator import generate_interview_report
from datetime import datetime

data = {
    "candidate_name": "Asif Khan",
    "interview_date": datetime.utcnow().isoformat(),
    "summary": "The candidate demonstrated excellent communication skills and deep technical knowledge. They handled edge cases well and maintained high confidence.",
    "rating": 8.5,
    "should_hire": True,
    "interpretation": "- Great technical vocabulary\n- Could improve pacing slightly\n- Excellent structured thinking",
    "score_breakdown": {
        "total_score": 88.5,
        "breakdown": {
            "content_quality": 90.0,
            "communication_clarity": 85.0,
            "behavioral_analysis": 92.0,
            "confidence_trend": 87.0
        },
        "face_penalty": {
            "penalty": 5.0,
            "reasons": ["No face detected during Question 2"]
        }
    },
    "face_stats": {
        "totalChecks": 120,
        "noFaceCount": 10,
        "multipleFaceCount": 0
    },
    "difficulty_progression": [
        {"question_number": 1, "difficulty_level": 3, "candidate_score": 8.0},
        {"question_number": 2, "difficulty_level": 4, "candidate_score": 7.5},
        {"question_number": 3, "difficulty_level": 5, "candidate_score": 9.0}
    ],
    "transcript": [
        {
            "question": "Explain closures in JavaScript.",
            "answer": "A closure is a function having access to the parent scope, even after the parent function has closed.",
            "score": 9.0,
            "analysis": {
                "hesitation_rate": 2.5,
                "filler_word_count": 1,
                "average_sentence_length": 15.0,
                "confidence_score": 90,
                "interruptions": 0,
                "vocabulary_richness": 0.85,
                "response_coherence": 0.95,
                "hedging_count": 0,
                "is_substantive": True
            }
        },
        {
            "question": "What is the event loop?",
            "answer": "I think it basically handles asynchronous operations in Node.js.",
            "score": 7.5,
            "analysis": {
                "hesitation_rate": 5.0,
                "filler_word_count": 2,
                "average_sentence_length": 10.0,
                "confidence_score": 75,
                "interruptions": 0,
                "vocabulary_richness": 0.60,
                "response_coherence": 0.80,
                "hedging_count": 1,
                "is_substantive": True
            }
        }
    ]
}

generate_interview_report(data, "test_aletheiax_report.pdf")
print("PDF generated successfully!")
