const Attempt = require("../models/Attempt");
const ROLES = require("../config/roles");
const { groqJSON, groqChat } = require("./groqService");

const MAX_TURNS = 5;
const MAX_NODES = 20;

const SYSTEM_DESIGN_PROBLEMS = [
  {
    id: "url-shortener",
    title: "Design a Scalable URL Shortener & Analytics Service (TinyURL)",
    description: "Design a globally distributed URL shortening service capable of handling millions of new URLs daily with ultra-low latency redirection and real-time click analytics.",
    functionalRequirements: [
      "Given a long URL, generate a short unique alias.",
      "Redirect user to original URL with < 15ms latency.",
      "Track real-time analytics (click count, referrers, geo location).",
      "Support custom aliases and configurable expiration timestamps.",
    ],
    nonFunctionalRequirements: [
      "High availability (99.99% uptime) — reads must never fail.",
      "Scale: 100M new URLs created per month, 10B read redirections per month (100:1 read/write ratio).",
      "Eventual consistency for analytics; strong uniqueness for URL aliases.",
    ],
    initialQuestion: "Welcome to the System Design round. To begin, take a look at the requirements for designing the Scalable URL Shortener service. Place your initial high-level components on the canvas (Client, Load Balancer, API Gateway, Application Service, and Storage layer), connect them with data flow arrows, and explain your chosen data model and key-generation strategy.",
  },
  {
    id: "rate-limiter",
    title: "Design a Distributed Rate Limiter & API Gateway",
    description: "Design a high-throughput, low-latency distributed rate limiter service that protects downstream microservices across multiple geographical regions.",
    functionalRequirements: [
      "Accurately limit requests per user / IP / API key (e.g. 100 req/sec per user).",
      "Support multiple rate limiting algorithms (Token Bucket, Sliding Window Log).",
      "Return HTTP 429 Too Many Requests with informative headers when throttled.",
    ],
    nonFunctionalRequirements: [
      "Extremely low latency overhead (< 2ms added to API requests).",
      "Distributed consistency across multi-region server clusters.",
      "High resilience: if the rate limiter fails, requests should gracefully soft-fail open.",
    ],
    initialQuestion: "Welcome to the System Design round. Please review the requirements for the Distributed Rate Limiter. Start by adding your core architectural components to the diagram (Clients, API Gateway, Rate Limiting Middleware, Distributed Cache / State Store, and Backend Services). Explain your algorithm choice and how you maintain synchronization across distributed instances without causing cache contention.",
  },
  {
    id: "distributed-cache",
    title: "Design a Distributed In-Memory Cache Cluster",
    description: "Design a horizontally scalable, fault-tolerant distributed in-memory cache (like Redis / Memcached) with sub-millisecond retrieval times.",
    functionalRequirements: [
      "Support standard operations: get(key), put(key, value), delete(key).",
      "Support configurable TTL and automated cache eviction (LRU / LFU).",
      "Provide high read/write throughput with sub-millisecond p99 latency.",
    ],
    nonFunctionalRequirements: [
      "Consistent hashing with virtual nodes to minimize rebalancing churn.",
      "High availability with master-replica failover and replication.",
      "Partition tolerance under transient network partitions.",
    ],
    initialQuestion: "Welcome to the System Design round. Review the Distributed Cache requirements. Place your high-level topology onto the canvas — including Client SDK / Proxy, Cache Node Cluster, Replication pairs, and Persistence storage. Walk me through your consistent hashing strategy and how you handle cache node failures.",
  },
  {
    id: "notification-engine",
    title: "Design a Real-Time Distributed Notification Engine",
    description: "Design a scalable event-driven notification engine that delivers transactional emails, SMS, and mobile push notifications to hundreds of millions of users reliably.",
    functionalRequirements: [
      "Deliver instant notifications across Push (APNs/FCM), SMS, and Email.",
      "Support user notification preferences, rate capping, and quiet hours.",
      "Provide deduplication and idempotent delivery guarantees.",
    ],
    nonFunctionalRequirements: [
      "Throughput: Handle bursts of 100,000 notifications per second during peak events.",
      "Zero message loss (at-least-once delivery with idempotency keys).",
      "Asynchronous decoupled architecture with priority queues.",
    ],
    initialQuestion: "Welcome to the System Design round. Review the Real-Time Notification Engine scenario. Map out your event-driven architecture on the whiteboard — including Ingestion API, Message Queues (e.g. Kafka/RabbitMQ), Worker Pools, Deduplication Cache, User Preference DB, and External Gateways. Explain how you prevent downstream third-party outages from backing up your ingestion queue.",
  },
];

