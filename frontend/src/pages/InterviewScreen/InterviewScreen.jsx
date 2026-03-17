import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./InterviewScreen.css";
import API from "../../config";
<<<<<<< HEAD
import { loadFaceDetectionModels, createFaceDetectionLoop } from "../../utils/faceDetection";
=======
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
>>>>>>> 2ebac79 (Added features)

// ─── Status constants ────────────────────────────────────────────────────────
const STATUS = {
  LOADING: "loading",
  COUNTDOWN: "countdown",
  IN_PROGRESS: "in-progress",
  PAUSED: "paused",
  EVALUATING: "evaluating",
  COMPLETED: "completed",
};

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const countKeywordHits = (text, keywords) => {
  if (!text) return 0;
  const t = String(text).toLowerCase();
  return keywords.reduce((acc, k) => (t.includes(k) ? acc + 1 : acc), 0);
};

const computeSkillRadar = (pairs) => {
  // Output values are 0..5 (inclusive) for an easy "5-dot" mental model.
  // We derive these from per-answer evaluation signals using lightweight heuristics.
  const axes = [
    {
      key: "communication",
      label: "Communication",
      pos: ["articulate", "communicat", "concise", "engaging", "well-spoken"],
      neg: ["rambl", "unclear", "verbose", "poorly", "confus"],
    },
    {
      key: "technical",
      label: "Technical knowledge",
      pos: ["accurate", "correct", "technical", "concept", "knowledge", "depth"],
      neg: ["incorrect", "wrong", "shallow", "misunderstand", "inaccurate"],
    },
    {
      key: "problem_solving",
      label: "Problem solving",
      pos: ["approach", "steps", "trade-off", "reason", "analysis", "logic"],
      neg: ["guess", "hand-wav", "no approach", "uncertain", "stuck"],
    },
    {
      key: "structure",
      label: "Clarity & structure",
      pos: ["clear", "structured", "organized", "well-structured", "coherent"],
      neg: ["disorganized", "unclear", "hard to follow", "scattered"],
    },
    {
      key: "confidence",
      label: "Confidence",
      pos: ["confident", "certain"],
      neg: ["not sure", "unsure", "uncertain", "hesitant"],
    },
  ];

  const safePairs = Array.isArray(pairs) ? pairs : [];
  if (safePairs.length === 0) {
    return { labels: axes.map(a => a.label), values: axes.map(() => 0) };
  }

  const totals = Object.fromEntries(axes.map(a => [a.key, 0]));

  for (const p of safePairs) {
    const evalObj = p?.evaluation || {};
    const score10 = typeof evalObj.score === "number" ? evalObj.score : 5;
    const base5 = clamp(score10 / 2, 0, 5);

    const feedbackBlob = [
      p?.question,
      p?.answer,
      evalObj.feedback,
      ...(evalObj.strengths || []),
      ...(evalObj.weak_areas || []),
    ].filter(Boolean).join(" | ");

    for (const axis of axes) {
      let v = base5;
      const posHits = countKeywordHits(feedbackBlob, axis.pos);
      const negHits = countKeywordHits(feedbackBlob, axis.neg);

      // Small nudges so the chart reflects themes without overpowering the base score.
      v += clamp(posHits - negHits, -2, 2) * 0.25;

      if (axis.key === "confidence") {
        const conf = typeof evalObj.confidence === "number" ? evalObj.confidence : clamp(score10 / 10, 0, 1);
        v = (v * 0.5) + (clamp(conf * 5, 0, 5) * 0.5);
      }

      totals[axis.key] += clamp(v, 0, 5);
    }
  }

  const values = axes.map(a => clamp(totals[a.key] / safePairs.length, 0, 5));
  return { labels: axes.map(a => a.label), values };
};

function RadarChart({ labels, values, max = 5, size = 260 }) {
  const n = labels.length;
  const padding = 34;
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - padding;

  const angleFor = (i) => ((Math.PI * 2) / n) * i - Math.PI / 2;
  const point = (radius, i) => {
    const a = angleFor(i);
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  };

  const ringLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const toPath = (pts) => pts.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") + " Z";
  const valuePoints = values.map((v, i) => point(r * clamp(v / max, 0, 1), i));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Interview skill radar chart">
      {/* Rings */}
      {ringLevels.map((lvl) => {
        const pts = Array.from({ length: n }, (_, i) => point(r * lvl, i));
        return (
          <path
            key={lvl}
            d={toPath(pts)}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="1"
          />
        );
      })}

      {/* Axes */}
      {Array.from({ length: n }, (_, i) => {
        const p = point(r, i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1"
          />
        );
      })}

      {/* Data polygon */}
      <path
        d={toPath(valuePoints)}
        fill="rgba(102,126,234,0.22)"
        stroke="rgba(102,126,234,0.95)"
        strokeWidth="2"
      />

      {/* Data points */}
      {valuePoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.2" fill="#667eea" stroke="rgba(0,0,0,0.35)" />
      ))}

      {/* Labels */}
      {labels.map((lab, i) => {
        const lp = point(r + 18, i);
        const anchor = lp.x < cx - 6 ? "end" : lp.x > cx + 6 ? "start" : "middle";
        return (
          <text
            key={lab}
            x={lp.x}
            y={lp.y}
            fill="rgba(255,255,255,0.85)"
            fontSize="11"
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {lab}
          </text>
        );
      })}
    </svg>
  );
}

