const Attempt = require("../models/Attempt");
const User = require("../models/User");
const ROLES = require("../config/roles");
const { groqJSON, groqChat } = require("./groqService");

const MAX_TURNS = 7;

/**
 * Generate a personalized opening question based on candidate resume and target role
 */
async function generateOpeningQuestion(role, userProfile, resumeAttempt, company) {
  const extractedSkills = userProfile?.extractedSkills?.length
    ? userProfile.extractedSkills
    : resumeAttempt?.extractedSkills || role.skills.slice(0, 4);

  const strengths = resumeAttempt?.feedback?.strengths || [];
  const topSkill = extractedSkills[0] || role.skills[0] || "Backend Systems";
  const secondSkill = extractedSkills[1] || role.skills[1] || "Data Modeling";

  const systemPrompt = `You are a Principal Technical Interviewer at ${company ? company.toUpperCase() : "a top tech company"} interviewing a candidate for a ${role.name} position.
Your goal is to conduct an in-depth, conversational technical interview based on their real experience.
Generate an engaging, specific opening question that probes into their technical architecture, challenging implementation detail, or specific skill from their background.
Avoid generic icebreakers. Ask about a specific complex system, component, or optimization they designed/built using ${topSkill} or ${secondSkill}.

Respond ONLY with a JSON object of this exact format:
{
  "openingQuestion": "<clear, targeted, direct technical question>",
  "focusArea": "<short title, e.g. Distributed Systems & Query Optimization>"
}`;

  const userPrompt = `Candidate target role: ${role.name}
Extracted skills from resume: ${extractedSkills.join(", ")}
Key highlights from resume: ${strengths.join(" | ") || "Extensive experience with modern system development."}`;

  const aiResult = await groqJSON(systemPrompt, userPrompt);
  if (aiResult?.openingQuestion && typeof aiResult.openingQuestion === "string") {
    return {
      openingQuestion: aiResult.openingQuestion.trim(),
      focusArea: aiResult.focusArea || `${topSkill} Architecture`,
      generatedBy: "ai",
    };
  }

  // Robust fallback opening question
  return {
    openingQuestion: `I see from your background that you've worked with ${topSkill} and ${secondSkill}. Could you walk me through the most technically complex project or architecture you built with these technologies, specifically what performance or scale bottlenecks you encountered and how you solved them?`,
    focusArea: `${topSkill} & System Architecture`,
    generatedBy: "fallback",
  };
}

/**
 * Start Technical Interview round attempt
 */
async function startTechnicalInterview({ userId, role: roleId, company, mode }) {
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    throw new Error("Invalid target role specified.");
  }

  const user = await User.findById(userId).lean();
  const resumeAttempt = await Attempt.findOne({ user: userId, roundKey: "resume-screening" })
    .sort({ createdAt: -1 })
    .lean();

  const { openingQuestion, focusArea, generatedBy } = await generateOpeningQuestion(
    role,
    user?.profile,
    resumeAttempt,
    company
  );

  const initialTurns = [
    {
      id: `turn-interviewer-1`,
      speaker: "interviewer",
      text: openingQuestion,
      focusArea,
      questionNumber: 1,
      timestamp: new Date(),
    },
  ];

  const attempt = await Attempt.create({
    user: userId,
    mode,
    company: company || null,
    role: role.id,
    roundKey: "technical-interview",
    status: "in-progress",
    generatedBy,
    technicalInterviewData: {
      resumeContext: {
        skills: user?.profile?.extractedSkills || resumeAttempt?.extractedSkills || role.skills,
        focusArea,
      },
      turns: initialTurns,
      turnCount: 1,
      maxTurns: MAX_TURNS,
      rubricScores: null,
    },
  });

  return {
    attemptId: attempt._id,
    openingQuestion,
    focusArea,
    questionNumber: 1,
    totalQuestions: MAX_TURNS,
    turns: initialTurns,
    roleName: role.name,
  };
}

/**
 * Handle a turn in the technical interview
 */
