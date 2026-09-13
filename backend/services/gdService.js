const Attempt = require("../models/Attempt");
const { groqChat } = require("./groqService");

const TOPICS = [
  {
    topic: "Is Generative AI replacing entry-level software engineers or elevating their role?",
    context:
      "With tools like GitHub Copilot, ChatGPT, and automated coding agents, the bar for junior developers is shifting from syntax memorization to systems thinking, verification, and domain logic.",
    personas: [
      {
        id: "aditi",
        name: "Aditi",
        role: "Tech Lead & AI Advocate",
        stance: "pro-acceleration",
        avatar: "AD",
        color: "#06B6D4",
        style: "Passionate about tooling leverage, believes productivity gains empower juniors to solve higher-level architecture problems earlier.",
      },
      {
        id: "rahul",
        name: "Rahul",
        role: "Pragmatic Systems Architect",
        stance: "cautious-practical",
        avatar: "RH",
        color: "#F59E0B",
        style: "Focuses on foundational fundamentals, code maintainability, security, and debugging debt that AI code can introduce.",
      },
      {
        id: "sneha",
        name: "Sneha",
        role: "Product & Engineering Manager",
        stance: "balanced-collaborative",
        avatar: "SN",
        color: "#10B981",
        style: "Emphasizes team communication, code ownership, mentorship pipelines, and business outcomes over raw generation speed.",
      },
    ],
    initialOpening:
      "Welcome everyone. Today's discussion centers on whether Generative AI is displacing entry-level engineers or elevating their capabilities. Aditi, would you like to kick us off?",
    aditiOpening:
      "Thanks! Looking at recent trends, AI is dramatically eliminating repetitive boilerplate. Instead of spending hours writing CRUD endpoints, engineers can focus on core domain modeling and test verification from day one.",
  },
  {
    topic: "Monolithic Architecture vs Microservices: When should modern startups make the shift?",
    context:
      "Startups face a dilemma between speed-to-market with a modular monolith and scalability/isolation with distributed microservices.",
    personas: [
      {
        id: "aditi",
        name: "Aditi",
        role: "Cloud Native Engineer",
        stance: "pro-microservices",
        avatar: "AD",
        color: "#06B6D4",
        style: "Advocates for independent deployability, fault isolation, and technology flexibility.",
      },
      {
        id: "rahul",
        name: "Rahul",
        role: "Principal Infrastructure Lead",
        stance: "pro-monolith-first",
        avatar: "RH",
        color: "#F59E0B",
        style: "Warns about distributed tracing complexity, network latency, DevOps overhead, and eventual consistency traps.",
      },
      {
        id: "sneha",
        name: "Sneha",
        role: "VP of Engineering",
        stance: "pragmatic-evolutionary",
        avatar: "SN",
        color: "#10B981",
        style: "Stresses that organizational structure and team boundaries should dictate architecture, not tech hype.",
      },
    ],
    initialOpening:
      "Let's begin our discussion on Monolithic vs Microservices architecture for scaling organizations. Rahul, how do you view this trade-off?",
    rahulOpening:
      "Premature distribution is the root of massive complexity. A clean modular monolith gives early teams high velocity, zero network RPC latency, and simple deployments until traffic actually warrants splitting.",
  },
  {
    topic: "Remote Work vs Return to Office: What truly maximizes engineering velocity and culture?",
    context:
      "Engineering teams debate asynchronous documentation and global talent vs spontaneous whiteboard collaboration and team bonding.",
    personas: [
      {
        id: "aditi",
        name: "Aditi",
        role: "Senior Distributed Engineer",
        stance: "pro-remote-async",
        avatar: "AD",
        color: "#06B6D4",
        style: "Believes deep uninterrupted focus time and async RFCs produce higher quality code and wider talent pools.",
      },
      {
        id: "rahul",
        name: "Rahul",
        role: "Engineering Director",
        stance: "pro-in-person-collaboration",
        avatar: "RH",
        color: "#F59E0B",
        style: "Highlights rapid incident triaging, casual cross-functional mentorship, and creative brainstorming in shared physical spaces.",
      },
      {
        id: "sneha",
        name: "Sneha",
        role: "Agile Coach & People Partner",
        stance: "hybrid-intentional",
        avatar: "SN",
        color: "#10B981",
        style: "Believes intentional gathering for sprint planning and retrospective plus remote focus days offers the sweet spot.",
      },
    ],
    initialOpening:
      "Welcome team. Today we explore engineering velocity and culture in Remote vs In-Office setups. Sneha, what are your initial thoughts?",
    snehaOpening:
      "It comes down to intentionality. Remote work requires strong async documentation culture, while in-office accelerates early ideation. Neither works without clear team trust and alignment.",
  },
];

