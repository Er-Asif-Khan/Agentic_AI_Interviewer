const express = require("express");
const router = express.Router();
const multer = require("multer");
const interviewController = require("../controllers/interviewController");
const { protect } = require("../middleware/auth");

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"));
    }
  },
});

// AI Agent Integration Routes
// @route   POST /api/interviews/extract-resume
// @desc    Extract resume context using AI agent (file upload)
// @access  Private
router.post("/extract-resume", protect, upload.single("resume"), interviewController.extractResume);

// @route   POST /api/interviews/extract-resume-url
// @desc    Extract resume context from a remote URL (Cloudinary etc.)
// @access  Private
router.post("/extract-resume-url", interviewController.extractResumeFromUrl);

// @route   POST /api/interviews/generate-questions
// @desc    Generate interview questions using AI agent
// @access  Private
router.post("/generate-questions", protect, interviewController.generateQuestions);

// @route   POST /api/interviews/evaluate-answer
// @desc    Evaluate answer using AI agent
// @access  Private
router.post("/evaluate-answer", protect, interviewController.evaluateAnswerAPI);

// @route   POST /api/interviews/final-verdict
// @desc    Get final verdict using AI agent
// @access  Private
router.post("/final-verdict", protect, interviewController.getFinalVerdict);

// @route   GET /api/interviews/agent-health
// @desc    Check AI agent health
// @access  Public
router.get("/agent-health", interviewController.checkAgentHealth);

// @route   POST /api/interviews/difficulty-analytics
// @desc    Get difficulty analytics report for a session
// @access  Private
router.post("/difficulty-analytics", protect, interviewController.getDifficultyAnalytics);

// Interview Session Routes
// @route   POST /api/interviews/start
// @desc    Start a new interview session
// @access  Private
router.post("/start", protect, interviewController.startInterview);

// @route   GET /api/interviews/:id
// @desc    Get interview details
// @access  Private
router.get("/:id", interviewController.getInterview);

// @route   POST /api/interviews/:id/end
// @desc    End an interview session
// @access  Private
router.post("/:id/end", interviewController.endInterview);

// @route   POST /api/interviews/:id/evaluate
// @desc    Evaluate interview (AI processing)
// @access  Private
router.post("/:id/evaluate", protect, interviewController.evaluateInterview);

// @route   GET /api/interviews/candidate/:candidateId
// @desc    Get all interviews for a candidate
// @access  Private
router.get("/candidate/:candidateId", interviewController.getCandidateInterviews);

module.exports = router;









