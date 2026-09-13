const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { startAptitudeAttempt, submitAptitudeAttempt } = require("../controllers/aptitudeController");

const router = express.Router();

router.post("/start", protect, startAptitudeAttempt);
router.post("/:attemptId/submit", protect, submitAptitudeAttempt);

module.exports = router;
