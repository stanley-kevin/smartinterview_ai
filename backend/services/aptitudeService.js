const { groqJSON } = require("./groqService");
const { generateLocalQuestionSet, CATEGORIES } = require("../config/aptitudeBank");
const { evaluateMCQSubmission } = require("./mcqEvaluation");

const DURATION_SECONDS = 25 * 60; // 25 minutes
const SLOW_THRESHOLD_SECONDS = 75; // spending this long on one MCQ suggests it was genuinely hard, or attention drifted
const GUESS_THRESHOLD_SECONDS = 6; // answering this fast rarely reflects reading the question

const SUBTYPES_BY_CATEGORY = {
  [CATEGORIES.quant]: ["Percentage / Profit & Loss", "Time & Work / Speed", "Ratio / Simplification"],
  [CATEGORIES.logical]: ["Number Series", "Coding-Decoding", "Puzzle / Pattern"],
  [CATEGORIES.verbal]: ["Synonym / Vocabulary", "Sentence Correction", "Reading Comprehension"],
  [CATEGORIES.di]: ["Table-based question", "Bar graph question", "Percentage analysis"],
  [CATEGORIES.mixed]: ["Logical + Math combination", "Case-based problem", "Trick question / Critical thinking"],
};

const GEN_SYSTEM_PROMPT = `You generate aptitude test questions for a job-interview practice platform, targeted at a candidate applying for a specific role. Generate exactly 15 multiple-choice questions, structured as 5 categories with exactly 3 questions each, in this exact order and using these exact category/subtype labels:

${Object.entries(SUBTYPES_BY_CATEGORY)
  .map(([cat, subs]) => `- ${cat}: ${subs.join(", ")}`)
  .join("\n")}

Each question must have exactly 4 options with exactly one correct answer. Vary the numbers and wording so questions feel fresh. Keep quantitative questions solvable with clean arithmetic (avoid ugly decimals).

Respond ONLY with a JSON object of this exact shape:
{
  "questions": [
    { "category": "<one of the 5 category names above, exactly>", "subtype": "<matching subtype label, exactly>", "prompt": "<question text>", "options": ["<opt1>","<opt2>","<opt3>","<opt4>"], "correctIndex": <0-3>, "explanation": "<one sentence why>" }
  ]
}
Return exactly 15 items in the array, in the category order given above. Do not include any text outside the JSON object.`;

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
      typeof q.subtype === "string"
  );
  return ok ? payload.questions.map((q, i) => ({ id: `q${i + 1}`, ...q, explanation: q.explanation || "" })) : null;
}

/**
 * Produces the 15-question set for a fresh attempt. Tries Groq first (so
 * questions can be tailored to the role/company); falls back to the local
 * dynamic generator — which is itself randomized — on any failure.
 */
async function generateAptitudeQuestions({ role, company }) {
  const context = company ? `${role} candidate interviewing at ${company}` : `${role} candidate`;
  const aiPayload = await groqJSON(GEN_SYSTEM_PROMPT, `Generate a fresh 15-question aptitude set for a ${context}.`);
  const aiQuestions = validateAIQuestions(aiPayload);

  if (aiQuestions) {
    return { questions: aiQuestions, generatedBy: "ai" };
  }
  return { questions: generateLocalQuestionSet(), generatedBy: "fallback" };
}

function evaluateSubmission(attempt, submittedResponses) {
  return evaluateMCQSubmission(attempt, submittedResponses, {
    slowThresholdSeconds: SLOW_THRESHOLD_SECONDS,
    guessThresholdSeconds: GUESS_THRESHOLD_SECONDS,
  });
}

module.exports = {
  DURATION_SECONDS,
  generateAptitudeQuestions,
  evaluateSubmission,
};
