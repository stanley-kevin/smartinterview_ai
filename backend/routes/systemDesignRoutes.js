const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
  handleStart,
  handleTurn,
  handleScore,
} = require("../controllers/systemDesignController");

const router = express.Router();

router.use(protect);

router.post("/start", handleStart);
router.post("/turn", handleTurn);
router.post("/score", handleScore);

module.exports = router;
