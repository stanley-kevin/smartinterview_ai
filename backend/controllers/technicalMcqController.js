const asyncHandler = require("express-async-handler");
const Attempt = require("../models/Attempt");
const ROLES = require("../config/roles");
const {
  generateTechnicalMcqQuestions,
  evaluateSubmission,
  DURATION_SECONDS,
} = require("../services/technicalMcqService");

/**
 * @desc    Start a new Technical MCQ attempt: generates 15 questions
 *          (DBMS/OS/OOP/CN/Programming/Mixed, 5 Easy/6 Medium/4 Hard) and
 *          persists them server-side with answers.
 * @route   POST /api/technical-mcq/start
 * @access  Private
 */
const startTechnicalMcqAttempt = asyncHandler(async (req, res) => {
  const { role: roleId, mode, company } = req.body;
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400);
    throw new Error("Please select a valid target role");
  }
  if (!["practice", "company"].includes(mode)) {
    res.status(400);
    throw new Error("Mode must be 'practice' or 'company'");
  }

  const { questions, generatedBy } = await generateTechnicalMcqQuestions({
    role: role.name,
    company: mode === "company" ? company : null,
    userId: req.user._id,
  });

  const attempt = await Attempt.create({
    user: req.user._id,
    mode,
    company: mode === "company" ? company || null : null,
    role: role.id,
    roundKey: "technical-mcq",
    status: "in-progress",
    durationSeconds: DURATION_SECONDS,
    questions,
    generatedBy,
    startedAt: new Date(),
  });

  const clientQuestions = attempt.questions.map((q) => ({
    id: q.id,
    category: q.category,
    difficulty: q.difficulty,
    prompt: q.prompt,
    options: q.options,
  }));

  res.status(201).json({
    success: true,
    attemptId: attempt._id,
    durationSeconds: DURATION_SECONDS,
    startedAt: attempt.startedAt,
    questions: clientQuestions,
    generatedBy,
  });
});

/**
 * @desc    Submit answers for an in-progress Technical MCQ attempt, score
 *          it, and run time-based behavior analysis.
 * @route   POST /api/technical-mcq/:attemptId/submit
 * @access  Private
 */
const submitTechnicalMcqAttempt = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findOne({ _id: req.params.attemptId, user: req.user._id });

  if (!attempt || attempt.roundKey !== "technical-mcq") {
    res.status(404);
    throw new Error("Technical MCQ attempt not found");
  }
  if (attempt.status === "completed") {
    res.status(409);
    throw new Error("This attempt has already been submitted");
  }

  const { responses } = req.body;
  if (!Array.isArray(responses)) {
    res.status(400);
    throw new Error("responses must be an array");
  }

  const result = evaluateSubmission(attempt, responses);

  attempt.responses = result.responses;
  attempt.score = result.score;
  attempt.categoryBreakdown = result.categoryBreakdown;
  attempt.difficultyBreakdown = result.difficultyBreakdown;
  attempt.timeAnalysis = result.timeAnalysis;
  attempt.feedback = result.feedback;
  attempt.status = "completed";
  attempt.completedAt = new Date();
  await attempt.save();

  const review = attempt.questions.map((q) => {
    const r = result.responses.find((resp) => resp.questionId === q.id);
    return {
      id: q.id,
      category: q.category,
      difficulty: q.difficulty,
      prompt: q.prompt,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
      selectedIndex: r?.selectedIndex ?? null,
      isCorrect: r?.isCorrect ?? false,
      timeSpentSeconds: r?.timeSpentSeconds ?? 0,
      behavior: r?.behavior ?? "unanswered",
    };
  });

  res.status(200).json({
    success: true,
    attemptId: attempt._id,
    score: attempt.score,
    categoryBreakdown: attempt.categoryBreakdown,
    difficultyBreakdown: attempt.difficultyBreakdown,
    timeAnalysis: attempt.timeAnalysis,
    feedback: attempt.feedback,
    review,
  });
});

module.exports = { startTechnicalMcqAttempt, submitTechnicalMcqAttempt };
