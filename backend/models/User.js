const mongoose = require("mongoose");

const userProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String, trim: true },
    headline: { type: String, trim: true },
    location: { type: String, trim: true },
    experienceYears: { type: Number, min: 0 },
    skills: [{ type: String, trim: true }],
    resumeUrl: { type: String, trim: true },
    phone: { type: String, trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["user", "candidate", "hr"],
      default: "user",
    },
    userProfile: userProfileSchema,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);