/**
 * Start a Group Discussion session
 */
async function startGD({ userId, role, company, mode }) {
  const chosenTopic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

  const initialTurns = [
    {
      id: "turn-0",
      speaker: "Moderator",
      speakerType: "system",
      text: chosenTopic.initialOpening,
      timestamp: new Date(),
    },
    {
      id: "turn-1",
      speaker: chosenTopic.personas[0].name,
      personaId: chosenTopic.personas[0].id,
      speakerType: "ai",
      text: chosenTopic.aditiOpening || chosenTopic.rahulOpening || chosenTopic.snehaOpening,
      timestamp: new Date(),
    },
  ];

  const attempt = await Attempt.create({
    user: userId,
    mode,
    company: company || null,
    role,
    roundKey: "group-discussion",
    status: "in-progress",
    gdData: {
      topic: chosenTopic.topic,
      topicContext: chosenTopic.context,
      personas: chosenTopic.personas,
      turns: initialTurns,
      rubricScores: null,
    },
  });

  return {
    attemptId: attempt._id,
    topic: chosenTopic.topic,
    topicContext: chosenTopic.context,
    personas: chosenTopic.personas,
    turns: initialTurns,
  };
}

/**
 * Generate next AI turn in response to the user's latest input
 */
async function nextTurnGD({ attemptId, userId, userText }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Group Discussion attempt not found");
  }

  const { topic, personas, turns = [] } = attempt.gdData;

  // Add user's turn
  const userTurn = {
    id: `turn-${turns.length + 1}`,
    speaker: "You",
    speakerType: "user",
    text: userText.trim(),
    timestamp: new Date(),
  };
  turns.push(userTurn);

  // Pick next AI persona (rotate speakers)
  const lastAiTurn = [...turns].reverse().find((t) => t.speakerType === "ai");
  const lastPersonaId = lastAiTurn?.personaId;
  const eligiblePersonas = personas.filter((p) => p.id !== lastPersonaId);
  const nextPersona =
    eligiblePersonas[Math.floor(Math.random() * eligiblePersonas.length)] || personas[0];

  // Try LLM generation
  let aiResponseText = null;
  const conversationContext = turns
    .map((t) => `${t.speaker} (${t.speakerType}): ${t.text}`)
    .join("\n");

  const systemPrompt = `You are playing ${nextPersona.name} in a simulated job interview Group Discussion on the topic: "${topic}".
Persona Profile:
- Role: ${nextPersona.role}
- Stance: ${nextPersona.stance}
- Style: ${nextPersona.style}

Instructions:
1. Speak in first person as ${nextPersona.name}.
2. Keep your response concise (2-4 sentences max), conversational, and realistic.
3. Acknowledge and directly build upon or constructively challenge the user's ("You") recent points.
4. Conclude with a thought-provoking perspective or question to move the discussion forward.
5. Return JSON with the exact key "reply".`;

  const userPrompt = `Discussion transcript so far:\n${conversationContext}\n\nProvide ${nextPersona.name}'s next contribution.`;

  try {
    const aiResult = await groqChat([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ], { json: true, temperature: 0.7 });

    if (aiResult && aiResult.reply) {
      aiResponseText = aiResult.reply.trim();
    }
  } catch (err) {
    console.error("[gd] AI turn generation failed, using dynamic fallback:", err.message);
  }

  // Fallback if AI call returns null
  if (!aiResponseText) {
    aiResponseText = generateFallbackGDTurn(nextPersona, userText, topic);
  }

  const aiTurn = {
    id: `turn-${turns.length + 1}`,
    speaker: nextPersona.name,
    personaId: nextPersona.id,
    speakerType: "ai",
    text: aiResponseText,
    timestamp: new Date(),
  };
  turns.push(aiTurn);

  attempt.gdData.turns = turns;
  attempt.markModified("gdData");
  await attempt.save();

  return {
    aiTurn,
    turns,
    totalUserTurns: turns.filter((t) => t.speakerType === "user").length,
  };
}

