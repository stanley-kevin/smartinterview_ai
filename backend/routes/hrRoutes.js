const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  handleStartHR,
  handleAnswerHR,
  handleScoreHR,
} = require("../controllers/hrController");

const router = express.Router();

router.post("/start", protect, handleStartHR);
router.post("/answer", protect, handleAnswerHR);
router.post("/score", protect, handleScoreHR);

module.exports = router;
