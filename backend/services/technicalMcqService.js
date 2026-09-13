const { groqJSON } = require("./groqService");
const { generateLocalQuestionSet, CATEGORIES } = require("../config/technicalMcqBank");
const { evaluateMCQSubmission } = require("./mcqEvaluation");
const Attempt = require("../models/Attempt");

const DURATION_SECONDS = 20 * 60; // 20 minutes
// 20 min / 15 Qs = 80s average, tighter than the aptitude round's 25/15 = 100s.
const SLOW_THRESHOLD_SECONDS = 60;
const GUESS_THRESHOLD_SECONDS = 5;

const TEMPLATE = [
  [CATEGORIES.dbms, "Easy"], [CATEGORIES.dbms, "Medium"], [CATEGORIES.dbms, "Hard"],
  [CATEGORIES.os, "Easy"], [CATEGORIES.os, "Medium"], [CATEGORIES.os, "Hard"],
  [CATEGORIES.oop, "Easy"], [CATEGORIES.oop, "Medium"],
  [CATEGORIES.cn, "Easy"], [CATEGORIES.cn, "Medium"],
  [CATEGORIES.programming, "Easy"], [CATEGORIES.programming, "Medium"], [CATEGORIES.programming, "Hard"],
  [CATEGORIES.mixed, "Medium"], [CATEGORIES.mixed, "Hard"],
];

const GEN_SYSTEM_PROMPT = `You generate a Technical MCQ round for a job-interview practice platform. Generate exactly 15 multiple-choice questions, one per slot below, IN THIS EXACT ORDER, using these exact category names and difficulty labels:

${TEMPLATE.map(([cat, diff], i) => `${i + 1}. ${cat} — ${diff}`).join("\n")}

Tailor content to the given target role where it makes sense (e.g. more backend/database depth for a Backend Developer). Each question must have exactly 4 options with exactly one correct answer. Vary wording and specifics so questions feel fresh each time.

Respond ONLY with a JSON object of this exact shape:
{
  "questions": [
    { "category": "<exact category name from the list above>", "difficulty": "<Easy|Medium|Hard, exactly matching the slot>", "prompt": "<question text>", "options": ["<opt1>","<opt2>","<opt3>","<opt4>"], "correctIndex": <0-3>, "explanation": "<one sentence why>" }
  ]
}
Return exactly 15 items, in the exact slot order given above. Do not include any text outside the JSON object.`;

function validateAIQuestions(payload) {
  if (!payload || !Array.isArray(payload.questions) || payload.questions.length !== 15) return null;
  const ok = payload.questions.every(
    (q) =>
      q &&
      typeof q.prompt === "string" &&
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      Number.isInteger(q.correctIndex) &&
      q.correctIndex >= 0 &&
      q.correctIndex <= 3 &&
      typeof q.category === "string" &&
      typeof q.difficulty === "string"
  );
  return ok ? payload.questions.map((q, i) => ({ id: `q${i + 1}`, ...q, explanation: q.explanation || "" })) : null;
}

/**
 * Looks up the user's most recent Technical MCQ attempts to build a set of
 * recently-seen bank question ids (`sourceId`), so the local fallback
 * generator can steer away from repeats via `pickFresh`.
 */
async function getRecentSourceIds(userId, limit = 3) {
  const recent = await Attempt.find({ user: userId, roundKey: "technical-mcq" })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("questions.sourceId")
    .lean();

  const ids = new Set();
  for (const attempt of recent) {
    for (const q of attempt.questions || []) {
      if (q.sourceId) ids.add(q.sourceId);
    }
  }
  return ids;
}

/**
 * Produces the 15-question set for a fresh Technical MCQ attempt. Tries
 * Groq first (tailored to the role); falls back to the local dynamic
 * generator, steering away from that user's recently-seen questions.
 */
async function generateTechnicalMcqQuestions({ role, company, userId }) {
  const context = company ? `${role} candidate interviewing at ${company}` : `${role} candidate`;
  const aiPayload = await groqJSON(GEN_SYSTEM_PROMPT, `Generate a fresh 15-question Technical MCQ set for a ${context}.`);
  const aiQuestions = validateAIQuestions(aiPayload);

  if (aiQuestions) {
    return { questions: aiQuestions, generatedBy: "ai" };
  }

  const excludeIds = await getRecentSourceIds(userId);
  return { questions: generateLocalQuestionSet(excludeIds), generatedBy: "fallback" };
}

function evaluateSubmission(attempt, submittedResponses) {
  return evaluateMCQSubmission(attempt, submittedResponses, {
    slowThresholdSeconds: SLOW_THRESHOLD_SECONDS,
    guessThresholdSeconds: GUESS_THRESHOLD_SECONDS,
  });
}

module.exports = {
  DURATION_SECONDS,
  generateTechnicalMcqQuestions,
  evaluateSubmission,
};
