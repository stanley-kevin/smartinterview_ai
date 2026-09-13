import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import toast from "react-hot-toast";
import {
  startSystemDesign,
  turnSystemDesign,
  scoreSystemDesign,
  getRoles,
} from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const COMPONENT_PRESETS = [
  { label: "Client App", bg: "#1E2430", border: "#4C7CFF" },
  { label: "CDN / Edge", bg: "#162B34", border: "#00C9A7" },
  { label: "Load Balancer", bg: "#2E2416", border: "#F5A623" },
  { label: "API Gateway", bg: "#2D1832", border: "#D80064" },
  { label: "App Service", bg: "#1A233A", border: "#4C7CFF" },
  { label: "Cache (Redis)", bg: "#361B1B", border: "#F2617A" },
  { label: "SQL Database", bg: "#1B3022", border: "#34D399" },
  { label: "NoSQL Database", bg: "#192B28", border: "#20C997" },
  { label: "Message Queue", bg: "#332211", border: "#FF8C00" },
  { label: "Object Storage", bg: "#222038", border: "#8A2BE2" },
];

const RUBRIC_LABELS = {
  scalabilityReasoning: "Scalability & Throughput Reasoning",
  failureHandling: "Failure Modes & Fault Tolerance",
  tradeOffAwareness: "Trade-off Awareness & Technology Selection",
  communicationAndClarity: "Communication & Architecture Clarity",
};