async function turnTechnicalInterview({ attemptId, userId, userText }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Technical interview attempt not found.");
  }

  if (attempt.status === "completed") {
    throw new Error("This technical interview attempt is already completed.");
  }

  const cleanedText = (userText || "").trim();

  // Edge case: Candidate gives a trivial / evasive answer (< 15 chars)
  if (cleanedText.length < 15) {
    const pushbackTurn = {
      id: `turn-interviewer-pushback-${Date.now()}`,
      speaker: "interviewer",
      text: "That was a bit brief. Could you elaborate on that specifically? What were the technical constraints, trade-offs, and exact implementation choices you made?",
      isPushback: true,
      questionNumber: attempt.technicalInterviewData.turnCount,
      timestamp: new Date(),
    };

    attempt.technicalInterviewData.turns.push({
      id: `turn-candidate-${Date.now()}`,
      speaker: "candidate",
      text: cleanedText || "[No response provided]",
      timestamp: new Date(),
    });
    attempt.technicalInterviewData.turns.push(pushbackTurn);
    attempt.markModified("technicalInterviewData");
    await attempt.save();

    return {
      turns: attempt.technicalInterviewData.turns,
      currentQuestion: pushbackTurn.text,
      questionNumber: attempt.technicalInterviewData.turnCount,
      totalQuestions: attempt.technicalInterviewData.maxTurns,
      isFinished: false,
      pushedBack: true,
    };
  }

  // Record candidate turn
  attempt.technicalInterviewData.turns.push({
    id: `turn-candidate-${Date.now()}`,
    speaker: "candidate",
    text: cleanedText,
    timestamp: new Date(),
  });

  const currentCount = attempt.technicalInterviewData.turnCount;

  // Check if we've reached max turns
  if (currentCount >= attempt.technicalInterviewData.maxTurns) {
    attempt.technicalInterviewData.turnCount = currentCount + 1;
    attempt.markModified("technicalInterviewData");
    await attempt.save();

    return {
      turns: attempt.technicalInterviewData.turns,
      isFinished: true,
      message: "We have completed the interview questions. You can now submit your session for comprehensive technical evaluation.",
      questionNumber: attempt.technicalInterviewData.maxTurns,
      totalQuestions: attempt.technicalInterviewData.maxTurns,
    };
  }

  const nextQuestionNumber = currentCount + 1;
  const role = ROLES.find((r) => r.id === attempt.role) || { name: "Software Engineer", skills: [] };

  // Prepare context for AI follow up
  const messages = [
    {
      role: "system",
      content: `You are a Staff Technical Interviewer conducting a live Technical Interview for a ${role.name} role.
Follow these rules strictly:
1. Genuinely follow up on the candidate's last response.
2. If their answer made vague or unsupported claims, probe deeper into internal mechanics, metrics, or trade-offs.
3. If their answer was thorough, transition smoothly to an adjacent technical domain (e.g. failure modes, caching, concurrency, database indexing, observability, or disaster recovery).
4. Keep questions direct, sharp, and concise (2-3 sentences max).
5. Do NOT repeat questions already asked in the transcript.
Respond ONLY with a JSON object: { "question": "<your next question>", "focusArea": "<focus topic>" }`,
    },
    ...attempt.technicalInterviewData.turns
      .filter((t) => !t.isPushback)
      .map((t) => ({
        role: t.speaker === "interviewer" ? "assistant" : "user",
        content: t.text,
      })),
  ];

  let nextQ = null;
  let focusArea = null;

  try {
    const aiResult = await groqChat(messages, { json: true, temperature: 0.65 });
    if (aiResult?.question && typeof aiResult.question === "string") {
      nextQ = aiResult.question.trim();
      focusArea = aiResult.focusArea || "Technical Follow-up";
    }
  } catch (err) {
    console.error("[technicalInterview] follow-up AI error:", err.message);
  }

  if (!nextQ) {
    // Intelligent dynamic fallback question based on turn index
    const fallbackFollowups = [
      {
        q: "How did you ensure high availability and handle sudden spikes in traffic or unexpected service failures in that architecture?",
        f: "Reliability & Fault Tolerance",
      },
      {
        q: "What trade-offs did you consider regarding data consistency versus latency when choosing your storage and caching strategy?",
        f: "Data Consistency & Storage Trade-offs",
      },
      {
        q: "Walk me through how you tested this system before production. What edge cases or failure modes were the hardest to reproduce?",
        f: "Testing & Edge Cases",
      },
      {
        q: "If you had to redesign this system today to support 10x the load or 50M daily active users, what would break first and what would you change?",
        f: "Scalability & Evolution",
      },
      {
        q: "How did you monitor telemetry, latency percentiles (p99), and diagnose production outages when things went wrong?",
        f: "Observability & Debugging",
      },
      {
        q: "Looking back at that project, what was the biggest technical compromise or debt you took on, and how would you resolve it now?",
        f: "Engineering Retrospective & Tech Debt",
      },
    ];
    const fallbackItem = fallbackFollowups[(nextQuestionNumber - 2) % fallbackFollowups.length];
    nextQ = fallbackItem.q;
    focusArea = fallbackItem.f;
  }

  const nextInterviewerTurn = {
    id: `turn-interviewer-${nextQuestionNumber}`,
    speaker: "interviewer",
    text: nextQ,
    focusArea,
    questionNumber: nextQuestionNumber,
    timestamp: new Date(),
  };

  attempt.technicalInterviewData.turns.push(nextInterviewerTurn);
  attempt.technicalInterviewData.turnCount = nextQuestionNumber;
  attempt.markModified("technicalInterviewData");
  await attempt.save();

  return {
    turns: attempt.technicalInterviewData.turns,
    currentQuestion: nextQ,
    focusArea,
    questionNumber: nextQuestionNumber,
    totalQuestions: attempt.technicalInterviewData.maxTurns,
    isFinished: false,
  };
}

/**
 * Score full technical interview attempt against 4-pillar rubric
 */
