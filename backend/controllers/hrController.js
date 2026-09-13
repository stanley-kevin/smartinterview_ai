const asyncHandler = require("express-async-handler");
const { startHR, evaluateSingleAnswer, scoreHR } = require("../services/hrService");

/**
 * @desc    Start Behavioral / HR Round attempt
 * @route   POST /api/rounds/hr/start or /api/hr/start
 * @access  Private
 */
const handleStartHR = asyncHandler(async (req, res) => {
  const { role, company, mode = "practice" } = req.body;
  if (!role) {
    res.status(400);
    throw new Error("Target role is required");
  }

  const result = await startHR({
    userId: req.user._id,
    role,
    company,
    mode,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Submit answer to single question and get STAR feedback
 * @route   POST /api/rounds/hr/answer or /api/hr/answer
 * @access  Private
 */
const handleAnswerHR = asyncHandler(async (req, res) => {
  const { attemptId, questionId, answerText } = req.body;
  if (!attemptId || !questionId || !answerText) {
    res.status(400);
    throw new Error("attemptId, questionId, and answerText are required");
  }

  const result = await evaluateSingleAnswer({
    attemptId,
    userId: req.user._id,
    questionId,
    answerText,
  });

  res.status(200).json({
    success: true,
    answer: result,
  });
});

/**
 * @desc    Conclude HR round and calculate final aggregate score & report
 * @route   POST /api/rounds/hr/score or /api/hr/score
 * @access  Private
 */
const handleScoreHR = asyncHandler(async (req, res) => {
  const { attemptId } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await scoreHR({
    attemptId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  handleStartHR,
  handleAnswerHR,
  handleScoreHR,
};