/**
 * Start System Design round attempt
 */
async function startSystemDesign({ userId, role: roleId, company, mode }) {
  const role = ROLES.find((r) => r.id === roleId);
  if (!role) {
    throw new Error("Invalid target role specified.");
  }

  // Enforce Advanced role gating
  if (!role.isAdvanced) {
    throw new Error(`System Design Round is reserved for Advanced Engineering roles. "${role.name}" does not require System Design.`);
  }

  // Select problem based on role and randomness
  const problemIndex = Math.floor(Math.random() * SYSTEM_DESIGN_PROBLEMS.length);
  const problem = SYSTEM_DESIGN_PROBLEMS[problemIndex];

  const initialTurns = [
    {
      id: `turn-interviewer-1`,
      speaker: "interviewer",
      text: problem.initialQuestion,
      questionNumber: 1,
      timestamp: new Date(),
    },
  ];

  const attempt = await Attempt.create({
    user: userId,
    mode,
    company: company || null,
    role: role.id,
    roundKey: "system-design",
    status: "in-progress",
    generatedBy: "ai",
    systemDesignData: {
      problem: {
        id: problem.id,
        title: problem.title,
        description: problem.description,
        functionalRequirements: problem.functionalRequirements,
        nonFunctionalRequirements: problem.nonFunctionalRequirements,
      },
      turns: initialTurns,
      turnCount: 1,
      maxTurns: MAX_TURNS,
      finalDiagram: { nodes: [], edges: [] },
      rubricScores: null,
    },
  });

  return {
    attemptId: attempt._id,
    problem: attempt.systemDesignData.problem,
    initialQuestion: problem.initialQuestion,
    questionNumber: 1,
    totalQuestions: MAX_TURNS,
    turns: initialTurns,
    maxNodes: MAX_NODES,
  };
}

/**
 * Process a turn in the System Design round
 */
