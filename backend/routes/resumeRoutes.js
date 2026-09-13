const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { uploadResume } = require("../middleware/upload");
const { analyzeResumeUpload } = require("../controllers/resumeController");

const router = express.Router();

router.post("/analyze", protect, uploadResume.single("resume"), analyzeResumeUpload);

module.exports = router;
