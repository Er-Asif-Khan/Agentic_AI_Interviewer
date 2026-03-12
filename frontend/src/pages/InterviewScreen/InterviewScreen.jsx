import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./InterviewScreen.css";
import API from "../../config";

// ─── Status constants ────────────────────────────────────────────────────────
const STATUS = {
  LOADING: "loading",
  COUNTDOWN: "countdown",
  IN_PROGRESS: "in-progress",
  EVALUATING: "evaluating",
  COMPLETED: "completed",
};

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

  // ── Interview data ──────────────────────────────────────────────────────────
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [qaPairs, setQaPairs] = useState([]);          // [{question, answer, evaluation}]
  const [finalVerdict, setFinalVerdict] = useState(null);

  // ── Session meta (from Mock Interview setup) ─────────────────────────────────
  const [interviewId, setInterviewId] = useState(initInterviewId || null);
  const [resumeContext, setResumeContext] = useState(initResumeContext || "");
  const [jobRole, setJobRole] = useState(initRole || "");

  // ── Refs ────────────────────────────────────────────────────────────────────
  const candidateVideoRef = useRef(null);
  const streamRef = useRef(null);
  const recognitionRef = useRef(null);
  // Keep latest mutable values accessible inside callbacks without stale closures
  const qaPairsRef = useRef([]);
  const questionIndexRef = useRef(0);
  const questionsRef = useRef([]);
  const resumeContextRef = useRef("");
  const statusRef = useRef(STATUS.LOADING);

  // ── Keep refs in sync ───────────────────────────────────────────────────────
  useEffect(() => { qaPairsRef.current = qaPairs; }, [qaPairs]);
  useEffect(() => { questionIndexRef.current = questionIndex; }, [questionIndex]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);
  useEffect(() => { resumeContextRef.current = resumeContext; }, [resumeContext]);
  useEffect(() => { statusRef.current = status; }, [status]);

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

      // Generate AI questions
      setLoadingMessage("AI is generating questions tailored to your resume...");
      const qRes = await API.post("/interviews/generate-questions", {
        resumeContext: rContext,
        role,
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
    if (index >= qs.length) {
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

    setStatus(STATUS.EVALUATING);
    statusRef.current = STATUS.EVALUATING;
    setCurrentTranscript("");

    let evaluation = null;
    try {
      const evalRes = await API.post("/interviews/evaluate-answer", {
        question,
        answer,
        resumeContext: rCtx,
      });
      evaluation = evalRes.data.data;
    } catch (err) {
      console.warn("Evaluation failed, continuing:", err.message);
      evaluation = { score: 5, feedback: "Evaluation unavailable", strengths: [], weak_areas: [], confidence: 0.5 };
    }

    const newPair = { question, answer, evaluation };
    const updated = [...qaPairsRef.current, newPair];
    qaPairsRef.current = updated;
    setQaPairs(updated);

    // Move to next question
    const nextIndex = questionIndexRef.current + 1;
    beginQuestion(questionsRef.current, nextIndex, interviewId, rCtx, jobRole, null, null);
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
      });
      const verdict = verdictRes.data.data;
      setFinalVerdict(verdict);

      // 3. Save evaluation to database
      const rating = Math.round((verdict.interview_readiness_score ?? 50) / 10);
      const transcript = pairs.map((p) => ({
        speaker: "ai",
        text: p.question,
        answer: p.answer,
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
      };
      if (candidateId) evalPayload.candidateId = candidateId;
      if (hrId) evalPayload.hrId = hrId;
      await API.post(`/interviews/${iId}/evaluate`, evalPayload);

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
      // Capturing audio here via getUserMedia conflicts with webkitSpeechRecognition
      // on Windows/Chrome, causing the Speech API to silently fail (audio-capture error).
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (candidateVideoRef.current) candidateVideoRef.current.srcObject = stream;
    } catch (err) {
      console.warn("Camera access denied:", err.message);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported. Please use Google Chrome.");
      alert("Speech recognition is not supported in this browser. Please use Google Chrome for the interview.");
      return;
    }

    // Stop any existing session before creating a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.onend = null; recognitionRef.current.stop(); } catch (_) {}
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
      if (e.error === "network" || e.error === "audio-capture") {
        setTimeout(() => {
          if (statusRef.current === STATUS.IN_PROGRESS) {
            try { recognition.start(); } catch (_) {}
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      if (statusRef.current !== STATUS.IN_PROGRESS) {
        setIsRecording(false);
        return;
      }
      // Small delay prevents "InvalidStateError: recognition has already started"
      // race condition on Windows/Chrome where onend fires before the internal
      // audio pipeline has fully shut down.
      // The confirmedText closure persists across restarts so transcript is never lost.
      setTimeout(() => {
        if (statusRef.current !== STATUS.IN_PROGRESS) {
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
            if (statusRef.current === STATUS.IN_PROGRESS) {
              try { recognition.start(); } catch (_) {}
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
        try { recognition.start(); } catch (_) {}
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
      if (streamRef.current) {
        // Enable/disable the existing video track
        streamRef.current.getVideoTracks().forEach((t) => (t.enabled = newState));
        // Re-assign srcObject in case the video element was remounted
        if (newState && candidateVideoRef.current) {
          candidateVideoRef.current.srcObject = streamRef.current;
        }
      }
      return newState;
    });
  };

  const toggleAudio = () => {
    setIsAudioOn((a) => {
      const newState = !a;
      // Mute/unmute the camera stream's audio track (for the video element)
      // but do NOT touch the SpeechRecognition — it has its own mic access
      // and is unaffected by the MediaStream track state.
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = newState));
      return newState;
    });
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

    return (
      <div className="interview-screen" style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", flexDirection: "column", gap: "1.5rem", padding: "2rem", paddingTop: "3rem", overflowY: "auto" }}>
        <div style={{ background: "#1e1e2e", borderRadius: 16, padding: "2.5rem", maxWidth: 600, width: "100%", textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
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

          {qaPairs?.length > 0 && (
            <div style={{ background: "#2a2a3e", borderRadius: 12, padding: "1rem 1.5rem", marginBottom: "1.5rem", textAlign: "left" }}>
              <div style={{ color: "#667eea", fontSize: "0.85rem", marginBottom: "0.8rem", fontWeight: 600 }}>
                <i className="fas fa-comments" style={{ marginRight: "0.5rem" }}></i>
                Interview Transcript
              </div>
              <div style={{ maxHeight: 240, overflowY: "auto" }}>
                {qaPairs.map((pair, i) => (
                  <div key={i} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: i < qaPairs.length - 1 ? "1px solid #3a3a4e" : "none" }}>
                    <div style={{ color: "#667eea", fontSize: "0.8rem", marginBottom: "0.3rem" }}>Q{i + 1}: {pair.question}</div>
                    <div style={{ color: "#c0c0d0", fontSize: "0.9rem", paddingLeft: "1rem" }}>A: {pair.answer}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={() => navigate("/mock-interview")}
            style={{ background: "linear-gradient(135deg,#667eea,#764ba2)", color: "#fff", border: "none", borderRadius: 10, padding: "0.9rem 2.5rem", fontSize: "1rem", fontWeight: 600, cursor: "pointer", width: "100%" }}
          >
            Back to Mock Interview
          </button>
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
              Question {questionIndex + 1} of {questions.length}
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
          <div className="video-panel candidate-video-panel">
            <div className="video-wrapper">
              {/* Always keep <video> in DOM so the ref is never lost.
                  Hide it with CSS when camera is off so re-enabling
                  works without needing to re-assign srcObject. */}
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
            </div>
            <div className="video-label"><i className="fas fa-user"></i> You</div>
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
              disabled={isSpeaking}
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
