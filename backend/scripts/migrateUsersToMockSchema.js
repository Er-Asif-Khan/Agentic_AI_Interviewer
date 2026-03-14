/**
 * Migration: Convert users from HR/Candidate model to Mock Interview (user-only) model
 * - Updates role "candidate" or "hr" → "user"
 * - Copies candidateProfile → userProfile (for existing candidates)
 * - Removes hrProfile and candidateProfile from DB
 *
 * Run: node backend/scripts/migrateUsersToMockSchema.js
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");

const connectDB = async () => {
  const MONGO_URI =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ai_interviewer";
  await mongoose.connect(MONGO_URI);
  console.log("MongoDB Connected");
};

const migrate = async () => {
  try {
    await connectDB();

    const collection = mongoose.connection.collection("users");
    const result = await collection.updateMany(
      { role: { $in: ["candidate", "hr"] } },
      [
        {
          $set: {
            role: "user",
            userProfile: "$candidateProfile",
          },
        },
        { $unset: ["candidateProfile", "hrProfile"] },
      ]
    );

    console.log(`✅ Migration complete. Modified ${result.modifiedCount} user(s).`);
  } catch (err) {
    console.error("Migration failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
};

migrate();