/**
 * Evaluate and score the Group Discussion
 */
async function scoreGD({ attemptId, userId }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Group Discussion attempt not found");
  }

  const { topic, turns = [] } = attempt.gdData;
  const userTurns = turns.filter((t) => t.speakerType === "user");

  if (userTurns.length === 0) {
    throw new Error("You must contribute at least one point before concluding the discussion.");
  }

  const transcriptText = turns
    .map((t) => `[${t.speaker}]: ${t.text}`)
    .join("\n");

  let evaluation = null;

  const scorePrompt = `You are a Senior Bar Raiser assessing a candidate in a Group Discussion interview.
Topic: "${topic}"

Full Transcript:
${transcriptText}

Candidate is denoted as "[You]".

Evaluate the candidate's performance across 5 criteria (0-100 each):
1. contentRelevance: Did they address the core problem with domain-appropriate insights?
2. communicationClarity: Was the phrasing concise, articulate, and professional?
3. collaborationListening: Did they acknowledge and build upon peers' points rather than speaking in isolation?
4. initiative: Did they introduce fresh perspectives, structure ideas, or drive the conversation forward?
5. structure: Were their arguments logically sequenced (cause-effect, examples, synthesis)?

Return JSON with this exact schema:
{
  "score": number (0-100 weighted aggregate),
  "rubricScores": {
    "contentRelevance": number,
    "communicationClarity": number,
    "collaborationListening": number,
    "initiative": number,
    "structure": number
  },
  "summary": "2-3 sentences summarizing overall impact",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"]
}`;

  try {
    const aiScoreResult = await groqChat([
      { role: "system", content: "You are an expert GD hiring evaluator. Always return strictly valid JSON matching the requested schema." },
      { role: "user", content: scorePrompt },
    ], { json: true, temperature: 0.3 });

    if (aiScoreResult && typeof aiScoreResult.score === "number") {
      evaluation = aiScoreResult;
    }
  } catch (err) {
    console.error("[gd] AI score evaluation failed, using dynamic rubric fallback:", err.message);
  }

  if (!evaluation) {
    evaluation = evaluateFallbackGD(userTurns, turns);
  }

  // Ensure bounded numbers
  const finalScore = Math.min(100, Math.max(0, Math.round(evaluation.score || 75)));

  attempt.score = finalScore;
  attempt.status = "completed";
  attempt.completedAt = new Date();
  attempt.gdData.rubricScores = evaluation.rubricScores;
  attempt.feedback = {
    summary: evaluation.summary,
    strengths: evaluation.strengths || ["Engaged constructively with the panel", "Articulated viewpoints clearly"],
    improvements: evaluation.improvements || ["Incorporate more quantifiable real-world metrics into arguments", "Proactively summarize consensus points"],
  };

  attempt.markModified("gdData");
  attempt.markModified("feedback");
  await attempt.save();

  return {
    attemptId: attempt._id,
    score: finalScore,
    rubricScores: evaluation.rubricScores,
    feedback: attempt.feedback,
    turns: attempt.gdData.turns,
    topic: attempt.gdData.topic,
  };
}

