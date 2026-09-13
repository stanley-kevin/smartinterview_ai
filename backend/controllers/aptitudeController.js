const asyncHandler = require("express-async-handler");
const Attempt = require("../models/Attempt");
const ROLES = require("../config/roles");
const { generateAptitudeQuestions, evaluateSubmission, DURATION_SECONDS } = require("../services/aptitudeService");

/**
 * @desc    Start a new Aptitude Round attempt: generates 15 questions and
 *          persists them server-side (with answers) so evaluation can't
 *          be spoofed from the client.
 * @route   POST /api/aptitude/start
 * @access  Private
 */
const startAptitudeAttempt = asyncHandler(async (req, res) => {
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

  const { questions, generatedBy } = await generateAptitudeQuestions({
    role: role.name,
    company: mode === "company" ? company : null,
  });

  const attempt = await Attempt.create({
    user: req.user._id,
    mode,
    company: mode === "company" ? company || null : null,
    role: role.id,
    roundKey: "aptitude",
    status: "in-progress",
    durationSeconds: DURATION_SECONDS,
    questions,
    generatedBy,
    startedAt: new Date(),
  });

  // Never send correctIndex / explanation to the client before submission.
  const clientQuestions = attempt.questions.map((q) => ({
    id: q.id,
    category: q.category,
    subtype: q.subtype,
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
 * @desc    Submit answers for an in-progress Aptitude Round attempt, score
 *          it, run time-based behavior analysis, and generate feedback.
 * @route   POST /api/aptitude/:attemptId/submit
 * @access  Private
 * @body    { responses: [{ questionId, selectedIndex, timeSpentSeconds }], totalTimeSpentSeconds }
 */
const submitAptitudeAttempt = asyncHandler(async (req, res) => {
  const attempt = await Attempt.findOne({ _id: req.params.attemptId, user: req.user._id });

  if (!attempt || attempt.roundKey !== "aptitude") {
    res.status(404);
    throw new Error("Aptitude attempt not found");
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
  attempt.timeAnalysis = result.timeAnalysis;
  attempt.feedback = result.feedback;
  attempt.status = "completed";
  attempt.completedAt = new Date();
  await attempt.save();

  // Include correct answers now that the attempt is over, for review.
  const review = attempt.questions.map((q) => {
    const r = result.responses.find((resp) => resp.questionId === q.id);
    return {
      id: q.id,
      category: q.category,
      subtype: q.subtype,
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
    timeAnalysis: attempt.timeAnalysis,
    feedback: attempt.feedback,
    review,
  });
});

module.exports = { startAptitudeAttempt, submitAptitudeAttempt };
