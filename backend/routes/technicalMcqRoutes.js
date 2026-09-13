const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { startTechnicalMcqAttempt, submitTechnicalMcqAttempt } = require("../controllers/technicalMcqController");

const router = express.Router();

router.post("/start", protect, startTechnicalMcqAttempt);
router.post("/:attemptId/submit", protect, submitTechnicalMcqAttempt);

module.exports = router;