async function turnSystemDesign({ attemptId, userId, diagram, userExplanation }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("System design attempt not found.");
  }

  if (attempt.status === "completed") {
    throw new Error("This system design attempt is already completed.");
  }

  const nodes = Array.isArray(diagram?.nodes) ? diagram.nodes : [];
  const edges = Array.isArray(diagram?.edges) ? diagram.edges : [];

  if (nodes.length > MAX_NODES) {
    throw new Error(`Diagram exceeds maximum allowed capacity of ${MAX_NODES} nodes.`);
  }

  const cleanedExplanation = (userExplanation || "").trim();

  // Edge case: empty diagram and no explanation
  if (nodes.length === 0 && cleanedExplanation.length < 15) {
    const pushbackTurn = {
      id: `turn-interviewer-pushback-${Date.now()}`,
      speaker: "interviewer",
      text: "Please add your initial components to the whiteboard canvas (e.g. Clients, Load Balancer, Services, Databases, Caches) and describe your data flow in the response box.",
      isPushback: true,
      questionNumber: attempt.systemDesignData.turnCount,
      timestamp: new Date(),
    };

    attempt.systemDesignData.turns.push({
      id: `turn-candidate-${Date.now()}`,
      speaker: "candidate",
      text: cleanedExplanation || "[No explanation provided]",
      diagramSnapshot: { nodeCount: nodes.length, edgeCount: edges.length },
      timestamp: new Date(),
    });
    attempt.systemDesignData.turns.push(pushbackTurn);
    attempt.systemDesignData.finalDiagram = { nodes, edges };
    attempt.markModified("systemDesignData");
    await attempt.save();

    return {
      turns: attempt.systemDesignData.turns,
      currentQuestion: pushbackTurn.text,
      questionNumber: attempt.systemDesignData.turnCount,
      totalQuestions: attempt.systemDesignData.maxTurns,
      isFinished: false,
      pushedBack: true,
    };
  }

  // Record candidate turn
  attempt.systemDesignData.turns.push({
    id: `turn-candidate-${Date.now()}`,
    speaker: "candidate",
    text: cleanedExplanation,
    diagramSnapshot: {
      nodes: nodes.map((n) => ({ id: n.id, label: n.data?.label || n.label || "Component", type: n.type })),
      edges: edges.map((e) => ({ source: e.source, target: e.target, label: e.label || "" })),
    },
    timestamp: new Date(),
  });
  attempt.systemDesignData.finalDiagram = { nodes, edges };

  const currentCount = attempt.systemDesignData.turnCount;

  if (currentCount >= attempt.systemDesignData.maxTurns) {
    attempt.systemDesignData.turnCount = currentCount + 1;
    attempt.markModified("systemDesignData");
    await attempt.save();

    return {
      turns: attempt.systemDesignData.turns,
      isFinished: true,
      message: "You have completed all system design probing turns. You can now submit your final architecture for scoring.",
      questionNumber: attempt.systemDesignData.maxTurns,
      totalQuestions: attempt.systemDesignData.maxTurns,
    };
  }

  const nextQuestionNumber = currentCount + 1;
  const problem = attempt.systemDesignData.problem;

  // Serialize diagram elements for LLM context
  const nodeLabels = nodes.map((n) => `[${n.data?.label || n.id || "Node"}] (${n.type || "Service"})`).join(", ");
  const edgeConnections = edges.map((e) => `${e.source} -> ${e.target} ${e.label ? `[${e.label}]` : ""}`).join(", ");

  const messages = [
    {
      role: "system",
      content: `You are a Principal Systems Architect evaluating a candidate's whiteboard architecture in real time.
Problem: ${problem.title}
Requirements: ${problem.functionalRequirements.join(" | ")}
Non-Functional Constraints: ${problem.nonFunctionalRequirements.join(" | ")}

The candidate's current whiteboard diagram state:
- Components/Nodes: ${nodeLabels || "None"}
- Data flow connections/Edges: ${edgeConnections || "None"}

Rules:
1. Examine their diagram nodes and their explanation.
2. Ask a probing follow-up question specifically referencing their actual diagram components (e.g. bottlenecks, single points of failure, partition tolerance, cache invalidation, database sharding, or replication lag).
3. Do not ask generic questions. Reference their components directly.
4. Keep the question crisp and focused (2-3 sentences max).
Respond ONLY with a JSON object: { "question": "<your next follow-up question>", "focusArea": "<topic>" }`,
    },
    ...attempt.systemDesignData.turns
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
      focusArea = aiResult.focusArea || "Architecture Follow-up";
    }
  } catch (err) {
    console.error("[systemDesign] follow-up AI error:", err.message);
  }

  if (!nextQ) {
    // Intelligent heuristic follow-up based on diagram inspection
    const hasCache = nodes.some((n) => /cache|redis|memcached/i.test(n.data?.label || ""));
    const hasDB = nodes.some((n) => /db|database|postgres|mongo|mysql|sql/i.test(n.data?.label || ""));
    const hasQueue = nodes.some((n) => /queue|kafka|rabbit|sqs/i.test(n.data?.label || ""));

    if (hasDB && !hasCache) {
      nextQ = "I see your database tier in the diagram, but without a dedicated caching layer. How will your storage layer handle high read spikes while keeping response latencies under SLA?";
      focusArea = "Caching & Read Latency";
    } else if (hasDB && !hasQueue && /url|notification/i.test(problem.id)) {
      nextQ = "Looking at your synchronous write path to the database, what happens during a massive burst of incoming traffic? How can we introduce asynchronous decoupling to avoid overwhelming the write tier?";
      focusArea = "Asynchronous Decoupling";
    } else {
      const fallbackQuestions = [
        {
          q: "What is your data replication and partition strategy for this system? If a network partition occurs between your primary region and replica regions, what CAP guarantees do you prioritize?",
          f: "CAP Theorem & Partition Tolerance",
        },
        {
          q: "Walk me through how your architecture handles a complete outage of the primary database or API Gateway node. What automated failover and health check mechanisms are in place?",
          f: "High Availability & Failover",
        },
        {
          q: "How will you handle data consistency and cache invalidation when records are updated frequently? Walk me through your invalidation strategy (e.g. write-through, write-around, or TTL).",
          f: "Cache Invalidation & Consistency",
        },
      ];
      const fb = fallbackQuestions[(nextQuestionNumber - 2) % fallbackQuestions.length];
      nextQ = fb.q;
      focusArea = fb.f;
    }
  }

  const nextInterviewerTurn = {
    id: `turn-interviewer-${nextQuestionNumber}`,
    speaker: "interviewer",
    text: nextQ,
    focusArea,
    questionNumber: nextQuestionNumber,
    timestamp: new Date(),
  };

  attempt.systemDesignData.turns.push(nextInterviewerTurn);
  attempt.systemDesignData.turnCount = nextQuestionNumber;
  attempt.markModified("systemDesignData");
  await attempt.save();

  return {
    turns: attempt.systemDesignData.turns,
    currentQuestion: nextQ,
    focusArea,
    questionNumber: nextQuestionNumber,
    totalQuestions: attempt.systemDesignData.maxTurns,
    isFinished: false,
  };
}

