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
      required: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    hr: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewEvaluation", interviewEvaluationSchema);









