const Attempt = require("../models/Attempt");
const { groqChat } = require("./groqService");

const BEHAVIORAL_QUESTION_BANK = [
  {
    id: "hr-conflict",
    category: "Conflict Resolution & Teamwork",
    question: "Tell me about a time you had a technical disagreement with a team member or lead. How did you handle it, and what was the outcome?",
    hints: [
      "Situation: Set up the project context and what the disagreement was about.",
      "Task: What needed to be decided or delivered without stalling momentum?",
      "Action: How did you listen, prototype, find objective data, or reach alignment?",
      "Result: What was the final technical choice and the impact on the team/project?",
    ],
  },
  {
    id: "hr-deadline",
    category: "Prioritization & Pressure",
    question: "Describe a situation where you had multiple high-priority tasks and an impending deadline. How did you prioritize your workload?",
    hints: [
      "Situation: Detail the competing deadlines and initial scope.",
      "Task: Clarify what was mission-critical vs nice-to-have.",
      "Action: How did you communicate with stakeholders, cut scope, or optimize execution?",
      "Result: Was the deliverable shipped on time and what lessons did you apply?",
    ],
  },
  {
    id: "hr-failure",
    category: "Ownership & Continuous Learning",
    question: "Tell me about a mistake you made or a project that didn't go as planned. What did you learn and how did you resolve it?",
    hints: [
      "Situation: Be honest about the bug, oversight, or incorrect assumption.",
      "Task: What was your responsibility in resolving the immediate problem?",
      "Action: What concrete steps did you take to fix the issue and prevent recurrence?",
      "Result: What post-mortem, guardrails, or improved standards emerged?",
    ],
  },
  {
    id: "hr-leadership",
    category: "Leadership & Initiative",
    question: "Give an example of a time you stepped up to lead an initiative or improve a process without being explicitly asked.",
    hints: [
      "Situation: Identify the inefficient process, tech debt, or onboarding gap.",
      "Task: What inspired you to take proactive ownership?",
      "Action: How did you design the solution and rally peers or team members?",
      "Result: Quantifiable time saved, error reduction, or team velocity boost.",
    ],
  },
];

/**
 * Start a Behavioral / HR Round attempt
 */
async function startHR({ userId, role, company, mode }) {
  const questions = BEHAVIORAL_QUESTION_BANK.map((q) => ({
    id: q.id,
    category: q.category,
    question: q.question,
    hints: q.hints,
  }));

  const attempt = await Attempt.create({
    user: userId,
    mode,
    company: company || null,
    role,
    roundKey: "behavioral",
    status: "in-progress",
    hrData: {
      questions,
      answers: [],
      starSummary: null,
    },
  });

  return {
    attemptId: attempt._id,
    questions,
    totalQuestions: questions.length,
  };
}

/**
 * Evaluate single question answer with STAR methodology
 */
async function evaluateSingleAnswer({ attemptId, userId, questionId, answerText }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Behavioral / HR attempt not found");
  }

  const questionObj = attempt.hrData.questions.find((q) => q.id === questionId);
  if (!questionObj) {
    throw new Error(`Question ${questionId} not found`);
  }

  const cleanedText = answerText.trim();
  if (cleanedText.length < 20) {
    throw new Error("Answer is too brief. Please elaborate using the STAR method (Situation, Task, Action, Result).");
  }

  let evaluation = null;

  const prompt = `You are a Senior Bar Raiser assessing a candidate's answer to the following behavioral interview question:
Question: "${questionObj.question}"

Candidate's Answer:
"${cleanedText}"

Evaluate the answer strictly using the STAR methodology (Situation, Task, Action, Result).
Return JSON with this schema:
{
  "star": {
    "situation": boolean (did they explain the background/context?),
    "task": boolean (did they define the exact problem or responsibility?),
    "action": boolean (did they describe specific actions they personally took?),
    "result": boolean (did they describe quantifiable results, outcomes, or learnings?)
  },
  "clarityScore": number (0-100),
  "score": number (0-100 overall grade for this answer),
  "feedback": "2-3 sentences of direct feedback pointing out what was strong and what STAR components to deepen"
}`;

  try {
    const aiResult = await groqChat([
      { role: "system", content: "You are an expert HR and behavioral interviewer. Return strictly JSON." },
      { role: "user", content: prompt },
    ], { json: true, temperature: 0.3 });

    if (aiResult && aiResult.star) {
      evaluation = aiResult;
    }
  } catch (err) {
    console.error("[hr] AI answer evaluation failed:", err.message);
  }

  if (!evaluation) {
    evaluation = evaluateFallbackHRAnswer(cleanedText);
  }

  const answerEntry = {
    questionId,
    questionText: questionObj.question,
    category: questionObj.category,
    answerText: cleanedText,
    starScores: evaluation.star,
    clarityScore: evaluation.clarityScore || 75,
    score: evaluation.score || 75,
    feedback: evaluation.feedback || "Good response structure. Ensure specific action items and measurable outcomes are highlighted.",
  };

  // Upsert answer in Attempt
  const existingAnswers = attempt.hrData.answers.filter((a) => a.questionId !== questionId);
  existingAnswers.push(answerEntry);
  attempt.hrData.answers = existingAnswers;
  attempt.markModified("hrData");
  await attempt.save();

  return answerEntry;
}

