const asyncHandler = require("express-async-handler");
const { startCoding, runSampleCases, submitCode } = require("../services/codingService");

/**
 * @desc    Start Coding Round attempt
 * @route   POST /api/rounds/coding/start or /api/coding/start
 * @access  Private
 */
const handleStartCoding = asyncHandler(async (req, res) => {
  const { role, company, mode = "practice" } = req.body;
  if (!role) {
    res.status(400);
    throw new Error("Target role is required");
  }

  const result = await startCoding({
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
 * @desc    Run code against visible sample test cases
 * @route   POST /api/rounds/coding/run or /api/coding/run
 * @access  Private
 */
const handleRunCoding = asyncHandler(async (req, res) => {
  const { attemptId, code, language } = req.body;
  if (!attemptId || !code || !language) {
    res.status(400);
    throw new Error("attemptId, code, and language are required");
  }

  const result = await runSampleCases({
    attemptId,
    userId: req.user._id,
    code,
    language,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Submit code against all hidden test cases + review
 * @route   POST /api/rounds/coding/submit or /api/coding/submit
 * @access  Private
 */
const handleSubmitCoding = asyncHandler(async (req, res) => {
  const { attemptId, code, language } = req.body;
  if (!attemptId || !code || !language) {
    res.status(400);
    throw new Error("attemptId, code, and language are required");
  }

  const result = await submitCode({
    attemptId,
    userId: req.user._id,
    code,
    language,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  handleStartCoding,
  handleRunCoding,
  handleSubmitCoding,
};
