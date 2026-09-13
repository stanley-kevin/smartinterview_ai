/**
 * Shared evaluation logic for any timed MCQ round (Aptitude, Technical
 * MCQ, and future ones). Kept generic over `slowThresholdSeconds` /
 * `guessThresholdSeconds` since a 20-minute/15-question round and a
 * 30-minute/15-question round imply different "too fast" / "too slow"
 * cutoffs.
 */

/**
 * Scores a submitted attempt against its stored (server-side) answer key,
 * and runs the time-based behavioral analysis.
 *
 * @param {object} attempt - Mongoose Attempt doc with `.questions` (incl. correctIndex)
 * @param {Array}  submittedResponses - [{ questionId, selectedIndex, timeSpentSeconds }]
 * @param {object} thresholds - { slowThresholdSeconds, guessThresholdSeconds }
 */
function evaluateMCQSubmission(attempt, submittedResponses, thresholds) {
  const { slowThresholdSeconds, guessThresholdSeconds } = thresholds;
  const responsesByQuestionId = new Map(submittedResponses.map((r) => [r.questionId, r]));

  const responses = attempt.questions.map((q) => {
    const submitted = responsesByQuestionId.get(q.id);
    const selectedIndex = submitted && Number.isInteger(submitted.selectedIndex) ? submitted.selectedIndex : null;
    const timeSpentSeconds = Math.max(0, Math.round(submitted?.timeSpentSeconds || 0));
    const isCorrect = selectedIndex === q.correctIndex;

    let behavior = "normal";
    if (selectedIndex === null) behavior = "unanswered";
    else if (timeSpentSeconds <= guessThresholdSeconds && !isCorrect) behavior = "guessed";
    else if (timeSpentSeconds >= slowThresholdSeconds) behavior = "slow";

    return { questionId: q.id, selectedIndex, timeSpentSeconds, isCorrect, behavior };
  });

  const correctCount = responses.filter((r) => r.isCorrect).length;
  const score = Math.round((correctCount / attempt.questions.length) * 100);

  // Category breakdown
  const byCategory = new Map();
  attempt.questions.forEach((q, i) => {
    const r = responses[i];
    if (!byCategory.has(q.category)) byCategory.set(q.category, { category: q.category, correct: 0, total: 0 });
    const entry = byCategory.get(q.category);
    entry.total += 1;
    if (r.isCorrect) entry.correct += 1;
  });
  const categoryBreakdown = [...byCategory.values()];

  // Difficulty breakdown (only meaningful for rounds that tag difficulty)
  const byDifficulty = new Map();
  attempt.questions.forEach((q, i) => {
    if (!q.difficulty) return;
    const r = responses[i];
    if (!byDifficulty.has(q.difficulty)) byDifficulty.set(q.difficulty, { difficulty: q.difficulty, correct: 0, total: 0 });
    const entry = byDifficulty.get(q.difficulty);
    entry.total += 1;
    if (r.isCorrect) entry.correct += 1;
  });
  const difficultyBreakdown = [...byDifficulty.values()];

  // Time-based analysis
  const answered = responses.filter((r) => r.behavior !== "unanswered");
  const totalTime = responses.reduce((sum, r) => sum + r.timeSpentSeconds, 0);
  const avgTimePerQuestion = answered.length ? Math.round(totalTime / answered.length) : 0;
  const slowCount = responses.filter((r) => r.behavior === "slow").length;
  const guessedCount = responses.filter((r) => r.behavior === "guessed").length;
  const unansweredCount = responses.filter((r) => r.behavior === "unanswered").length;

  const flags = responses
    .filter((r) => r.behavior === "slow" || r.behavior === "guessed")
    .map((r) => ({ questionId: r.questionId, type: r.behavior, timeSpentSeconds: r.timeSpentSeconds }));

  const timeAnalysis = {
    totalTimeSeconds: totalTime,
    avgTimePerQuestion,
    slowCount,
    guessedCount,
    unansweredCount,
    flags,
  };

  const feedback = buildFeedback({
    score,
    categoryBreakdown,
    timeAnalysis,
    guessThresholdSeconds,
    slowThresholdSeconds,
  });

  return { responses, score, categoryBreakdown, difficultyBreakdown, timeAnalysis, feedback };
}

function buildFeedback({ score, categoryBreakdown, timeAnalysis, guessThresholdSeconds, slowThresholdSeconds }) {
  const weakest = [...categoryBreakdown].sort((a, b) => a.correct / a.total - b.correct / b.total)[0];
  const strongest = [...categoryBreakdown].sort((a, b) => b.correct / b.total - a.correct / a.total)[0];

  const strengths = [];
  const improvements = [];

  if (strongest && strongest.correct > 0) {
    strengths.push(`Strongest in ${strongest.category} — ${strongest.correct}/${strongest.total} correct.`);
  }
  if (timeAnalysis.slowCount === 0 && timeAnalysis.guessedCount === 0) {
    strengths.push("Your pacing was steady across the test — no rushed guesses or stalls.");
  }
  if (score >= 70) {
    strengths.push("Strong overall accuracy — this is a comfortable pass mark for most hiring bars.");
  }

  if (weakest && weakest.correct < weakest.total) {
    improvements.push(`${weakest.category} was your weakest area — ${weakest.correct}/${weakest.total} correct. Worth targeted practice.`);
  }
  if (timeAnalysis.guessedCount > 0) {
    improvements.push(
      `${timeAnalysis.guessedCount} question${timeAnalysis.guessedCount > 1 ? "s were" : " was"} answered in under ${guessThresholdSeconds}s and got marked wrong — a sign of guessing rather than reasoning through it.`
    );
  }
  if (timeAnalysis.slowCount > 0) {
    improvements.push(
      `${timeAnalysis.slowCount} question${timeAnalysis.slowCount > 1 ? "s took" : " took"} over ${slowThresholdSeconds}s — build speed on that category with timed drills.`
    );
  }
  if (timeAnalysis.unansweredCount > 0) {
    improvements.push(`${timeAnalysis.unansweredCount} question${timeAnalysis.unansweredCount > 1 ? "s were" : " was"} left unanswered — an easy guess still beats a zero.`);
  }
  if (improvements.length === 0) improvements.push("No major gaps — move on to the next round.");

  const summary =
    score >= 80
      ? `Excellent — ${score}% with solid pacing. You're ready for this round in a real interview.`
      : score >= 55
      ? `Solid attempt — ${score}%. A bit more speed and accuracy in your weaker category will take this from good to strong.`
      : `${score}% — this round needs more practice before it's interview-ready. Focus on the flagged category below.`;

  return { summary, strengths: strengths.slice(0, 4), improvements: improvements.slice(0, 4) };
}

module.exports = { evaluateMCQSubmission };