/**
 * Conclude and aggregate full HR round
 */
async function scoreHR({ attemptId, userId }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Behavioral / HR attempt not found");
  }

  const answers = attempt.hrData.answers || [];
  const questions = attempt.hrData.questions || [];

  if (answers.length < 1) {
    throw new Error("Please answer at least one question before concluding.");
  }

  const totalPossible = questions.length;
  const answeredCount = answers.length;

  const avgAnswerScore = Math.round(
    answers.reduce((sum, a) => sum + (a.score || 70), 0) / Math.max(1, answeredCount)
  );

  // Penalty if skipped questions
  const completenessFactor = answeredCount / totalPossible;
  const finalScore = Math.min(100, Math.max(0, Math.round(avgAnswerScore * completenessFactor)));

  // Calculate STAR overall metrics
  const starTotals = {
    situation: 0,
    task: 0,
    action: 0,
    result: 0,
  };

  answers.forEach((a) => {
    if (a.starScores?.situation) starTotals.situation++;
    if (a.starScores?.task) starTotals.task++;
    if (a.starScores?.action) starTotals.action++;
    if (a.starScores?.result) starTotals.result++;
  });

  const starSummary = {
    situationPct: Math.round((starTotals.situation / answeredCount) * 100),
    taskPct: Math.round((starTotals.task / answeredCount) * 100),
    actionPct: Math.round((starTotals.action / answeredCount) * 100),
    resultPct: Math.round((starTotals.result / answeredCount) * 100),
  };

  const summary = `Candidate completed ${answeredCount}/${totalPossible} behavioral questions, demonstrating ${
    finalScore >= 75 ? "strong" : "developing"
  } competency in structured communication and ownership narratives.`;

  const strengths = [];
  if (starSummary.actionPct >= 75) strengths.push("Strong articulation of personal agency and technical actions taken");
  if (starSummary.resultPct >= 75) strengths.push("Consistently highlighted measurable business impact and retrospective learnings");
  if (starSummary.situationPct >= 75) strengths.push("Clear problem framing and contextual setup");
  if (strengths.length === 0) strengths.push("Clear communication and structured responses");

  const improvements = [];
  if (starSummary.resultPct < 75) improvements.push("Quantify results with specific metrics (e.g., % latency drop, days saved)");
  if (starSummary.taskPct < 75) improvements.push("Explicitly define your specific individual mandate vs general team goals");
  if (answeredCount < totalPossible) improvements.push(`Complete all ${totalPossible} questions to maximize aggregate rating`);
  if (improvements.length === 0) improvements.push("Continue practicing concise storytelling under tight time constraints");

  attempt.score = finalScore;
  attempt.status = "completed";
  attempt.completedAt = new Date();
  attempt.hrData.starSummary = starSummary;
  attempt.feedback = {
    summary,
    strengths,
    improvements,
  };

  attempt.markModified("hrData");
  attempt.markModified("feedback");
  await attempt.save();

  return {
    attemptId: attempt._id,
    score: finalScore,
    starSummary,
    answers,
    feedback: attempt.feedback,
  };
}

function evaluateFallbackHRAnswer(text) {
  const lower = text.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  const hasSituation =
    wordCount > 30 ||
    lower.includes("when") ||
    lower.includes("project") ||
    lower.includes("team") ||
    lower.includes("working on");
  const hasTask =
    lower.includes("task") ||
    lower.includes("goal") ||
    lower.includes("needed to") ||
    lower.includes("responsible for") ||
    lower.includes("challenge");
  const hasAction =
    lower.includes("i decided") ||
    lower.includes("i implemented") ||
    lower.includes("i communicated") ||
    lower.includes("my approach") ||
    lower.includes("i took") ||
    lower.includes("i created");
  const hasResult =
    lower.includes("result") ||
    lower.includes("outcome") ||
    lower.includes("finally") ||
    lower.includes("learned") ||
    lower.includes("improved") ||
    lower.includes("delivered");

  const componentsCount = [hasSituation, hasTask, hasAction, hasResult].filter(Boolean).length;
  let score = 55 + componentsCount * 10;
  if (wordCount >= 60 && wordCount <= 250) score += 5;

  return {
    star: {
      situation: hasSituation,
      task: hasTask,
      action: hasAction,
      result: hasResult,
    },
    clarityScore: Math.min(95, score),
    score: Math.min(95, score),
    feedback:
      componentsCount >= 3
        ? "Good structured answer with clear personal contributions and context."
        : "Make sure to explicitly cover all four STAR elements: context, problem, specific actions, and measurable outcome.",
  };
}

module.exports = {
  startHR,
  evaluateSingleAnswer,
  scoreHR,
};
