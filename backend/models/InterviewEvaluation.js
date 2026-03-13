const mongoose = require("mongoose");

const transcriptEntrySchema = new mongoose.Schema(
  {
    speaker: {
      type: String,
      enum: ["candidate", "ai", "interviewer"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      default: undefined,
    },
    timestamp: {
      type: Number, // seconds from start of interview
    },
    difficulty_level: {
      type: Number,
      min: 1,
      max: 5,
      default: null, // backward compatible
    },
    topic: {
      type: String,
      default: null,
    },
    candidate_score: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
    response_time: {
      type: Number, // seconds taken to respond
      default: null,
    },
  },
  { _id: false }
);

const difficultyProgressionSchema = new mongoose.Schema(
  {
    question_number: {
      type: Number,
      required: true,
    },
    difficulty_level: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    candidate_score: {
      type: Number,
      min: 0,
      max: 10,
      default: null,
    },
  },
  { _id: false }
);

const interviewEvaluationSchema = new mongoose.Schema(
  {
    interviewId: {
      type: String, // could map to a separate Interview session id
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
    },
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    rating: {
      type: Number,
      min: 0,
      max: 10,
      required: true,
    },
    summary: {
      type: String,
      required: true,
    },
    interpretation: {
      type: String,
      required: true,
    },
    shouldHire: {
      type: Boolean,
      required: true,
    },
    transcript: [transcriptEntrySchema],
    difficulty_progression: [difficultyProgressionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewEvaluation", interviewEvaluationSchema);









