const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  handleStartCoding,
  handleRunCoding,
  handleSubmitCoding,
} = require("../controllers/codingController");

const router = express.Router();

router.post("/start", protect, handleStartCoding);
router.post("/run", protect, handleRunCoding);
router.post("/submit", protect, handleSubmitCoding);

module.exports = router;
