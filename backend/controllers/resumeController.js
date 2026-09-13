const asyncHandler = require("express-async-handler");
const Attempt = require("../models/Attempt");
const ROLES = require("../config/roles");
const { extractResumeText } = require("../services/resumeParser");
const { analyzeResume } = require("../services/resumeAnalyzer");

/**
 * @desc    Upload a resume, run AI/heuristic analysis against a target role,
 *          and store the result as the "resume-screening" round attempt.
 * @route   POST /api/resume/analyze
 * @access  Private
 * @body    multipart/form-data: resume (file), role (string id), mode ('practice'|'company'), company (string, optional)
 */
const analyzeResumeUpload = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error("Please upload a resume file (PDF, DOCX, or TXT)");
  }

  const { role: roleId, mode, company } = req.body;
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    res.status(400);
    throw new Error("Please select a valid target role");
  }
  if (!["practice", "company"].includes(mode)) {
    res.status(400);
    throw new Error("Mode must be 'practice' or 'company'");
  }

  const text = await extractResumeText(req.file.buffer, req.file.mimetype, req.file.originalname);
  if (!text || text.trim().length < 30) {
    res.status(400);
    throw new Error("We couldn't read enough text from that file. Try a text-based PDF or DOCX, not a scanned image.");
  }

  const analysis = await analyzeResume(text, role);

  const attempt = await Attempt.create({
    user: req.user._id,
    mode,
    company: mode === "company" ? company || null : null,
    role: role.id,
    roundKey: "resume-screening",
    status: "completed",
    resumeFileName: req.file.originalname,
    extractedSkills: analysis.extractedSkills,
    missingSkills: analysis.missingSkills,
    resumeChecks: analysis.checks,
    score: analysis.suitabilityScore,
    feedback: {
      summary: analysis.summary,
      strengths: analysis.strengths,
      improvements: analysis.improvements,
    },
    generatedBy: analysis.generatedBy,
    completedAt: new Date(),
  });

  // Keep the user's profile in sync for quick reads elsewhere (dashboard header, etc.)
  req.user.profile.resumeUploaded = true;
  req.user.profile.resumeFileName = req.file.originalname;
  req.user.profile.targetRole = role.id;
  req.user.profile.extractedSkills = analysis.extractedSkills;
  req.user.profile.missingSkills = analysis.missingSkills;
  req.user.profile.roleSuitabilityScore = analysis.suitabilityScore;
  await req.user.save();

  res.status(201).json({
    success: true,
    attempt: {
      id: attempt._id,
      roundKey: attempt.roundKey,
      score: attempt.score,
      role: role.id,
      roleName: role.name,
      extractedSkills: attempt.extractedSkills,
      missingSkills: attempt.missingSkills,
      resumeChecks: attempt.resumeChecks,
      feedback: attempt.feedback,
      generatedBy: attempt.generatedBy,
      completedAt: attempt.completedAt,
    },
  });
});

module.exports = { analyzeResumeUpload };
