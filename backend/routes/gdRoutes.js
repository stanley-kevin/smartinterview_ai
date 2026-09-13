const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { handleStartGD, handleTurnGD, handleScoreGD } = require("../controllers/gdController");

const router = express.Router();

router.post("/start", protect, handleStartGD);
router.post("/turn", protect, handleTurnGD);
router.post("/score", protect, handleScoreGD);

module.exports = router;
