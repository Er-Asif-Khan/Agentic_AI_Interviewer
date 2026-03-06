const InterviewEvaluation = require("../models/InterviewEvaluation");
const Application = require("../models/Application");
const agentService = require("../services/agentService");
const axios = require("axios");
const path = require("path");
const fs = require("fs");

// @desc    Start a new interview session (mock or hiring)
// @route   POST /api/interviews/start
// @body    { role? } - Optional role for mock interviews
exports.startInterview = async (req, res) => {
  try {
    const userId = req.user?.id || "anonymous";
    const { role } = req.body || {};
    const interviewId = `mock-${userId}-${Date.now()}`;

    res.status(201).json({
      success: true,
      message: "Interview started successfully",
      data: {
        interviewId,
        status: "in-progress",
        startedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get interview details (from evaluation if exists)
// @route   GET /api/interviews/:id
exports.getInterview = async (req, res) => {
  try {
    const { id } = req.params;

    const evaluation = await InterviewEvaluation.findOne({
      interviewId: id,
    }).populate("candidate job hr");

    if (!evaluation) {
      return res.status(404).json({
        success: false,
        message: "Interview not found",
      });
    }

    res.status(200).json({
      success: true,
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    End an interview session (no-op for now)
// @route   POST /api/interviews/:id/end
exports.endInterview = async (req, res) => {
  try {
    const { id } = req.params;

    res.status(200).json({
      success: true,
      message: "Interview ended successfully",
      data: {
        interviewId: id,
        status: "completed",
        endedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Evaluate interview (AI processing result) - supports mock interviews
// @route   POST /api/interviews/:id/evaluate
// @body    { rating, summary, interpretation, shouldHire, transcript } (candidateId, jobId, hrId optional for mock)
exports.evaluateInterview = async (req, res) => {
  try {
    const { id } = req.params;
    const { candidateId, jobId, hrId, rating, summary, interpretation, shouldHire, transcript } =
      req.body;

    if (!rating || summary == null || interpretation == null || shouldHire == null) {
      return res.status(400).json({
        success: false,
        message: "rating, summary, interpretation, and shouldHire are required",
      });
    }

    const updateData = {
      interviewId: id,
      rating,
      summary,
      interpretation,
      shouldHire,
      transcript: transcript || [],
    };

    if (candidateId) updateData.candidate = candidateId;
    if (jobId) updateData.job = jobId;
    if (hrId) updateData.hr = hrId;

    const evaluation = await InterviewEvaluation.findOneAndUpdate(
      { interviewId: id },
      updateData,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    if (candidateId && jobId) {
      await Application.findOneAndUpdate(
        { candidate: candidateId, job: jobId },
        {
          rating,
          summary,
          interpretation,
          shouldHire,
          interviewEvaluation: evaluation._id,
          status: "reviewed",
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Interview evaluated successfully",
      data: evaluation,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all interviews for a candidate
// @route   GET /api/interviews/candidate/:candidateId
exports.getCandidateInterviews = async (req, res) => {
  try {
    const { candidateId } = req.params;

    const evaluations = await InterviewEvaluation.find({
      candidate: candidateId,
    })
      .populate("job hr")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: evaluations.length,
      data: evaluations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Extract resume context from a Cloudinary/remote URL or local path
// @route   POST /api/interviews/extract-resume-url
exports.extractResumeFromUrl = async (req, res) => {
  try {
    const { resumeUrl } = req.body;

    if (!resumeUrl) {
      return res.status(400).json({
        success: false,
        message: "resumeUrl is required",
      });
    }

    let buffer;
    let filename = "resume.pdf";

    // Detect local path (starts with /uploads/) vs remote URL
    const isLocalPath = resumeUrl.startsWith("/uploads/");

    if (isLocalPath) {
      // Read directly from disk — no HTTP needed
      const localFilePath = path.join(__dirname, "..", resumeUrl);
      if (!fs.existsSync(localFilePath)) {
        return res.status(404).json({
          success: false,
          message: "Resume file not found on server",
        });
      }
      buffer = fs.readFileSync(localFilePath);
      filename = path.basename(localFilePath);
    } else {
      // Download from remote URL (Cloudinary, S3, etc.)
      const fileResponse = await axios.get(resumeUrl, {
        responseType: "arraybuffer",
        timeout: 20000,
      });
      buffer = Buffer.from(fileResponse.data);
      try {
        const urlPath = new URL(resumeUrl).pathname;
        const base = path.basename(urlPath);
        if (base && (base.endsWith(".pdf") || base.endsWith(".docx"))) {
          filename = base;
        }
      } catch (_) {}
    }

    const result = await agentService.extractResumeContext(buffer, filename);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("extractResumeFromUrl error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to extract resume from URL",
      error: error.message,
    });
  }
};

// @desc    Extract resume context using AI agent
// @route   POST /api/interviews/extract-resume
exports.extractResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resume file is required",
      });
    }

    const result = await agentService.extractResumeContext(
      req.file.buffer,
      req.file.originalname
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to extract resume",
      error: error.message,
    });
  }
};

// @desc    Generate interview questions using AI agent
// @route   POST /api/interviews/generate-questions
exports.generateQuestions = async (req, res) => {
  try {
    const { resumeContext, role } = req.body;

    if (!resumeContext || !role) {
      return res.status(400).json({
        success: false,
        message: "Resume context and role are required",
      });
    }

    const result = await agentService.generateQuestions(resumeContext, role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate questions",
      error: error.message,
    });
  }
};

// @desc    Evaluate answer using AI agent
// @route   POST /api/interviews/evaluate-answer
exports.evaluateAnswerAPI = async (req, res) => {
  try {
    const { question, answer, resumeContext } = req.body;

    if (!question || !answer || !resumeContext) {
      return res.status(400).json({
        success: false,
        message: "Question, answer, and resume context are required",
      });
    }

    const result = await agentService.evaluateAnswer(
      question,
      answer,
      resumeContext
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to evaluate answer",
      error: error.message,
    });
  }
};

// @desc    Get final verdict using AI agent
// @route   POST /api/interviews/final-verdict
exports.getFinalVerdict = async (req, res) => {
  try {
    const { sessionContext, role } = req.body;

    if (!sessionContext || !role) {
      return res.status(400).json({
        success: false,
        message: "sessionContext and role are required",
      });
    }

    const result = await agentService.getFinalVerdict(sessionContext, role);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get final verdict",
      error: error.message,
    });
  }
};

// @desc    Check AI agent health
// @route   GET /api/interviews/agent-health
exports.checkAgentHealth = async (req, res) => {
  try {
    const isHealthy = await agentService.healthCheck();

    res.status(200).json({
      success: true,
      data: {
        agentStatus: isHealthy ? "healthy" : "unhealthy",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to check agent health",
      error: error.message,
    });
  }
};