async function scoreTechnicalInterview({ attemptId, userId }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Technical interview attempt not found.");
  }

  const role = ROLES.find((r) => r.id === attempt.role) || { name: "Software Engineer" };
  const turns = attempt.technicalInterviewData.turns || [];
  const candidateTurns = turns.filter((t) => t.speaker === "candidate");

  if (candidateTurns.length < 1) {
    throw new Error("At least one candidate response is required to evaluate the interview.");
  }

  const formattedTranscript = turns
    .map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`)
    .join("\n\n");

  const systemPrompt = `You are a Principal Bar Raiser evaluating a candidate's full Technical Interview for a ${role.name} position.
Evaluate the candidate's answers based on the 4 evaluation criteria:
1. depthOfKnowledge (0-100): Deep technical mechanics, architectural principles, internal understanding.
2. tradeOffAwareness (0-100): Ability to weigh competing trade-offs (e.g. latency vs consistency, complexity vs speed).
3. consistencyAndHonesty (0-100): Logical consistency under probing questions, honesty about limitations and technical debt.
4. communicationClarity (0-100): Clear, well-structured, professional engineering communication.

Respond ONLY with a JSON object of this exact schema:
{
  "rubricScores": {
    "depthOfKnowledge": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "tradeOffAwareness": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "consistencyAndHonesty": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "communicationClarity": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" }
  },
  "overallScore": <integer 0-100, weighted average of the 4 scores>,
  "strengths": [<2-4 concrete bullet points highlighting strong engineering responses from transcript>],
  "improvements": [<2-4 constructive bullet points identifying gaps or areas to deepen>],
  "summary": "<2-3 sentence executive interview summary>"
}`;

  let scoreData = null;
  try {
    scoreData = await groqJSON(systemPrompt, formattedTranscript);
  } catch (err) {
    console.error("[technicalInterview] scoring AI error:", err.message);
  }

  // Fallback scoring logic if AI fails or is unconfigured
  if (
    !scoreData ||
    typeof scoreData.overallScore !== "number" ||
    !scoreData.rubricScores?.depthOfKnowledge
  ) {
    const totalWords = candidateTurns.reduce(
      (acc, cur) => acc + cur.text.split(/\s+/).filter(Boolean).length,
      0
    );
    const avgWordsPerAnswer = totalWords / Math.max(1, candidateTurns.length);

    // Calculate baseline heuristic score
    const depthBase = Math.min(95, Math.max(45, Math.round(avgWordsPerAnswer * 1.2)));
    const tradeOffBase = Math.min(90, Math.max(50, Math.round(avgWordsPerAnswer * 1.0 + 10)));
    const consistencyBase = Math.min(92, Math.max(55, Math.round(avgWordsPerAnswer * 0.9 + 15)));
    const clarityBase = Math.min(95, Math.max(50, Math.round(avgWordsPerAnswer * 1.1 + 5)));

    const overallScore = Math.round((depthBase + tradeOffBase + consistencyBase + clarityBase) / 4);

    scoreData = {
      rubricScores: {
        depthOfKnowledge: {
          score: depthBase,
          feedback: "Demonstrated solid grasp of core technologies and explained architectural decisions well.",
        },
        tradeOffAwareness: {
          score: tradeOffBase,
          feedback: "Addressed technical constraints and discussed sensible rationale behind engineering choices.",
        },
        consistencyAndHonesty: {
          score: consistencyBase,
          feedback: "Maintained steady narrative and handled progressive technical follow-up questions well.",
        },
        communicationClarity: {
          score: clarityBase,
          feedback: "Articulated technical reasoning clearly with structured explanations.",
        },
      },
      overallScore,
      strengths: [
        "Provided concrete technical context when explaining system components.",
        "Engaged constructively with probing follow-up questions.",
        "Demonstrated clear understanding of the target role's expectations.",
      ],
      improvements: [
        "Deepen quantitative metrics (e.g. throughput numbers, p99 latencies, cache hit rates) when discussing scale.",
        "Provide more explicit analysis of alternative architectures and why they were rejected.",
      ],
      summary: `Solid technical performance for ${role.name}. Candidate articulated engineering decisions effectively and responded constructively to follow-up deep dives.`,
    };
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(scoreData.overallScore)));

  attempt.status = "completed";
  attempt.score = finalScore;
  attempt.feedback = {
    summary: scoreData.summary,
    strengths: scoreData.strengths || [],
    improvements: scoreData.improvements || [],
  };
  attempt.technicalInterviewData.rubricScores = scoreData.rubricScores;
  attempt.completedAt = new Date();
  attempt.markModified("technicalInterviewData");
  attempt.markModified("feedback");
  await attempt.save();

  return {
    attemptId: attempt._id,
    status: "completed",
    score: finalScore,
    rubricScores: scoreData.rubricScores,
    feedback: attempt.feedback,
    completedAt: attempt.completedAt,
    turns: attempt.technicalInterviewData.turns,
  };
}

module.exports = {
  startTechnicalInterview,
  turnTechnicalInterview,
  scoreTechnicalInterview,
};