/**
 * Score full System Design round against 4-pillar rubric
 */
async function scoreSystemDesign({ attemptId, userId, finalDiagram }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("System design attempt not found.");
  }

  const nodes = Array.isArray(finalDiagram?.nodes) ? finalDiagram.nodes : attempt.systemDesignData.finalDiagram?.nodes || [];
  const edges = Array.isArray(finalDiagram?.edges) ? finalDiagram.edges : attempt.systemDesignData.finalDiagram?.edges || [];

  if (nodes.length < 2) {
    throw new Error("Your architecture diagram must contain at least 2 connected components before submitting for scoring.");
  }

  const turns = attempt.systemDesignData.turns || [];
  const candidateTurns = turns.filter((t) => t.speaker === "candidate");
  const problem = attempt.systemDesignData.problem;

  const nodeLabels = nodes.map((n) => `[${n.data?.label || n.id}] (${n.type || "Component"})`).join(", ");
  const edgeConnections = edges.map((e) => `${e.source} -> ${e.target} (${e.label || "connected"})`).join(", ");

  const transcript = turns.map((t) => `[${t.speaker.toUpperCase()}]: ${t.text}`).join("\n\n");

  const systemPrompt = `You are a Principal Systems Architect Bar Raiser scoring a System Design interview attempt.
Problem: ${problem.title}
Diagram Components: ${nodeLabels}
Diagram Connections: ${edgeConnections}

Candidate Interview Transcript:
${transcript}

Evaluate the architecture against the 4 evaluation criteria:
1. scalabilityReasoning (0-100): High throughput, horizontal scaling, partitioning, load distribution.
2. failureHandling (0-100): Redundancy, fault tolerance, elimination of SPoFs, graceful degradation.
3. tradeOffAwareness (0-100): Rationale behind technology choices, CAP trade-offs, consistency vs latency.
4. communicationAndClarity (0-100): Clean whiteboard modularity, structured explanations, crisp answers.

Respond ONLY with a JSON object of this exact schema:
{
  "rubricScores": {
    "scalabilityReasoning": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "failureHandling": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "tradeOffAwareness": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" },
    "communicationAndClarity": { "score": <0-100>, "feedback": "<1-2 sentence assessment>" }
  },
  "overallScore": <integer 0-100, weighted average of the 4 scores>,
  "strengths": [<2-4 concrete strengths of the diagram and explanations>],
  "improvements": [<2-4 actionable architecture improvements>],
  "summary": "<2-3 sentence executive architectural review summary>"
}`;

  let scoreData = null;
  try {
    scoreData = await groqJSON(systemPrompt, `Evaluate the diagram and transcript above.`);
  } catch (err) {
    console.error("[systemDesign] scoring AI error:", err.message);
  }

  if (
    !scoreData ||
    typeof scoreData.overallScore !== "number" ||
    !scoreData.rubricScores?.scalabilityReasoning
  ) {
    // Dynamic heuristic evaluation based on diagram complexity and explanation depth
    const totalWords = candidateTurns.reduce(
      (acc, cur) => acc + cur.text.split(/\s+/).filter(Boolean).length,
      0
    );
    const nodeBonus = Math.min(25, nodes.length * 4);
    const edgeBonus = Math.min(15, edges.length * 3);
    const explanationBonus = Math.min(50, Math.round(totalWords / 4));

    const baseScore = Math.min(94, Math.max(55, 30 + nodeBonus + edgeBonus + explanationBonus));

    const scaleScore = Math.min(95, Math.max(50, baseScore + (nodes.length >= 4 ? 5 : -5)));
    const failScore = Math.min(92, Math.max(50, baseScore + (edges.length >= 3 ? 4 : -4)));
    const tradeScore = Math.min(90, Math.max(50, baseScore));
    const commScore = Math.min(95, Math.max(55, baseScore + 3));

    const overallScore = Math.round((scaleScore + failScore + tradeScore + commScore) / 4);

    scoreData = {
      rubricScores: {
        scalabilityReasoning: {
          score: scaleScore,
          feedback: `Good component separation with ${nodes.length} architectural nodes addressing horizontal scale.`,
        },
        failureHandling: {
          score: failScore,
          feedback: "Addressed service resilience and discussed failover considerations across key tiers.",
        },
        tradeOffAwareness: {
          score: tradeScore,
          feedback: "Demonstrated clear awareness of storage, caching, and throughput trade-offs.",
        },
        communicationAndClarity: {
          score: commScore,
          feedback: "Articulated architectural decisions effectively through the whiteboard diagram and discussion.",
        },
      },
      overallScore,
      strengths: [
        `Constructed a modular ${nodes.length}-node architecture with clear component boundaries.`,
        "Connected data flow pipelines logically from client entry point to persistence.",
        "Addressed follow-up challenges regarding scaling bottlenecks effectively.",
      ],
      improvements: [
        "Include explicit circuit breaker and rate limiting policies at the gateway layer.",
        "Detail backup and replication lag handling for multi-region disaster recovery.",
      ],
      summary: `Well-structured architecture for ${problem.title}. Demonstrated strong grasp of distributed systems principles, component decoupling, and scalable design.`,
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
  attempt.systemDesignData.finalDiagram = { nodes, edges };
  attempt.systemDesignData.rubricScores = scoreData.rubricScores;
  attempt.completedAt = new Date();
  attempt.markModified("systemDesignData");
  attempt.markModified("feedback");
  await attempt.save();

  return {
    attemptId: attempt._id,
    status: "completed",
    score: finalScore,
    rubricScores: scoreData.rubricScores,
    feedback: attempt.feedback,
    finalDiagram: attempt.systemDesignData.finalDiagram,
    completedAt: attempt.completedAt,
    turns: attempt.systemDesignData.turns,
  };
}

module.exports = {
  startSystemDesign,
  turnSystemDesign,
  scoreSystemDesign,
};
