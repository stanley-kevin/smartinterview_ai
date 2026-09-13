const Attempt = require("../models/Attempt");
const ROUND_DEFS = require("../config/rounds");

/**
 * Given a user and an optional set of applicable round keys, returns the
 * round definitions (in canonical order) annotated with that user's
 * progress. Used by both the global dashboard (all 8 rounds) and the
 * company-specific rounds view (only the rounds that company/role combo
 * actually uses).
 *
 * @param {string} userId
 * @param {Set<string>|null} applicableKeys - if provided, only these round
 *        keys are included (company mode); if null, all ROUND_DEFS are used
 *        (practice mode / global dashboard).
 */
async function getRoundsWithStatus(userId, applicableKeys = null) {
  const attempts = await Attempt.find({ user: userId }).sort({ createdAt: -1 }).lean();

  const latestByRound = new Map();
  for (const attempt of attempts) {
    if (!latestByRound.has(attempt.roundKey)) latestByRound.set(attempt.roundKey, attempt);
  }

  const defs = applicableKeys
    ? ROUND_DEFS.filter((def) => applicableKeys.has(def.key))
    : ROUND_DEFS;

  const sortedDefs = defs.slice().sort((a, b) => a.order - b.order);

  const result = [];
  for (let i = 0; i < sortedDefs.length; i++) {
    const def = sortedDefs[i];
    const latest = latestByRound.get(def.key);

    if (!def.enabled) {
      result.push({
        ...def,
        status: "locked",
        lockedReason: "This round is coming soon.",
        lastScore: null,
        lastAttemptAt: null,
        attemptId: null,
      });
      continue;
    }

    // Round 1 (Resume screening) is always unlocked
    if (i === 0) {
      const isComp = latest?.status === "completed";
      result.push({
        ...def,
        status: isComp ? "completed" : latest ? "in-progress" : "available",
        lastScore: isComp ? latest.score : null,
        lastAttemptAt: latest?.completedAt || latest?.startedAt || null,
        attemptId: latest && latest.status === "in-progress" ? latest._id : null,
      });
    } else {
      // Prior round in sequence must be completed
      const prevRound = result[i - 1];
      const isPrevCompleted = prevRound && prevRound.status === "completed";

      if (!isPrevCompleted) {
        result.push({
          ...def,
          status: "locked",
          lockedReason: `Complete ${prevRound ? prevRound.label : "previous round"} first`,
          lastScore: null,
          lastAttemptAt: null,
          attemptId: null,
        });
      } else {
        const isComp = latest?.status === "completed";
        result.push({
          ...def,
          status: isComp ? "completed" : latest ? "in-progress" : "available",
          lastScore: isComp ? latest.score : null,
          lastAttemptAt: latest?.completedAt || latest?.startedAt || null,
          attemptId: latest && latest.status === "in-progress" ? latest._id : null,
        });
      }
    }
  }

  return result;
}

module.exports = { getRoundsWithStatus };
