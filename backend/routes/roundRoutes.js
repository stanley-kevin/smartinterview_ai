const express = require("express");
const ROUND_DEFS = require("../config/rounds");
const ROLES = require("../config/roles");
const { protect } = require("../middleware/authMiddleware");
const { getRoundsWithStatus } = require("../services/roundProgress");

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ success: true, rounds: ROUND_DEFS });
});

/**
 * @desc    Get the rounds that apply in Practice Mode for a given role,
 *          merged with the current user's progress. Practice Mode always
 *          gets the full 8-round map except System Design, which only
 *          applies to roles flagged `isAdvanced`.
 * @route   GET /api/rounds/for-role?role=<roleId>
 * @access  Private
 */
router.get("/for-role", protect, async (req, res) => {
  const role = ROLES.find((r) => r.id === req.query.role);
  if (!role) {
    return res.status(400).json({ success: false, message: "A valid role query param is required" });
  }

  const applicableKeys = new Set(ROUND_DEFS.map((r) => r.key));
  if (!role.isAdvanced) applicableKeys.delete("system-design");

  const rounds = await getRoundsWithStatus(req.user._id, applicableKeys);
  res.status(200).json({ success: true, role: role.name, rounds });
});

module.exports = router;
