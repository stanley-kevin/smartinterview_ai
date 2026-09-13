const asyncHandler = require("express-async-handler");
const {
  startTechnicalInterview,
  turnTechnicalInterview,
  scoreTechnicalInterview,
} = require("../services/technicalInterviewService");

/**
 * @desc    Start Technical Interview Round attempt
 * @route   POST /api/rounds/technical-interview/start
 * @access  Private
 */
const handleStart = asyncHandler(async (req, res) => {
  const { role, company, mode = "practice" } = req.body;
  if (!role) {
    res.status(400);
    throw new Error("Target role is required");
  }

  const result = await startTechnicalInterview({
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
 * @desc    Process a turn / answer in the Technical Interview
 * @route   POST /api/rounds/technical-interview/turn
 * @access  Private
 */
const handleTurn = asyncHandler(async (req, res) => {
  const { attemptId, userText } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await turnTechnicalInterview({
    attemptId,
    userId: req.user._id,
    userText,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Conclude and score the full Technical Interview
 * @route   POST /api/rounds/technical-interview/score
 * @access  Private
 */
const handleScore = asyncHandler(async (req, res) => {
  const { attemptId } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await scoreTechnicalInterview({
    attemptId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  handleStart,
  handleTurn,
  handleScore,
};
