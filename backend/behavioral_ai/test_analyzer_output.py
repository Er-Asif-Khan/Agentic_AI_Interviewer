import json
import sys
import os

import sys
import os

from analyzer import analyze_transcript

test_cases = [
    {
        "name": "1. Perfect, Fluent Answer",
        "question": "What is your experience with React?",
        "transcript": "I have extensive experience with React. I designed and built several enterprise applications using functional components and hooks. My approach was always focused on performance and clean architecture. I am confident in my ability to deliver high-quality code."
    },
    {
        "name": "2. High Hesitation & Interruptions",
        "question": "Can you explain closures?",
        "transcript": "I I think that closures are... well when a function... A closure is when a function remembers its outer scope. I was going to- but basically it's about lexical scoping."
    },
    {
        "name": "3. Heavy Filler Usage",
        "question": "Describe your workflow.",
        "transcript": "So basically I like start by actually looking at the requirements, right? And literally like I just sort of kind of sketch it out. You know what I mean? It's basically like that."
    },
    {
        "name": "4. Heavy Hedging / Uncertain Language",
        "question": "How do you handle conflict?",
        "transcript": "I guess I would probably try to talk to them. I'm not sure, maybe I might be wrong but I suppose it's best to compromise. I feel like it depends on the situation somewhat."
    },
    {
        "name": "5. Empty / Non-Substantive Answer",
        "question": "Tell me about yourself.",
        "transcript": "(no answer provided)"
    }
]

print("="*60)
print("BEHAVIORAL METRICS EVALUATION TEST")
print("="*60)

for idx, tc in enumerate(test_cases, 1):
    print(f"\n[{tc['name']}]")
    print(f"Question: \"{tc['question']}\"")
    print(f"Transcript: \"{tc['transcript']}\"")
    print("-" * 40)
    
    result = analyze_transcript(tc["transcript"], tc["question"])
    
    if not result.get("is_substantive", True):
        print("Result: Detected as EMPTY or NON-SUBSTANTIVE. All metrics zeroed out.")
        for k, v in result.items():
            print(f"  - {k}: {v}")
    else:
        print(f"Substantive Response Detected")
        print(f"  Confidence Score: {result['confidence_score']}/100")
        print(f"  Hesitation Rate:  {result['hesitation_rate']}%")
        print(f"  Filler Words:     {result['filler_word_count']}")
        print(f"  Interruptions:    {result['interruptions']}")
        print(f"  Vocab Richness:   {result['vocabulary_richness']*100:.1f}%")
        print(f"  Coherence (Rel):  {result['response_coherence']*100:.1f}%")
        print(f"  Hedging Phrases:  {result['hedging_count']}")
        print(f"  Avg Sentence Len: {result['average_sentence_length']} words")

print("\n" + "="*60)
print("All tests completed successfully.")
