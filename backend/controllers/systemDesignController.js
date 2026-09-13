const asyncHandler = require("express-async-handler");
const {
  startSystemDesign,
  turnSystemDesign,
  scoreSystemDesign,
} = require("../services/systemDesignService");

/**
 * @desc    Start System Design Round attempt
 * @route   POST /api/rounds/system-design/start
 * @access  Private
 */
const handleStart = asyncHandler(async (req, res) => {
  const { role, company, mode = "practice" } = req.body;
  if (!role) {
    res.status(400);
    throw new Error("Target role is required");
  }

  const result = await startSystemDesign({
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
 * @desc    Process a turn / diagram update in the System Design round
 * @route   POST /api/rounds/system-design/turn
 * @access  Private
 */
const handleTurn = asyncHandler(async (req, res) => {
  const { attemptId, diagram, userExplanation } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await turnSystemDesign({
    attemptId,
    userId: req.user._id,
    diagram,
    userExplanation,
  });

  res.status(200).json({
    success: true,
    ...result,
  });
});

/**
 * @desc    Conclude and score the full System Design round
 * @route   POST /api/rounds/system-design/score
 * @access  Private
 */
const handleScore = asyncHandler(async (req, res) => {
  const { attemptId, finalDiagram } = req.body;
  if (!attemptId) {
    res.status(400);
    throw new Error("attemptId is required");
  }

  const result = await scoreSystemDesign({
    attemptId,
    userId: req.user._id,
    finalDiagram,
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