export default function SystemDesignRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const roleId = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading"); // loading | designing | scoring | feedback
  const [attemptId, setAttemptId] = useState(null);
  const [problem, setProblem] = useState(null);
  const [turns, setTurns] = useState([]);
  const [userText, setUserText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(5);
  const [isFinished, setIsFinished] = useState(false);
  const [result, setResult] = useState(null);

  // ReactFlow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeLabel, setSelectedNodeLabel] = useState(COMPONENT_PRESETS[0].label);

  const sideScrollRef = useRef(null);

  const onConnect = useCallback(
    (params) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "#4C7CFF", strokeWidth: 2 },
          },
          eds
        )
      ),
    [setEdges]
  );

  // --- Check Role Guard and Initialize ---
  useEffect(() => {
    if (!roleId) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    getRoles()
      .then((rolesList) => {
        const currentRole = rolesList.find((r) => r.id === roleId);
        if (currentRole && !currentRole.isAdvanced) {
          toast.error(`System Design is only available for Advanced Engineering roles (${currentRole.name} does not include System Design).`);
          navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
          return;
        }

        // Start round
        return startSystemDesign({ role: roleId, mode, company });
      })
      .then((data) => {
        if (!data) return;
        setAttemptId(data.attemptId);
        setProblem(data.problem);
        setTurns(data.turns || []);
        setQuestionNumber(data.questionNumber || 1);
        setTotalQuestions(data.totalQuestions || 5);

        // Pre-populate standard starter nodes
        const defaultNodes = [
          {
            id: "node-client",
            type: "default",
            data: { label: "Client Apps / Web" },
            position: { x: 50, y: 150 },
            style: { background: "#1E2430", color: "#ECEFF4", border: "1px solid #4C7CFF", borderRadius: "8px", padding: "10px" },
          },
          {
            id: "node-gateway",
            type: "default",
            data: { label: "API Gateway / LB" },
            position: { x: 280, y: 150 },
            style: { background: "#2D1832", color: "#ECEFF4", border: "1px solid #D80064", borderRadius: "8px", padding: "10px" },
          },
        ];
        const defaultEdges = [
          {
            id: "edge-client-gateway",
            source: "node-client",
            target: "node-gateway",
            animated: true,
            style: { stroke: "#4C7CFF", strokeWidth: 2 },
          },
        ];
        setNodes(defaultNodes);
        setEdges(defaultEdges);
        setPhase("designing");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || err.message || "Failed to initialize System Design round");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [roleId, mode, company, navigate, setNodes, setEdges]);

  useEffect(() => {
    sideScrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, isAiTyping]);

  const handleAddNode = (preset) => {
    if (nodes.length >= 20) {
      toast.error("Maximum 20 diagram components reached.");
      return;
    }

    const id = `node-${Date.now()}`;
    const xPos = 100 + (nodes.length % 4) * 160;
    const yPos = 80 + Math.floor(nodes.length / 4) * 110;

    const newNode = {
      id,
      type: "default",
      data: { label: preset.label },
      position: { x: xPos, y: yPos },
      style: {
        background: preset.bg,
        color: "#ECEFF4",
        border: `1px solid ${preset.border}`,
        borderRadius: "8px",
        padding: "10px",
        fontSize: "12px",
        fontWeight: "500",
      },
    };

    setNodes((nds) => nds.concat(newNode));
    toast.success(`Added ${preset.label}`);
  };

  const handleClearCanvas = () => {
    if (window.confirm("Clear the whiteboard canvas?")) {
      setNodes([]);
      setEdges([]);
    }
  };

  const handleSendTurn = async (e) => {
    e?.preventDefault();
    if (!userText.trim() || isAiTyping) return;

    const textToSend = userText.trim();
    setUserText("");

    const tempTurn = {
      id: `turn-local-${Date.now()}`,
      speaker: "candidate",
      text: textToSend,
      timestamp: new Date(),
    };
    setTurns((prev) => [...prev, tempTurn]);
    setIsAiTyping(true);

    try {
      const data = await turnSystemDesign({
        attemptId,
        diagram: { nodes, edges },
        userExplanation: textToSend,
      });

      setTurns(data.turns || []);
      setQuestionNumber(data.questionNumber || questionNumber);
      setTotalQuestions(data.totalQuestions || totalQuestions);

      if (data.isFinished) {
        setIsFinished(true);
        toast.success("System design discussion completed. Ready to submit for scoring!");
      } else if (data.pushedBack) {
        toast("Please elaborate with more architectural depth.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Turn generation failed. Please retry.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleSubmitScore = async () => {
    if (nodes.length < 2) {
      toast.error("Please add at least 2 connected components to your architecture diagram.");
      return;
    }

    setPhase("scoring");
    try {
      const data = await scoreSystemDesign({
        attemptId,
        finalDiagram: { nodes, edges },
      });
      setResult(data);
      setPhase("feedback");
      toast.success("System Design evaluation complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Scoring failed. Please try again.");
      setPhase("designing");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Preparing distributed architecture whiteboard & requirements…
        </div>
      </div>
    );
  }

  if (phase === "scoring") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="panel max-w-md p-8 text-center">
          <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-edge border-t-signal" />
          <h2 className="mt-4 font-display text-lg font-semibold text-text">
            Evaluating Whiteboard Architecture
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Analyzing component topology, throughput scalability, single points of failure, partition tolerance, and trade-off rationale…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return (
      <div className="min-h-screen bg-ink text-text">
        <header className="border-b border-edge/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link to="/dashboard"><Logo /></Link>
            <span className="tag-mono text-accent">System Design · Evaluation Report</span>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="tag-mono text-signal">Round Completed</span>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-text">
                System Design Results
              </h1>
            </div>
            <div className="flex items-baseline gap-2 rounded-xl border border-signal/30 bg-signal/10 px-5 py-3">
              <span className="font-display text-4xl font-bold text-signal">{result.score}%</span>
              <span className="text-xs text-text-muted">architecture score</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="panel mb-8 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              Executive Architectural Assessment
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text">
              {result.feedback?.summary}
            </p>
          </div>

          {/* 4-Pillar Rubric Breakdown */}
          <div className="mb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-text">
              Architecture Rubric Breakdown
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Object.entries(result.rubricScores || {}).map(([key, item]) => {
                const label = RUBRIC_LABELS[key] || key;
                const score = typeof item === "object" ? item.score : item;
                const note = typeof item === "object" ? item.feedback : null;
                return (
                  <div key={key} className="panel p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text">{label}</span>
                      <span className="font-mono text-sm font-semibold text-signal">{score}%</span>
                    </div>
                    <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full bg-signal transition-all duration-700"
                        style={{ width: `${Math.max(5, score)}%` }}
                      />
                    </div>
                    {note && (
                      <p className="mt-3 text-xs leading-relaxed text-text-muted">
                        {note}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strengths & Improvements */}
          <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="panel p-6">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-signal">
                <span>✓</span> Key Architecture Strengths
              </h3>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-text">
                {result.feedback?.strengths?.map((s, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 text-signal">•</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="panel p-6">
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-amber">
                <span>△</span> Key Architecture Refinements
              </h3>
              <ul className="mt-4 space-y-2 text-xs leading-relaxed text-text">
                {result.feedback?.improvements?.map((imp, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-0.5 text-amber">•</span>
                    <span>{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-edge/60 pt-6">
            <Link
              to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}
              className="btn-primary"
            >
              Continue to next round →
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-ink text-text">
      {/* Header */}
      <header className="shrink-0 border-b border-edge/60 bg-surface/80 backdrop-blur px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard"><Logo /></Link>
            <span className="h-4 w-px bg-edge" />
            <span className="text-xs font-medium text-text-muted">
              {mode === "company" ? `${company?.toUpperCase()} System Design` : "System Design Whiteboard Round"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full border border-edge bg-surface-2 px-3 py-1 text-xs">
              <span className="font-mono text-accent">
                Turn {Math.min(questionNumber, totalQuestions)} of {totalQuestions}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSubmitScore}
              className="btn-primary !px-4 !py-1.5 text-xs shadow-md shadow-accent/25"
            >
              Submit Design →
            </button>
            <Link
              to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}
              className="text-xs text-text-muted hover:text-text"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split Screen */}
      <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.25fr_0.95fr]">
        {/* Left: Whiteboard Canvas */}
        <div className="relative flex flex-col border-r border-edge/60 bg-[#0E1117]">
          {/* Node Palette Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-edge/60 bg-surface/70 px-4 py-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                Add Component:
              </span>
              {COMPONENT_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => handleAddNode(p)}
                  className="rounded border border-edge bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text hover:border-accent/50 hover:bg-surface"
                >
                  + {p.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-text-muted">
                {nodes.length}/20 nodes
              </span>
              <button
                type="button"
                onClick={handleClearCanvas}
                className="text-[11px] text-rose hover:underline"
              >
                Clear
              </button>
            </div>
          </div>

          {/* ReactFlow Interactive Canvas */}
          <div className="relative flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
              fitViewOptions={{ padding: 0.2 }}
            >
              <Background color="#262D3A" gap={16} size={1} />
              <Controls className="!bg-surface !border-edge" />
              <MiniMap
                nodeColor={() => "#4C7CFF"}
                maskColor="rgba(14, 17, 22, 0.8)"
                className="!bg-surface !border-edge"
              />
            </ReactFlow>

            {/* Quick Tips Floating Overlay */}
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg border border-edge/80 bg-surface/90 px-3 py-2 text-[11px] text-text-muted backdrop-blur">
              💡 Drag nodes to position · Drag from handles (circles) to connect data flows
            </div>
          </div>
        </div>

        {/* Right: Problem Statement & AI Discussion Panel */}
        <div className="flex flex-col overflow-hidden bg-surface/40">
          {/* Problem Header Accordion */}
          <div className="shrink-0 border-b border-edge/60 bg-surface/70 p-4">
            <span className="tag-mono text-signal">System Scenario</span>
            <h2 className="mt-1 font-display text-base font-semibold text-text">
              {problem?.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-text-muted">
              {problem?.description}
            </p>

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="rounded border border-edge/40 bg-surface/60 p-2.5">
                <span className="block font-mono text-[10px] uppercase text-accent">
                  Functional Requirements
                </span>
                <ul className="mt-1 space-y-1 text-[11px] text-text">
                  {problem?.functionalRequirements?.slice(0, 3).map((r, i) => (
                    <li key={i} className="truncate">• {r}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded border border-edge/40 bg-surface/60 p-2.5">
                <span className="block font-mono text-[10px] uppercase text-signal">
                  Scale & Constraints
                </span>
                <ul className="mt-1 space-y-1 text-[11px] text-text">
                  {problem?.nonFunctionalRequirements?.slice(0, 3).map((r, i) => (
                    <li key={i} className="truncate">• {r}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Conversation Log */}
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {turns.map((turn, idx) => {
              const isInterviewer = turn.speaker === "interviewer";
              const isPushback = turn.isPushback;

              return (
                <div
                  key={turn.id || idx}
                  className={`flex gap-3 ${isInterviewer ? "items-start" : "flex-row-reverse items-start"}`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-mono font-semibold ${
                      isInterviewer
                        ? isPushback
                          ? "border-amber/50 bg-amber/10 text-amber"
                          : "border-accent/40 bg-accent/15 text-accent"
                        : "border-signal/40 bg-signal/15 text-signal"
                    }`}
                  >
                    {isInterviewer ? (isPushback ? "!" : "AI") : "YOU"}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                      isInterviewer
                        ? isPushback
                          ? "border border-amber/30 bg-amber/5 text-amber-200"
                          : "border border-edge bg-surface text-text shadow-sm"
                        : "border border-accent/40 bg-accent/15 text-text"
                    }`}
                  >
                    <div className="mb-1 flex items-center justify-between gap-4 text-[10px] text-text-faint">
                      <span className="font-semibold text-text-muted">
                        {isInterviewer
                          ? isPushback
                            ? "Interviewer (Elaboration)"
                            : "Principal Systems Architect"
                          : "You"}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap">{turn.text}</div>
                  </div>
                </div>
              );
            })}

            {isAiTyping && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.4s]" />
                <span className="ml-2 text-[11px]">Architect is analyzing your whiteboard diagram & formulating follow-up…</span>
              </div>
            )}

            <div ref={sideScrollRef} />
          </div>

          {/* Explanation Input Bar */}
          <div className="shrink-0 border-t border-edge/60 bg-surface/60 p-4">
            {isFinished ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-text-muted">
                  Discussion completed. Ready to submit your architecture diagram.
                </span>
                <button
                  type="button"
                  onClick={handleSubmitScore}
                  className="btn-primary shrink-0 !py-2 text-xs"
                >
                  Submit & Score Architecture →
                </button>
              </div>
            ) : (
              <form onSubmit={handleSendTurn} className="space-y-2">
                <div className="relative">
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendTurn();
                      }
                    }}
                    disabled={isAiTyping}
                    rows={3}
                    placeholder="Explain your whiteboard diagram, data flow paths, database partitioning, or trade-offs..."
                    className="field-input resize-none pr-28 text-xs"
                  />
                  <button
                    type="submit"
                    disabled={!userText.trim() || isAiTyping}
                    className="btn-primary absolute bottom-3 right-3 !px-3 !py-1.5 text-xs"
                  >
                    Send & Update →
                  </button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-faint">
                  <span>Press Enter to send explanation with current diagram snapshot.</span>
                  <span>{userText.length} characters</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
