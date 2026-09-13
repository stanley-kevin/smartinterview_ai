import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { startGD, turnGD, scoreGD } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const RUBRIC_LABELS = {
  contentRelevance: "Content Relevance & Domain Depth",
  communicationClarity: "Communication Clarity & Articulation",
  collaborationListening: "Collaboration & Active Listening",
  initiative: "Initiative & Conversation Leadership",
  structure: "Logical Structure & Synthesis",
};

export default function GroupDiscussionRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading"); // loading | discussing | evaluating | feedback
  const [attemptId, setAttemptId] = useState(null);
  const [topic, setTopic] = useState("");
  const [topicContext, setTopicContext] = useState("");
  const [personas, setPersonas] = useState([]);
  const [turns, setTurns] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [typingPersona, setTypingPersona] = useState(null);
  const [result, setResult] = useState(null);

  const chatBottomRef = useRef(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns, isAiTyping]);

  // --- Initialize GD ---
  useEffect(() => {
    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    startGD({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setTopic(data.topic);
        setTopicContext(data.topicContext || "");
        setPersonas(data.personas || []);
        setTurns(data.turns || []);
        setPhase("discussing");
      })
      .catch((err) => {
        toast.error(err.message || "Failed to initialize Group Discussion");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [role, mode, company, navigate]);

  const handleSendTurn = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isAiTyping) return;

    const userText = inputText.trim();
    setInputText("");

    // Optimistically show user message
    const tempUserTurn = {
      id: `turn-local-${Date.now()}`,
      speaker: "You",
      speakerType: "user",
      text: userText,
      timestamp: new Date(),
    };
    setTurns((prev) => [...prev, tempUserTurn]);

    // Randomize next persona indicator
    const nextP = personas[Math.floor(Math.random() * personas.length)] || { name: "Panelist" };
    setTypingPersona(nextP.name);
    setIsAiTyping(true);

    try {
      const data = await turnGD({
        attemptId,
        userText,
      });
      setTurns(data.turns || []);
    } catch (err) {
      toast.error(err.message || "Error generating response. Please try again.");
    } finally {
      setIsAiTyping(false);
      setTypingPersona(null);
    }
  };

  const handleEndDiscussion = async () => {
    const userTurnCount = turns.filter((t) => t.speakerType === "user").length;
    if (userTurnCount < 1) {
      toast.error("Please contribute at least one point before concluding.");
      return;
    }

    setPhase("evaluating");
    try {
      const data = await scoreGD({ attemptId });
      setResult(data);
      setPhase("feedback");
      toast.success("Group discussion successfully evaluated!");
    } catch (err) {
      toast.error(err.message || "Evaluation failed. Please try again.");
      setPhase("discussing");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Setting up group discussion room & panel personas…
        </div>
      </div>
    );
  }

  if (phase === "evaluating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <div className="text-base font-medium text-text">Analyzing discussion transcript…</div>
          <div className="text-xs text-text-muted max-w-sm">
            Evaluating communication clarity, domain relevance, collaboration dynamics, and leadership.
          </div>
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return (
      <GDFeedback
        result={result}
        mode={mode}
        company={company}
        navigate={navigate}
        topic={topic}
      />
    );
  }

  const userTurnCount = turns.filter((t) => t.speakerType === "user").length;
  const canEnd = userTurnCount >= 2;

  return (
    <div className="flex h-screen flex-col bg-ink text-text">
      {/* Header */}
      <header className="shrink-0 border-b border-edge/60 bg-ink/95 px-6 py-3.5">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}>
              <Logo />
            </Link>
            <span className="hidden tag-mono text-accent sm:inline">Round 4 · Group Discussion</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border border-edge bg-surface-2 px-3 py-1 font-mono text-xs text-text-muted">
              <span className="h-2 w-2 rounded-full bg-signal animate-pulse" />
              {userTurnCount} {userTurnCount === 1 ? "turn" : "turns"} spoken
            </div>

            <button
              onClick={handleEndDiscussion}
              disabled={userTurnCount < 1}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                canEnd
                  ? "bg-accent text-white hover:bg-accent/90"
                  : userTurnCount >= 1
                  ? "border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
                  : "border border-edge bg-surface text-text-faint opacity-40 cursor-not-allowed"
              }`}
            >
              Conclude & Score
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        {/* Topic Banner */}
        <div className="mb-3 shrink-0 rounded-lg border border-edge bg-surface p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="tag-mono text-accent">Discussion Topic</span>
            <div className="flex items-center gap-2">
              {personas.map((p) => (
                <span
                  key={p.id}
                  className="hidden items-center gap-1.5 rounded-full border border-edge bg-surface-2 px-2.5 py-0.5 text-[11px] text-text-muted sm:inline-flex"
                >
                  <span
                    className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: p.color || "#06B6D4" }}
                  >
                    {p.avatar || p.name[0]}
                  </span>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
          <h2 className="mt-1 text-sm font-semibold text-text sm:text-base leading-snug">{topic}</h2>
          {topicContext && (
            <p className="mt-1 text-xs text-text-muted line-clamp-2">{topicContext}</p>
          )}
        </div>

        {/* Chat Transcript Stream */}
        <div className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-edge/60 bg-ink-2/50 p-4 scrollbar-thin">
          {turns.map((turn, i) => {
            const isUser = turn.speakerType === "user";
            const isSystem = turn.speakerType === "system";
            const persona = personas.find((p) => p.id === turn.personaId || p.name === turn.speaker);

            if (isSystem) {
              return (
                <div key={turn.id || i} className="flex justify-center my-2">
                  <div className="max-w-lg rounded-full border border-edge/80 bg-surface-2 px-4 py-1.5 text-center text-xs text-text-muted">
                    📢 <span className="font-medium text-text">{turn.speaker}:</span> {turn.text}
                  </div>
                </div>
              );
            }

            return (
              <div
                key={turn.id || i}
                className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
              >
                {!isUser && (
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold text-white shadow"
                    style={{ backgroundColor: persona?.color || "#06B6D4" }}
                  >
                    {persona?.avatar || turn.speaker[0]}
                  </div>
                )}

                <div className={`max-w-xl ${isUser ? "text-right" : "text-left"}`}>
                  <div className="mb-1 flex items-center gap-2 text-xs">
                    {isUser ? (
                      <>
                        <span className="text-[10px] text-text-faint">Candidate</span>
                        <span className="font-semibold text-accent">You</span>
                      </>
                    ) : (
                      <>
                        <span className="font-semibold text-text">{turn.speaker}</span>
                        {persona?.role && (
                          <span className="text-[11px] text-text-faint">· {persona.role}</span>
                        )}
                      </>
                    )}
                  </div>

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isUser
                        ? "rounded-tr-sm bg-accent text-white"
                        : "rounded-tl-sm border border-edge bg-surface text-text shadow-sm"
                    }`}
                  >
                    {turn.text}
                  </div>
                </div>

                {isUser && (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20 font-mono text-xs font-semibold text-accent">
                    {user?.name ? user.name[0].toUpperCase() : "U"}
                  </div>
                )}
              </div>
            );
          })}

          {isAiTyping && (
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-xs text-text-muted">
                •••
              </div>
              <div className="rounded-2xl rounded-tl-sm border border-edge bg-surface px-4 py-2.5 text-xs text-text-muted">
                <span className="font-medium text-text">{typingPersona || "Panelist"}</span> is thinking & formulating response…
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendTurn} className="mt-3 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Contribute your perspective to the panel (e.g., 'Building on Rahul's point, I believe...')"
              disabled={isAiTyping}
              className="w-full rounded-lg border border-edge bg-surface px-4 py-3.5 pr-28 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isAiTyping}
              className="absolute right-2 rounded-md bg-accent px-4 py-2 text-xs font-medium text-white transition-opacity hover:bg-accent/90 disabled:opacity-40"
            >
              Speak
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-text-faint">
            <span>Tip: Acknowledge peers' arguments and provide concrete technical or real-world examples.</span>
            <span>{userTurnCount < 2 ? "At least 2 turns recommended" : "Ready to conclude whenever"}</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function GDFeedback({ result, mode, company, navigate, topic }) {
  const goRounds = () => navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
  const rubric = result.rubricScores || {};

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="tag-mono text-accent">Group Discussion — Assessment Complete</span>
        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <h1 className="font-display text-4xl font-semibold text-text">{result.score}%</h1>
          <p className="max-w-xl text-sm text-text-muted">{result.feedback?.summary}</p>
        </div>

        {/* Topic reminder */}
        <div className="mt-8 rounded-lg border border-edge bg-surface/50 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint">Topic Discussed</div>
          <div className="mt-1 text-sm font-medium text-text">{topic || result.topic}</div>
        </div>

        {/* 5-Criteria Rubric Breakdown */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Core GD Competencies</span>
          <div className="mt-5 space-y-4">
            {Object.entries(RUBRIC_LABELS).map(([key, label]) => {
              const val = rubric[key] || 70;
              return (
                <div key={key}>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{label}</span>
                    <span className="font-mono text-text">{val}/100</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        val >= 80 ? "bg-signal" : val >= 65 ? "bg-accent" : "bg-amber"
                      }`}
                      style={{ width: `${Math.max(5, val)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Strengths / Improvements */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-signal">Key Strengths</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback?.strengths?.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-amber">Areas for Growth</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback?.improvements?.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Transcript Review Accordion */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Discussion Log</span>
          <div className="mt-4 space-y-3">
            {result.turns?.map((turn, i) => (
              <div
                key={i}
                className={`rounded-md p-3 text-xs leading-relaxed ${
                  turn.speakerType === "user"
                    ? "border border-accent/30 bg-accent/[0.06] text-text"
                    : turn.speakerType === "system"
                    ? "bg-surface-2 text-text-faint"
                    : "border border-edge/60 bg-surface text-text-muted"
                }`}
              >
                <div className="mb-1 font-mono font-medium text-text">
                  {turn.speaker} {turn.speakerType === "user" ? "(Candidate)" : ""}:
                </div>
                {turn.text}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button onClick={goRounds} className="btn-primary">
            Back to rounds
          </button>
        </div>
      </main>
    </div>
  );
}