export default function InterviewScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resumeContext: initResumeContext, role: initRole, interviewId: initInterviewId } = location.state || {};

  // ── UI state ────────────────────────────────────────────────────────────────
  const [status, setStatus] = useState(STATUS.LOADING);
  const [loadingMessage, setLoadingMessage] = useState("Loading interview...");
  const [countdown, setCountdown] = useState(null);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [interviewTime, setInterviewTime] = useState(0);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pauseMessage, setPauseMessage] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // ── Interview data ──────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [qaPairs, setQaPairs] = useState([]);          // [{question, answer, evaluation}]
  const [finalVerdict, setFinalVerdict] = useState(null);
  // Persisted evaluation from backend (includes transcript + score_breakdown + behavioral analysis)
  const [savedEvaluation, setSavedEvaluation] = useState(null);

  // ── Adaptive difficulty state ──────────────────────────────────────────────
  const MAX_QUESTIONS = 10;
  const [currentDifficulty, setCurrentDifficulty] = useState(2);
  const [difficultyProgression, setDifficultyProgression] = useState([]);
  const currentDifficultyRef = useRef(2);
  const difficultyProgressionRef = useRef([]);

  // ── Face detection state ───────────────────────────────────────────────────
  const [faceWarning, setFaceWarning] = useState(null); // null | "no_face" | "multiple_faces"
  const faceStatsRef = useRef({ totalChecks: 0, noFaceCount: 0, multipleFaceCount: 0 });
  const faceLoopRef = useRef(null);

  // ── Session meta (from Mock Interview setup) ─────────────────────────────────
  const [interviewId, setInterviewId] = useState(initInterviewId || null);
  const [resumeContext, setResumeContext] = useState(initResumeContext || "");
  const [jobRole, setJobRole] = useState(initRole || "");

  // ── Refs ────────────────────────────────────────────────────────────────────
  const candidateVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  const resultsRef = useRef(null);
  // Keep latest mutable values accessible inside callbacks without stale closures
  const qaPairsRef = useRef([]);
  const questionIndexRef = useRef(0);
  const questionsRef = useRef([]);
  const resumeContextRef = useRef("");
  const statusRef = useRef(STATUS.LOADING);
  const pauseMetaRef = useRef({ wasSpeaking: false, reason: "" });
  const isAudioOnRef = useRef(true);

  // ── Keep refs in sync ───────────────────────────────────────────────────────
  useEffect(() => { qaPairsRef.current = qaPairs; }, [qaPairs]);
  useEffect(() => { questionIndexRef.current = questionIndex; }, [questionIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { resumeContextRef.current = resumeContext; }, [resumeContext]);
  useEffect(() => { statusRef.current = status; }, [status]);
<<<<<<< HEAD
  useEffect(() => { currentDifficultyRef.current = currentDifficulty; }, [currentDifficulty]);
  useEffect(() => { difficultyProgressionRef.current = difficultyProgression; }, [difficultyProgression]);
=======
  useEffect(() => { isAudioOnRef.current = isAudioOn; }, [isAudioOn]);
>>>>>>> 2ebac79 (Added features)

  // ── Bootstrap the interview ─────────────────────────────────────────────────
  useEffect(() => {
    if (!initResumeContext || !initRole || !initInterviewId) {
      alert("Missing setup. Please start from the Mock Interview page.");
      navigate("/mock-interview");
      return;
    }
    initInterview();
    return () => {
      stopListening();
      stopCamera();
      window.speechSynthesis?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initResumeContext, initRole, initInterviewId]);

  const initInterview = async () => {
    try {
      const role = initRole;
      const rContext = initResumeContext;
      const iId = initInterviewId;

      setJobRole(role);
      setResumeContext(rContext);
      setInterviewId(iId);
      resumeContextRef.current = rContext;

      // Generate first question at default difficulty (Level 2)
      setLoadingMessage("AI is generating your first question...");
      const qRes = await API.post("/interviews/generate-questions", {
        resumeContext: rContext,
        role,
        difficultyLevel: 2,
        count: 1,
        previousQuestions: [],
      });
      const generatedQuestions = qRes.data.data.questions || [];
      if (generatedQuestions.length === 0) throw new Error("No questions generated");

      setQuestions(generatedQuestions);
      questionsRef.current = generatedQuestions;

      // Start countdown → begin interview
      setStatus(STATUS.COUNTDOWN);
      startCountdown(3, () => {
        startCamera();
        beginQuestion(generatedQuestions, 0, iId, rContext, role, null, null);
      });
    } catch (err) {
      console.error("Interview init failed:", err);
      alert(`Failed to start interview: ${err.message}. Please try again.`);
      navigate("/mock-interview");
    }
  };

  // ── Countdown ───────────────────────────────────────────────────────────────
  const startCountdown = (seconds, onComplete) => {
    setCountdown(seconds);
    let count = seconds;
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(interval);
        setCountdown(null);
        onComplete();
      }
    }, 1000);
  };

  // ── Ask a question ──────────────────────────────────────────────────────────
  const beginQuestion = (qs, index, iId, rCtx, role, candidateId, hrId) => {
    if (index >= qs.length || index >= MAX_QUESTIONS) {
      finishInterview(iId, rCtx, role, candidateId, hrId);
      return;
    }
    const question = qs[index];
    setCurrentQuestion(question);
    setQuestionIndex(index);
    questionIndexRef.current = index;
    setCurrentTranscript("");
    setStatus(STATUS.IN_PROGRESS);
    statusRef.current = STATUS.IN_PROGRESS;

    // Speak the question, then start listening
    speakText(question, () => {
      startListening();
    });
  };

  // ── Submit answer (triggered by button) ────────────────────────────────────
  const handleSubmitAnswer = async () => {
    stopListening();
    const answer = currentTranscript.trim() || "(no answer provided)";
    const question = questionsRef.current[questionIndexRef.current];
    const rCtx = resumeContextRef.current;
    const difficulty = currentDifficultyRef.current;

    setStatus(STATUS.EVALUATING);
    statusRef.current = STATUS.EVALUATING;
    setLoadingMessage("AI is evaluating your answer...");
    setCurrentTranscript("");

    // 1. Evaluate the answer (with current difficulty)
    let evaluation = null;
    let nextDifficulty = difficulty;
    try {
      const evalRes = await API.post("/interviews/evaluate-answer", {
        question,
        answer,
        resumeContext: rCtx,
        currentDifficulty: difficulty,
      });
      evaluation = evalRes.data.data;
      nextDifficulty = evaluation.nextDifficulty || difficulty;
    } catch (err) {
      console.warn("Evaluation failed, continuing:", err.message);
      evaluation = {
        score: 5,
        feedback: "Evaluation unavailable",
        strengths: [],
        weak_areas: [],
        confidence: 0.5,
        analysis: {
          hesitation_rate: 0, filler_word_count: 0, average_sentence_length: 0,
          confidence_score: 0, interruptions: 0, vocabulary_richness: 0,
          response_coherence: 0, hedging_count: 0, hedging_ratio: 0,
          sentence_structure: 0, response_length: 0, word_count: 0,
          is_substantive: false,
        },
      };
    }

    // 2. Store Q&A pair
    const newPair = { question, answer, evaluation, difficulty };
    const updated = [...qaPairsRef.current, newPair];
    qaPairsRef.current = updated;
    setQaPairs(updated);

    // 3. Record difficulty progression
    const nextIndex = questionIndexRef.current + 1;
    const progressionEntry = {
      question_number: nextIndex,
      difficulty_level: difficulty,
      candidate_score: evaluation.score ?? 5,
    };
    const updatedProgression = [...difficultyProgressionRef.current, progressionEntry];
    difficultyProgressionRef.current = updatedProgression;
    setDifficultyProgression(updatedProgression);

    // 4. Update difficulty for next question
    setCurrentDifficulty(nextDifficulty);
    currentDifficultyRef.current = nextDifficulty;

    // 5. Check if we've reached max questions
    if (nextIndex >= MAX_QUESTIONS) {
      finishInterview(interviewId, rCtx, jobRole, null, null);
      return;
    }

    // 6. Generate next question at the adjusted difficulty
    setLoadingMessage(`Generating next question...`);
    // setLoadingMessage(`Generating next question (Difficulty Level ${nextDifficulty})...`);
    try {
      const qRes = await API.post("/interviews/generate-questions", {
        resumeContext: rCtx,
        role: jobRole,
        difficultyLevel: nextDifficulty,
        count: 1,
        previousQuestions: questionsRef.current,
      });
      const newQuestions = qRes.data.data.questions || [];
      if (newQuestions.length === 0) throw new Error("No question generated");

      // Append new question to the questions array
      const allQuestions = [...questionsRef.current, newQuestions[0]];
      questionsRef.current = allQuestions;
      setQuestions(allQuestions);

      // Ask the next question
      beginQuestion(allQuestions, nextIndex, interviewId, rCtx, jobRole, null, null);
    } catch (err) {
      console.error("Failed to generate next question:", err.message);
      // If generation fails, end the interview gracefully
      finishInterview(interviewId, rCtx, jobRole, null, null);
    }
  };

  // ── Finish interview ────────────────────────────────────────────────────────
  const finishInterview = async (iId, rCtx, role, candidateId, hrId) => {
    setStatus(STATUS.EVALUATING);
    statusRef.current = STATUS.EVALUATING;
    setLoadingMessage("AI is generating your final evaluation...");
    stopListening();
    stopCamera();

    const pairs = qaPairsRef.current;

    try {
      // 1. Build session_context for the verdict agent
      const sessionContext = pairs.map((p) => ({
        question: p.question,
        answer: p.answer,
        score: p.evaluation?.score ?? null,
        feedback: p.evaluation?.feedback ?? null,
        strengths: p.evaluation?.strengths ?? [],
        weak_areas: p.evaluation?.weak_areas ?? [],
      }));

      // 2. Get final verdict from AI
      const verdictRes = await API.post("/interviews/final-verdict", {
        sessionContext,
        role,
        difficultyProgression: difficultyProgressionRef.current,
      });
      const verdict = verdictRes.data.data;
      setFinalVerdict(verdict);

      // 3. Save evaluation to database
      const rating = Math.round((verdict.interview_readiness_score ?? 50) / 10);
      // Persist behavioral analysis & per-question scores into transcript entries
      // so the backend can run scoring and the frontend/report can visualise metrics.
      const transcript = pairs.map((p) => ({
        speaker: "ai",
        text: p.question,
        answer: p.answer,
        candidate_score: p.evaluation?.score ?? null,
        analysis: p.evaluation?.analysis ?? null,
      }));

      const evalPayload = {
        rating,
        summary: verdict.summary,
        interpretation: [
          ...(verdict.strengths || []).map((s) => `✅ ${s}`),
          ...(verdict.key_gaps || []).map((g) => `⚠️ ${g}`),
        ].join("\n"),
        shouldHire: verdict.hire_signal === "Hire",
        transcript,
        faceStats: faceStatsRef.current,
      };
      if (candidateId) evalPayload.candidateId = candidateId;
      if (hrId) evalPayload.hrId = hrId;
      await API.post(`/interviews/${iId}/evaluate`, evalPayload);

      // Fetch the saved evaluation so we can render score breakdown
      // and per-question behavioral metrics on the completed screen.
      try {
        const evalRes = await API.get(`/interviews/${iId}`);
        setSavedEvaluation(evalRes.data?.data || null);
      } catch (fetchErr) {
        console.warn("Failed to fetch saved evaluation:", fetchErr.message);
      }

      setStatus(STATUS.COMPLETED);
      statusRef.current = STATUS.COMPLETED;
    } catch (err) {
      console.error("Final verdict error:", err);
      // Build a fallback verdict from per-question evaluations so users always see results
      const fallbackPairs = qaPairsRef.current;
      const scores = fallbackPairs.map(p => p.evaluation?.score ?? 5);
      const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) : 50;
      const strengths = fallbackPairs.flatMap(p => p.evaluation?.strengths ?? []).filter(Boolean).slice(0, 3);
      const gaps = fallbackPairs.flatMap(p => p.evaluation?.weak_areas ?? []).filter(Boolean).slice(0, 3);
      setFinalVerdict({
        interview_readiness_score: avgScore,
        hire_signal: avgScore >= 70 ? "Hire" : avgScore >= 50 ? "Borderline" : "No-Hire",
        summary: "Evaluation generated from individual answer scores (detailed AI summary was unavailable).",
        strengths: strengths.length ? strengths : ["Completed all interview questions"],
        key_gaps: gaps.length ? gaps : [],
        actionable_next_steps: ["Review individual answer feedback for detailed improvements"],
      });
      setStatus(STATUS.COMPLETED);
      statusRef.current = STATUS.COMPLETED;
    }
  };

  // ── Camera ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      // Request video only — audio is handled exclusively by SpeechRecognition.
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (candidateVideoRef.current) candidateVideoRef.current.srcObject = stream;

