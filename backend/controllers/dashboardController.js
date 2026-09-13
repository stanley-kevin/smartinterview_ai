const asyncHandler = require("express-async-handler");
const Attempt = require("../models/Attempt");
const ROUND_DEFS = require("../config/rounds");
const ROLES = require("../config/roles");
const { getRoundsWithStatus } = require("../services/roundProgress");

/**
 * @desc    Aggregate everything the dashboard needs in one call: profile
 *          summary, per-round progress (most recent attempt of each type),
 *          and headline stats.
 * @route   GET /api/dashboard
 * @access  Private
 */
const getDashboard = asyncHandler(async (req, res) => {
  const rounds = await getRoundsWithStatus(req.user._id);

  const attempts = await Attempt.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(8).lean();

  const completedRounds = rounds.filter((r) => r.status === "completed");
  const scores = completedRounds.map((r) => r.lastScore).filter((s) => typeof s === "number");
  const averageScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  const totalAttemptsCount = await Attempt.countDocuments({ user: req.user._id });

  const recentActivity = attempts.map((a) => ({
    id: a._id,
    roundKey: a.roundKey,
    mode: a.mode,
    company: a.company,
    role: a.role,
    status: a.status,
    score: a.score,
    date: a.completedAt || a.startedAt,
  }));

  const role = ROLES.find((r) => r.id === req.user.profile.targetRole) || null;

  res.status(200).json({
    success: true,
    profile: {
      name: req.user.name,
      email: req.user.email,
      resumeUploaded: req.user.profile.resumeUploaded,
      resumeFileName: req.user.profile.resumeFileName,
      targetRole: req.user.profile.targetRole,
      targetRoleName: role?.name || null,
      roleSuitabilityScore: req.user.profile.roleSuitabilityScore,
      extractedSkills: req.user.profile.extractedSkills,
      missingSkills: req.user.profile.missingSkills,
      lastMode: req.user.lastMode,
      lastCompany: req.user.lastCompany,
      memberSince: req.user.createdAt,
    },
    stats: {
      roundsCompleted: completedRounds.length,
      totalRounds: ROUND_DEFS.length,
      averageScore,
      totalAttempts: totalAttemptsCount,
    },
    rounds,
    recentActivity,
  });
});

module.exports = { getDashboard };
