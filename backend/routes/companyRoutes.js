const express = require("express");
const COMPANIES = require("../config/companies");
const { getEffectiveRoundKeys } = require("../config/companies");
const ROLES = require("../config/roles");
const { protect } = require("../middleware/authMiddleware");
const { getRoundsWithStatus } = require("../services/roundProgress");

const router = express.Router();

/**
 * @desc    List all companies supported in Company-Based Mode
 * @route   GET /api/companies
 * @access  Public
 */
router.get("/", (req, res) => {
  res.status(200).json({ success: true, companies: COMPANIES });
});

/**
 * @desc    Get a single company's hiring pattern by slug
 * @route   GET /api/companies/:slug
 * @access  Public
 */
router.get("/:slug", (req, res) => {
  const company = COMPANIES.find((c) => c.slug === req.params.slug);
  if (!company) {
    return res.status(404).json({ success: false, message: "Company not found" });
  }
  res.status(200).json({ success: true, company });
});

/**
 * @desc    Get the rounds that actually apply to this company for a given
 *          role, merged with the current user's progress on each. This is
 *          the single source of truth the Rounds Map screen renders from —
 *          e.g. product-based companies never show Aptitude, only
 *          companies with hasGD show Group Discussion, and System Design
 *          only shows for roles flagged `isAdvanced`.
 * @route   GET /api/companies/:slug/rounds?role=<roleId>
 * @access  Private
 */
router.get("/:slug/rounds", protect, async (req, res) => {
  const company = COMPANIES.find((c) => c.slug === req.params.slug);
  if (!company) {
    return res.status(404).json({ success: false, message: "Company not found" });
  }

  const role = ROLES.find((r) => r.id === req.query.role);
  if (!role) {
    return res.status(400).json({ success: false, message: "A valid role query param is required" });
  }

  const effectiveKeys = getEffectiveRoundKeys(company, role);
  const rounds = await getRoundsWithStatus(req.user._id, effectiveKeys);

  res.status(200).json({ success: true, company: company.name, role: role.name, rounds });
});

module.exports = router;