/**
 * Fallback dynamic turn generator
 */
function generateFallbackGDTurn(persona, userText, topic) {
  const acknowledges = [
    `That's a very valid point regarding how practical workflows evolve.`,
    `I appreciate that perspective, and I'd like to extend that thought further.`,
    `Building on what was just highlighted, we also have to consider organizational trade-offs.`,
    `I agree with that core premise, though from a risk and scalability standpoint there's another angle.`,
  ];
  const ack = acknowledges[Math.floor(Math.random() * acknowledges.length)];

  if (persona.stance.includes("cautious") || persona.stance.includes("monolith") || persona.stance.includes("in-person")) {
    return `${ack} In my experience, when teams rush ahead without establishing solid monitoring and foundational standards, hidden technical debt accumulates quickly. How do you suggest we balance rapid velocity with reliability?`;
  } else if (persona.stance.includes("pro-acceleration") || persona.stance.includes("microservices") || persona.stance.includes("remote")) {
    return `${ack} Giving engineers the leverage and autonomy to deploy and iterate independently is what drives top-tier velocity. If we provide the right guardrails, the upside significantly outweighs the friction. What guardrails would you prioritize?`;
  } else {
    return `${ack} Finding the middle ground is critical. The best approach is usually evolutionary—starting lean with strong observability, and adapting as team scale dictates. What do you think is the biggest risk if we over-index on either extreme?`;
  }
}

/**
 * Fallback dynamic rubric evaluation
 */
function evaluateFallbackGD(userTurns, allTurns) {
  const totalUserWords = userTurns.reduce((acc, t) => acc + t.text.split(/\s+/).length, 0);
  const avgWordsPerTurn = Math.round(totalUserWords / Math.max(1, userTurns.length));
  const turnCount = userTurns.length;

  let contentRelevance = 75;
  let communicationClarity = 78;
  let collaborationListening = 72;
  let initiative = 70;
  let structure = 74;

  if (turnCount >= 3) initiative += 10;
  if (avgWordsPerTurn >= 25 && avgWordsPerTurn <= 100) communicationClarity += 10;
  if (totalUserWords > 80) contentRelevance += 10;

  // Check collaborative keywords
  const textBlob = userTurns.map((t) => t.text.toLowerCase()).join(" ");
  if (
    textBlob.includes("agree") ||
    textBlob.includes("building on") ||
    textBlob.includes("point") ||
    textBlob.includes("trade-off") ||
    textBlob.includes("consider")
  ) {
    collaborationListening += 14;
    structure += 8;
  }

  contentRelevance = Math.min(96, Math.max(55, contentRelevance));
  communicationClarity = Math.min(95, Math.max(60, communicationClarity));
  collaborationListening = Math.min(95, Math.max(55, collaborationListening));
  initiative = Math.min(94, Math.max(50, initiative));
  structure = Math.min(95, Math.max(55, structure));

  const weightedScore = Math.round(
    contentRelevance * 0.25 +
      communicationClarity * 0.2 +
      collaborationListening * 0.25 +
      initiative * 0.15 +
      structure * 0.15
  );

  return {
    score: weightedScore,
    rubricScores: {
      contentRelevance,
      communicationClarity,
      collaborationListening,
      initiative,
      structure,
    },
    summary: `Demonstrated solid communicative presence across ${turnCount} speaking turns, contributing structured ideas and maintaining good collaborative rapport with the panel.`,
    strengths: [
      "Articulated logical reasoning and practical examples during discussion turns",
      "Maintained a professional, constructive conversational tone with peers",
      "Engaged effectively with the core prompt trade-offs",
    ],
    improvements: [
      "Incorporate more data points or real-world architectural metrics to substantiate claims",
      "Proactively synthesize differing peer arguments into actionable consensus",
    ],
  };
}

module.exports = {
  startGD,
  nextTurnGD,
  scoreGD,
};