<<<<<<< HEAD
      // Start face detection loop after camera is ready
      try {
        await loadFaceDetectionModels();
        const loop = createFaceDetectionLoop(
          candidateVideoRef,
          (faceCount) => {
            faceStatsRef.current.totalChecks += 1;
            if (faceCount === 0) {
              faceStatsRef.current.noFaceCount += 1;
              setFaceWarning("no_face");
            } else if (faceCount > 1) {
              faceStatsRef.current.multipleFaceCount += 1;
              setFaceWarning("multiple_faces");
            } else {
              setFaceWarning(null);
            }
          },
          3000
        );
        faceLoopRef.current = loop;
        loop.start();
      } catch (faceErr) {
        console.warn("Face detection unavailable:", faceErr.message);
      }
=======
      // If the candidate stops the camera (track ends), pause the interview until camera returns.
      // This can happen via browser UI, device disconnect, permissions revocation, etc.
      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          pauseInterview("Camera stopped. Turn the camera back on to continue.");
        };
      });
>>>>>>> 2ebac79 (Added features)
    } catch (err) {
      console.warn("Camera access denied:", err.message);
      // If camera can't be started while the interview is running, pause it.
      if (statusRef.current === STATUS.IN_PROGRESS || statusRef.current === STATUS.COUNTDOWN) {
        pauseInterview("Camera is unavailable. Please allow camera access to continue.");
      }
    }
  };

  const stopCamera = () => {
    if (faceLoopRef.current) {
      faceLoopRef.current.stop();
      faceLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setFaceWarning(null);
  };

  const pauseInterview = (message) => {
    // Avoid interrupting the normal end flows if we're already leaving the interview.
    if (statusRef.current === STATUS.EVALUATING || statusRef.current === STATUS.COMPLETED) return;

    pauseMetaRef.current = { wasSpeaking: isSpeaking, reason: message };
    setPauseMessage(message);
    setStatus(STATUS.PAUSED);
    statusRef.current = STATUS.PAUSED;

    stopListening();
    window.speechSynthesis?.cancel();
    setIsRecording(false);
  };

  const resumeInterview = async () => {
    if (statusRef.current !== STATUS.PAUSED) return;

    // Ensure we have a usable video track; if not, re-request the camera.
    const hasLiveVideoTrack =
      !!streamRef.current &&
      streamRef.current.getVideoTracks().some((t) => t.readyState === "live");

    if (!hasLiveVideoTrack) {
      stopCamera();
      await startCamera();
    }

    // Re-enable any existing video tracks (if the user had disabled them via UI).
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = true));
    if (candidateVideoRef.current && streamRef.current) {
      candidateVideoRef.current.srcObject = streamRef.current;
    }

    setIsVideoOn(true);
    setPauseMessage("");
    setStatus(STATUS.IN_PROGRESS);
    statusRef.current = STATUS.IN_PROGRESS;

    // If we paused while AI was speaking, replay the question so the candidate doesn't miss it.
    if (pauseMetaRef.current.wasSpeaking && currentQuestion) {
      speakText(currentQuestion, () => {
        if (isAudioOnRef.current) startListening();
      });
    } else {
      if (isAudioOnRef.current) startListening();
    }
  };

  // ── Text-to-Speech ──────────────────────────────────────────────────────────
  const speakText = (text, onEnd) => {
    if (!("speechSynthesis" in window)) {
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(true);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = "en-US";

    let callbackFired = false;
    const fireCallback = () => {
      if (callbackFired) return;
      callbackFired = true;
      setIsSpeaking(false);
      onEnd?.();
    };

    utterance.onend = fireCallback;
    utterance.onerror = fireCallback;

    // Chrome bug: speechSynthesis sometimes stalls and never fires onend.
    // Fallback: estimate duration from word count (avg 130 wpm) + 1 s buffer.
    const wordCount = text.split(/\s+/).length;
    const estimatedMs = Math.max(3000, (wordCount / 130) * 60000 + 1000);
    const fallbackTimer = setTimeout(fireCallback, estimatedMs);

    // Clear the fallback if the utterance ends naturally
    utterance.onend = () => { clearTimeout(fallbackTimer); fireCallback(); };
    utterance.onerror = () => { clearTimeout(fallbackTimer); fireCallback(); };

    window.speechSynthesis.speak(utterance);
  };

  // ── Speech Recognition ──────────────────────────────────────────────────────
  const startListening = () => {
    if (!isAudioOnRef.current) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported. Please use Google Chrome.");
      alert("Speech recognition is not supported in this browser. Please use Google Chrome for the interview.");
      return;
    }

    // Stop any existing session before creating a new one
    if (recognitionRef.current) {
<<<<<<< HEAD
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) { }
=======
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch { /* ignore */ }
>>>>>>> 2ebac79 (Added features)
      recognitionRef.current = null;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    // Track confirmed (final) text separately so interim results
    // never corrupt the accumulated transcript.
    let confirmedText = "";

    recognition.onstart = () => {
      setIsRecording(true);
      console.log("🎤 Speech recognition started");
    };

    recognition.onresult = (event) => {
      let interimText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Permanently add to confirmed text
          confirmedText += transcript + " ";
        } else {
          // Collect interim (still being spoken)
          interimText += transcript;
        }
      }

      // Display confirmed + whatever is still being spoken right now
      setCurrentTranscript((confirmedText + interimText).trim());
    };

    recognition.onerror = (e) => {
      console.warn("Speech recognition error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("Microphone permission denied:", e.error);
        alert("Microphone access was denied. Please click the 🔒 icon in your browser address bar, allow the microphone, and refresh the page.");
      }
      // For network/audio-capture errors, try to restart after a short delay
      if ((e.error === "network" || e.error === "audio-capture") && isAudioOnRef.current) {
        setTimeout(() => {
<<<<<<< HEAD
          if (statusRef.current === STATUS.IN_PROGRESS) {
            try { recognition.start(); } catch (_) { }
=======
          if (statusRef.current === STATUS.IN_PROGRESS && isAudioOnRef.current) {
            try { recognition.start(); } catch { /* ignore */ }
>>>>>>> 2ebac79 (Added features)
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (statusRef.current !== STATUS.IN_PROGRESS || !isAudioOnRef.current) {
        setIsRecording(false);
        return;
      }
      // Small delay prevents "InvalidStateError: recognition has already started"
      // race condition on Windows/Chrome where onend fires before the internal
      // audio pipeline has fully shut down.
      // The confirmedText closure persists across restarts so transcript is never lost.
      setTimeout(() => {
        if (statusRef.current !== STATUS.IN_PROGRESS || !isAudioOnRef.current) {
          setIsRecording(false);
          return;
        }
        try {
          recognition.start();
        } catch (err) {
          console.warn("Speech recognition restart failed, retrying in 1s:", err);
          setIsRecording(false);
          // One more attempt after a longer pause
          setTimeout(() => {
<<<<<<< HEAD
            if (statusRef.current === STATUS.IN_PROGRESS) {
              try { recognition.start(); } catch (_) { }
=======
            if (statusRef.current === STATUS.IN_PROGRESS && isAudioOnRef.current) {
              try { recognition.start(); } catch { /* ignore */ }
>>>>>>> 2ebac79 (Added features)
            }
          }, 1000);
        }
      }, 150);
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      // Retry once after 500ms in case of a timing conflict
      setTimeout(() => {
<<<<<<< HEAD
        try { recognition.start(); } catch (_) { }
=======
        try { recognition.start(); } catch { /* ignore */ }
>>>>>>> 2ebac79 (Added features)
      }, 500);
    }

    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  };

  // ── Interview timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (status !== STATUS.IN_PROGRESS) return;
    const timer = setInterval(() => setInterviewTime((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // ── Video/Audio toggles ─────────────────────────────────────────────────────
  const toggleVideo = () => {
    setIsVideoOn((v) => {
      const newState = !v;
      if (!newState) {
        // Turning camera off pauses the interview until the user turns it on again.
        streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
        pauseInterview("Camera is off. Turn the camera on to continue.");
        return newState;
      }

      // Turning camera on resumes the interview (and re-acquires camera if needed).
      void resumeInterview();
      return newState;
    });
  };

  const toggleAudio = () => {
    setIsAudioOn((a) => {
      const newState = !a;
      // Keep the ref in sync immediately so startListening() sees the new value
      isAudioOnRef.current = newState;

      // When UI mic is off, do not capture or display user voice.
      if (!newState) {
        stopListening();
        setCurrentTranscript("");
      } else if (statusRef.current === STATUS.IN_PROGRESS) {
        startListening();
      }
      return newState;
    });
  };

  const exportResultsToPdf = async () => {
    if (!resultsRef.current) return;
    if (isExportingPdf) return;

    setIsExportingPdf(true);
    try {
      const source = resultsRef.current;
      const clone = source.cloneNode(true);

      // Make scroll containers fully visible in the PDF.
      const relaxScrollStyles = (el) => {
        if (!(el instanceof HTMLElement)) return;
        if (el.style) {
          if (el.style.maxHeight) el.style.maxHeight = "none";
          if (el.style.overflowY) el.style.overflowY = "visible";
          if (el.style.overflow) el.style.overflow = "visible";
        }
        for (const child of Array.from(el.children || [])) relaxScrollStyles(child);
      };
      relaxScrollStyles(clone);

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.left = "-10000px";
      wrapper.style.top = "0";
      wrapper.style.width = `${source.getBoundingClientRect().width}px`;
      wrapper.style.background = "#1e1e2e";
      wrapper.style.padding = "0";
      wrapper.style.zIndex = "-1";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const canvas = await html2canvas(clone, {
        backgroundColor: "#1e1e2e",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imgHeight + margin;
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      const safeRole = String(jobRole || "Interview").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`${safeRole}_Report_${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const confirmEndInterview = () => {
    stopListening();
    stopCamera();
    window.speechSynthesis?.cancel();
    navigate("/mock-interview");
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────

  // Loading screen
  if (status === STATUS.LOADING) {
    return (
      <div className="interview-screen" style={{ display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1.5rem" }}>
        <div className="ai-avatar" style={{ fontSize: "3rem" }}>
          <i className="fas fa-robot"></i>
        </div>
        <div className="loading-spinner" style={{ color: "#667eea", fontWeight: 600, fontSize: "1.1rem" }}>
          {loadingMessage}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#667eea", animation: `bounce 1s infinite ${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // Completed screen
  if (status === STATUS.COMPLETED) {
    const score = finalVerdict?.interview_readiness_score ?? "—";
    const signal = finalVerdict?.hire_signal ?? "Pending";
    const signalColor = signal === "Hire" ? "#10b981" : signal === "Borderline" ? "#f59e0b" : "#ef4444";
    const radar = computeSkillRadar(qaPairs);

    // Score breakdown from backend scoring engine (behavioral_ai/scoring.js)
    const scoreBreakdown = savedEvaluation?.score_breakdown || null;
    const breakdown = scoreBreakdown?.breakdown || {};

    const handleDownloadReport = async () => {
      if (!interviewId) return;
      try {
        const response = await API.get(`/interviews/${interviewId}/report`, {
          responseType: "blob",
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `AletheiaX-Interview-Report-${interviewId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Report download failed:", err.message);
        alert("Failed to download report. The report may not be available yet.");
      }
    };

    return (
      <div className="interview-screen" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexDirection: "column", gap: "1.5rem", padding: "2rem", paddingTop: "3rem", overflowY: "auto" }}>
        <div ref={resultsRef} style={{ background: "#1e1e2e", borderRadius: 16, padding: "2.5rem", maxWidth: 600, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</div>
          <h2 style={{ color: "#fff", marginBottom: "0.5rem" }}>Interview Complete!</h2>
          <p style={{ color: "#a0a0b0", marginBottom: "1.5rem" }}>Your responses have been evaluated by our AI interviewer.</p>

          <div style={{ display: "flex", justifyContent: "center", gap: "2rem", marginBottom: "2rem" }}>
            <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1.2rem 2rem" }}>
              <div style={{ color: "#a0a0b0", fontSize: "0.85rem" }}>Score</div>
              <div style={{ color: "#667eea", fontSize: "2.5rem", fontWeight: 700 }}>{score}<span style={{ fontSize: "1rem", color: "#a0a0b0" }}>/100</span></div>
            </div>
            <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1.2rem 2rem" }}>
              <div style={{ color: "#a0a0b0", fontSize: "0.85rem" }}>Verdict</div>
              <div style={{ color: signalColor, fontSize: "1.5rem", fontWeight: 700 }}>{signal}</div>
            </div>
          </div>

          {/* Skill radar chart */}
          <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1.2rem 1.2rem", marginBottom: "1.5rem", textAlign: "left" }}>
            <div style={{ color: "#a0a0b0", fontSize: "0.85rem", marginBottom: "0.6rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <i className="fas fa-bullseye" style={{ color: "#667eea" }}></i>
              Skill breakdown (0–5)
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart labels={radar.labels} values={radar.values} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", marginTop: "0.75rem" }}>
              {radar.labels.map((lab, i) => (
                <div key={lab} style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", color: "#e0e0f0", fontSize: "0.9rem" }}>
                  <span style={{ color: "#c0c0d0" }}>{lab}</span>
                  <span style={{ color: "#667eea", fontWeight: 700 }}>{radar.values[i].toFixed(1)}/5</span>
                </div>
              ))}
            </div>
          </div>

          {finalVerdict?.summary && (
            <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ color: "#a0a0b0", fontSize: "0.85rem", marginBottom: "0.4rem" }}>Summary</div>
              <p style={{ color: "#e0e0f0", margin: 0, lineHeight: 1.6 }}>{finalVerdict.summary}</p>
            </div>
          )}

          {finalVerdict?.strengths?.length > 0 && (
            <div style={{ background: "#1a2e1a", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1rem", textAlign: "left" }}>
              <div style={{ color: "#10b981", fontSize: "0.85rem", marginBottom: "0.4rem" }}>✅ Strengths</div>
              <ul style={{ color: "#c0e0c0", margin: 0, paddingLeft: "1.2rem" }}>
                {finalVerdict.strengths.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {finalVerdict?.key_gaps?.length > 0 && (
            <div style={{ background: "#2e1a1a", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ color: "#f59e0b", fontSize: "0.85rem", marginBottom: "0.4rem" }}>⚠️ Areas to Improve</div>
              <ul style={{ color: "#e0c0a0", margin: 0, paddingLeft: "1.2rem" }}>
                {finalVerdict.key_gaps.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </div>
          )}

          {/* ── FIX: Merged both branches' qaPairs.map() calls into one ── */}
          {/* Branch "shivam-features" added communication metrics;        */}
          {/* Branch "Asif_Features" added per-question score badges.      */}
          {/* Combined: each question row now shows the score badge AND     */}
          {/* the communication metrics card beneath the answer.           */}
          {qaPairs?.length > 0 && (
            <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ color: "#667eea", fontSize: "0.85rem", marginBottom: "0.8rem", fontWeight: 600 }}>
                <i className="fas fa-comments" style={{ marginRight: "0.5rem" }}></i>
                Interview Transcript & Communication Metrics
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {qaPairs.map((pair, i) => {
                  // Align with saved evaluation transcript entry if present (for analysis data)
                  const evalEntry = savedEvaluation?.transcript?.[i] || null;
                  const analysis = evalEntry?.analysis || pair.evaluation?.analysis || null;
                  const hasAnalysis = !!analysis;

                  // Score badge data
                  const score = pair.evaluation?.score ?? null;
                  const scoreColor =
                    score === null ? "#a0a0b0"
                      : score >= 7 ? "#10b981"
                        : score >= 5 ? "#f59e0b"
                          : "#ef4444";

                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: "1rem",
                        paddingBottom: "1rem",
                        borderBottom: i < qaPairs.length - 1 ? "1px solid #3a3a4e" : "none",
                      }}
                    >
                      {/* Question row with score badge */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.3rem" }}>
                        <div style={{ color: "#667eea", fontSize: "0.8rem", flex: 1 }}>
                          Q{i + 1}: {pair.question}
                        </div>
                        <div style={{
                          background: scoreColor + "22",
                          color: scoreColor,
                          border: `1px solid ${scoreColor}55`,
                          borderRadius: 6,
                          padding: "0.15rem 0.55rem",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}>
                          {score !== null ? `${score}/10` : "—/10"}
                        </div>
                      </div>

                      {/* Answer */}
                      <div style={{ color: "#c0c0d0", fontSize: "0.9rem", paddingLeft: "1rem", marginBottom: "0.5rem" }}>
                        A: {pair.answer}
                      </div>

                      {/* Communication metrics card */}
                      <div
                        style={{
                          marginLeft: "1rem",
                          borderRadius: 10,
                          background: "#1e1e2e",
                          padding: "0.6rem 0.8rem",
                          fontSize: "0.8rem",
                        }}
                      >
                        {hasAnalysis ? (
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                              gap: "0.4rem 0.8rem",
                            }}
                          >
                            {/* Original metrics */}
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Hesitation Rate</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {Number(analysis.hesitation_rate || 0).toFixed(1)}%
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Filler Words</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {analysis.filler_word_count ?? 0}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Avg. Sentence Length</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {Number(analysis.average_sentence_length || 0).toFixed(1)} words
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Confidence Score</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {analysis.confidence_score ?? 0}/100
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Interruptions</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {analysis.interruptions ?? 0}
                              </div>
                            </div>
                            {/* New additional metrics */}
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Vocabulary Richness</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {((analysis.vocabulary_richness ?? 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Coherence</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {((analysis.response_coherence ?? 0) * 100).toFixed(0)}%
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Hedging Language</div>
                              <div style={{ color: analysis.hedging_count > 2 ? "#ff6b6b" : "#e0e0f0", fontWeight: 600 }}>
                                {analysis.hedging_count ?? 0} phrase{(analysis.hedging_count ?? 0) !== 1 ? "s" : ""}
                              </div>
                            </div>
                            <div>
                              <div style={{ color: "#a0a0b0" }}>Word Count</div>
                              <div style={{ color: "#e0e0f0", fontWeight: 600 }}>
                                {analysis.word_count ?? 0}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ color: "#606080", fontStyle: "italic" }}>
                            No communication metrics available
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {/* ── END FIX ── */}

<<<<<<< HEAD
          {/* Score breakdown visualization from backend scoring engine */}
          {scoreBreakdown && (
            <div
              style={{
                background: "#2a2a3e",
                borderRadius: 12,
                padding: "1rem 1.5rem",
                marginBottom: "1.5rem",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  color: "#a0a0b0",
                  fontSize: "0.85rem",
                  marginBottom: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Score Breakdown
              </div>
              {[
                { key: "content_quality", label: "Content Quality" },
                { key: "communication_clarity", label: "Communication Clarity" },
                { key: "behavioral_analysis", label: "Behavioral Analysis" },
                { key: "confidence_trend", label: "Confidence Trend" },
              ].map(({ key, label }) => {
                const value = Number(breakdown[key] ?? 0);
                const width = Math.max(0, Math.min(100, value));
                return (
                  <div key={key} style={{ marginBottom: "0.6rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "0.2rem",
                        fontSize: "0.8rem",
                        color: "#c0c0d0",
                      }}
                    >
                      <span>{label}</span>
                      <span>{value.toFixed(1)}%</span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: "#1e1e2e",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${width}%`,
                          height: "100%",
                          borderRadius: 999,
                          background:
                            key === "behavioral_analysis"
                              ? "linear-gradient(90deg,#22c55e,#16a34a)"
                              : key === "confidence_trend"
                                ? "linear-gradient(90deg,#38bdf8,#0284c7)"
                                : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          transition: "width 0.4s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Total score */}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.6rem", paddingTop: "0.5rem", borderTop: "1px solid #3a3a4e", fontSize: "0.9rem" }}>
                <span style={{ color: "#e0e0f0", fontWeight: 700 }}>Total Score</span>
                <span style={{ color: "#667eea", fontWeight: 700 }}>{scoreBreakdown.total_score?.toFixed(1) ?? "—"}</span>
              </div>

              {/* Face penalty warning */}
              {scoreBreakdown.face_penalty && scoreBreakdown.face_penalty.penalty > 0 && (
                <div style={{ marginTop: "0.6rem", background: "rgba(239,68,68,0.1)", borderRadius: 8, padding: "0.6rem 0.8rem", border: "1px solid rgba(239,68,68,0.3)" }}>
                  <div style={{ color: "#ef4444", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.3rem" }}>
                    <i className="fas fa-exclamation-triangle" style={{ marginRight: "0.4rem" }}></i>
                    Face Detection Penalty: -{scoreBreakdown.face_penalty.penalty.toFixed(1)}%
                  </div>
                  {scoreBreakdown.face_penalty.reasons?.map((reason, idx) => (
                    <div key={idx} style={{ color: "#f0a0a0", fontSize: "0.75rem", marginTop: "0.15rem" }}>
                      • {reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={handleDownloadReport}
              style={{
                background: "linear-gradient(135deg,#4f46e5,#6366f1)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.8rem 2rem",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              <i className="fas fa-file-download" style={{ marginRight: "0.5rem" }}></i>
              Download Interview Report
            </button>

            <button
              onClick={() => navigate("/mock-interview")}
              style={{
                background: "linear-gradient(135deg,#667eea,#764ba2)",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "0.9rem 2.5rem",
                fontSize: "1rem",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              Back to Mock Interview
            </button>
          </div>
=======
          <button
            onClick={exportResultsToPdf}
            disabled={isExportingPdf}
            style={{ background: "linear-gradient(135deg,#111827,#334155)", color: "#fff", border: "none", borderRadius: 10, padding: "0.9rem 2.5rem", fontSize: "1rem", fontWeight: 600, cursor: isExportingPdf ? "not-allowed" : "pointer", width: "100%", marginBottom: "0.75rem", opacity: isExportingPdf ? 0.75 : 1 }}
          >
            <i className="fas fa-file-pdf"></i> {isExportingPdf ? "Exporting..." : "Export PDF"}
          </button>

          <button
            onClick={() => navigate("/mock-interview")}
            style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", border: "none", borderRadius: 10, padding: "0.9rem 2.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            Back to Mock Interview
          </button>
>>>>>>> 2ebac79 (Added features)
        </div>
      </div>
    );
  }

  // Main interview screen
  return (
    <div className="interview-screen">
      {/* Header */}
      <div className="interview-header">
        <div className="interview-info">
          <h2><i className="fas fa-video"></i> AI Interview — {jobRole}</h2>
          {status === STATUS.IN_PROGRESS && (
            <div className="interview-timer">
              <i className="fas fa-clock"></i> {formatTime(interviewTime)}
            </div>
          )}
          {countdown !== null && (
            <div className="countdown-display">
              <span className="countdown-number">{countdown}</span>
            </div>
          )}
        </div>
        <div className="interview-status">
          {isRecording && (
            <span className="recording-indicator">
              <i className="fas fa-circle"></i> Recording
            </span>
          )}
          {isSpeaking && (
            <span className="recording-indicator" style={{ background: "rgba(102,126,234,0.2)", color: "#667eea" }}>
              <i className="fas fa-volume-up"></i> AI Speaking
            </span>
          )}
          {currentQuestion && (
            <span className="question-indicator">
              Question {questionIndex + 1} of {MAX_QUESTIONS}
            </span>
          )}
        </div>
      </div>

      {/* Evaluating overlay */}
      {status === STATUS.EVALUATING && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100, gap: "1rem" }}>
          <div style={{ fontSize: "2rem" }}><i className="fas fa-robot" style={{ color: "#667eea" }}></i></div>
          <p style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 600 }}>{loadingMessage || "AI is evaluating your answer..."}</p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: "#667eea", animation: `bounce 1s infinite ${i * 0.2}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Paused overlay (camera off) */}
      {status === STATUS.PAUSED && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 110, gap: "1rem", padding: "1.5rem" }}>
          <div style={{ fontSize: "2.2rem" }}><i className="fas fa-video-slash" style={{ color: "#f59e0b" }}></i></div>
          <p style={{ color: "#fff", fontSize: "1.1rem", fontWeight: 700, textAlign: "center", maxWidth: 520 }}>
            {pauseMessage || "Interview paused. Turn the camera on to continue."}
          </p>
          <button
            className="end-interview-btn"
            style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", fontSize: "0.95rem" }}
            onClick={() => toggleVideo()}
            title="Turn on camera to resume"
          >
            <i className="fas fa-video"></i> Turn camera on
          </button>
        </div>
      )}

      {/* Countdown overlay */}
      {status === STATUS.COUNTDOWN && countdown !== null && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <p style={{ color: "#a0a0b0", marginBottom: "1rem", fontSize: "1.1rem" }}>Interview starting in</p>
          <div style={{ color: "#667eea", fontSize: "8rem", fontWeight: 700, lineHeight: 1 }}>{countdown}</div>
          <p style={{ color: "#a0a0b0", marginTop: "1rem" }}>Get ready...</p>
        </div>
      )}

      {/* Video grid */}
      <div className="video-container">
        <div className="video-grid">
          {/* AI panel */}
          <div className="video-panel ai-video-panel">
            <div className="video-wrapper">
              <div className="video-placeholder">
                <div className="ai-avatar">
                  <i className={`fas ${isSpeaking ? "fa-comment-dots" : "fa-robot"}`}></i>
                </div>
                <p>AI Interviewer</p>
                {currentQuestion && status === STATUS.IN_PROGRESS && (
                  <div className="current-question">
                    <p className="question-text">{currentQuestion}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="video-label"><i className="fas fa-robot"></i> AI Interviewer</div>
          </div>

          {/* Candidate panel */}
          <div className="video-panel candidate-video-panel" style={{ position: "relative" }}>
            <div className="video-wrapper">
              <video
                ref={candidateVideoRef}
                className="video-element"
                autoPlay
                playsInline
                muted
                style={{ display: isVideoOn ? "block" : "none" }}
              />
              {!isVideoOn && (
                <div className="video-off-overlay">
                  <i className="fas fa-video-slash"></i>
                  <p>Camera Off</p>
                </div>
              )}
              {/* Face detection warning overlay */}
              {faceWarning && isVideoOn && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 40,
                    left: 8,
                    right: 8,
                    background: faceWarning === "multiple_faces" ? "rgba(255, 60, 60, 0.9)" : "rgba(255, 165, 0, 0.9)",
                    color: "#fff",
                    padding: "0.5rem 0.7rem",
                    borderRadius: 8,
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    zIndex: 10,
                    animation: "fadeIn 0.3s ease",
                  }}
                >
                  <i className={`fas ${faceWarning === "multiple_faces" ? "fa-users" : "fa-user-slash"}`}></i>
                  {faceWarning === "multiple_faces"
                    ? "⚠ Multiple faces detected — only the candidate should be visible. This may reduce your score."
                    : "⚠ Face not detected — please ensure your face is visible to the camera."}
                </div>
              )}
            </div>
            <div className="video-label">
              <i className="fas fa-user"></i> You
              {faceWarning === null && isVideoOn && faceStatsRef.current.totalChecks > 0 && (
                <span style={{ marginLeft: 8, color: "#4ade80", fontSize: "0.75rem" }}>
                  <i className="fas fa-check-circle"></i> Face OK
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live transcript */}
      {status === STATUS.IN_PROGRESS && (
        <div style={{ background: "#1e1e2e", borderTop: "1px solid #2a2a4e", padding: "0.8rem 1.5rem", minHeight: 64, display: "flex", alignItems: "center", gap: "1rem" }}>
          <i className="fas fa-microphone" style={{ color: isRecording ? "#ef4444" : "#a0a0b0" }}></i>
          <p style={{ margin: 0, color: currentTranscript ? "#e0e0f0" : "#606080", fontStyle: currentTranscript ? "normal" : "italic", flex: 1, fontSize: "0.95rem" }}>
            {currentTranscript || "Start speaking your answer..."}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="interview-controls">
        <div className="control-buttons">
          <button className={`control-btn ${isAudioOn ? "active" : "muted"}`} onClick={toggleAudio} title={isAudioOn ? "Mute" : "Unmute"}>
            <i className={`fas fa-microphone${isAudioOn ? "" : "-slash"}`}></i>
          </button>
          <button className={`control-btn ${isVideoOn ? "active" : "muted"}`} onClick={toggleVideo} title={isVideoOn ? "Turn off camera" : "Turn on camera"}>
            <i className={`fas fa-video${isVideoOn ? "" : "-slash"}`}></i>
          </button>
          {isRecording && (
            <span className="recording-indicator" style={{ alignSelf: "center" }}>
              <i className="fas fa-circle"></i> Listening
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {/* Submit Answer button — only shown while in-progress */}
          {status === STATUS.IN_PROGRESS && (
            <button
              className="end-interview-btn"
              style={{ background: "linear-gradient(135deg,#10b981,#059669)", fontSize: "0.95rem" }}
              onClick={handleSubmitAnswer}
              disabled={isSpeaking || status === STATUS.PAUSED}
            >
              <i className="fas fa-check"></i> Submit Answer
            </button>
          )}
          <button className="end-interview-btn" onClick={() => setShowEndConfirm(true)}>
            <i className="fas fa-phone-slash"></i> End Interview
          </button>
        </div>
      </div>

      {/* End confirm modal */}
      {showEndConfirm && (
        <div className="end-interview-modal">
          <div className="modal-content">
            <div className="modal-icon"><i className="fas fa-exclamation-triangle"></i></div>
            <h3>End Interview?</h3>
            <p>Are you sure you want to end this interview? Your progress will be lost.</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowEndConfirm(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmEndInterview}>End Interview</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
