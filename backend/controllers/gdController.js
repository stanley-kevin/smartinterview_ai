const asyncHandler = require("express-async-handler");
const { startGD, nextTurnGD, scoreGD } = require("../services/gdService");

/**
 * @desc    Start Group Discussion attempt
 * @route   POST /api/rounds/gd/start or /api/gd/start
 * @access  Private
 */
const handleStartGD = asyncHandler(async (req, res) => {
  const { role, company, mode = "practice" } = req.body;
  if (!role) {
    res.status(400);
    throw new Error("Target role is required");
  }

  const result = await startGD({
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
 * @desc    Post a candidate turn and get AI persona reply
 * @route   POST /api/rounds/gd/turn or /api/gd/turn
 * @access  Private
 */
const handleTurnGD = asyncHandler(async (req, res) => {
  const { attemptId, userText } = req.body;
  if (!attemptId || !userText || !userText.trim()) {
    res.status(400);
    throw new Error("attemptId and non-empty userText are required");
  }

  const result = await nextTurnGD({
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
 * @desc    Conclude discussion and compute score & rubric feedback
 * @route   POST /api/rounds/gd/score or /api/gd/score
 * @access  Private
 */
const handleScoreGD = asyncHandler(async (req, res) => {
  const { attemptId } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await scoreGD({
    attemptId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

module.exports = {
  handleStartGD,
  handleTurnGD,
  handleScoreGD,
};
