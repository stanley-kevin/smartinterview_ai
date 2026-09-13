const mongoose = require("mongoose");

/**
 * One document per round attempt. `roundKey: 'aptitude'` documents also
 * carry the generated question set (with correct answers) so evaluation
 * on submit doesn't depend on trusting the client, and so a page refresh
 * mid-test can restore state instead of losing the session.
 */
const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    category: { type: String, required: true },
    subtype: { type: String, default: null }, // used by Aptitude
    difficulty: { type: String, enum: ["Easy", "Medium", "Hard", null], default: null }, // used by Technical MCQ
    sourceId: { type: String, default: null }, // bank template id, for repetition-avoidance
    prompt: { type: String, required: true },
    options: { type: [String], required: true },
    correctIndex: { type: Number, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const responseSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    selectedIndex: { type: Number, default: null }, // null = unanswered
    timeSpentSeconds: { type: Number, default: 0 },
    isCorrect: { type: Boolean, default: false },
    behavior: {
      type: String,
      enum: ["normal", "slow", "guessed", "unanswered"],
      default: "normal",
    },
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mode: { type: String, enum: ["practice", "company"], required: true },
    company: { type: String, default: null },
    role: { type: String, required: true },
    roundKey: { type: String, required: true },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },

    // Resume Screening fields
    resumeFileName: { type: String, default: null },
    extractedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    resumeChecks: { type: mongoose.Schema.Types.Mixed, default: null },

    // Aptitude (and future timed rounds) fields
    durationSeconds: { type: Number, default: null },
    questions: { type: [questionSchema], default: undefined },
    responses: { type: [responseSchema], default: undefined },
    categoryBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    difficultyBreakdown: { type: mongoose.Schema.Types.Mixed, default: null },
    timeAnalysis: { type: mongoose.Schema.Types.Mixed, default: null },

    // Group Discussion fields
    gdData: {
      topic: { type: String, default: null },
      topicContext: { type: String, default: "" },
      personas: { type: mongoose.Schema.Types.Mixed, default: [] },
      turns: { type: mongoose.Schema.Types.Mixed, default: [] },
      rubricScores: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // Coding Round fields
    codingData: {
      problem: { type: mongoose.Schema.Types.Mixed, default: null },
      userCode: { type: String, default: "" },
      language: { type: String, default: "javascript" },
      sampleResults: { type: mongoose.Schema.Types.Mixed, default: [] },
      hiddenResults: { type: mongoose.Schema.Types.Mixed, default: [] },
      passRate: { type: Number, default: 0 },
      qualitativeFeedback: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // Technical Interview fields
    technicalInterviewData: {
      resumeContext: { type: mongoose.Schema.Types.Mixed, default: null },
      turns: { type: mongoose.Schema.Types.Mixed, default: [] },
      turnCount: { type: Number, default: 0 },
      maxTurns: { type: Number, default: 7 },
      rubricScores: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // System Design fields
    systemDesignData: {
      problem: { type: mongoose.Schema.Types.Mixed, default: null },
      turns: { type: mongoose.Schema.Types.Mixed, default: [] },
      turnCount: { type: Number, default: 0 },
      maxTurns: { type: Number, default: 5 },
      finalDiagram: {
        nodes: { type: mongoose.Schema.Types.Mixed, default: [] },
        edges: { type: mongoose.Schema.Types.Mixed, default: [] },
      },
      rubricScores: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // Behavioral / HR Round fields
    hrData: {
      questions: { type: mongoose.Schema.Types.Mixed, default: [] },
      answers: { type: mongoose.Schema.Types.Mixed, default: [] },
      starSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    },

    // Shared scoring/feedback
    score: { type: Number, default: null }, // 0-100
    feedback: {
      summary: { type: String, default: "" },
      strengths: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
    },

    generatedBy: { type: String, enum: ["ai", "fallback"], default: "fallback" },

    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attemptSchema.index({ user: 1, roundKey: 1, createdAt: -1 });

module.exports = mongoose.model("Attempt", attemptSchema);
