import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  startTechnicalInterview,
  turnTechnicalInterview,
  scoreTechnicalInterview,
} from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

const RUBRIC_LABELS = {
  depthOfKnowledge: "Depth of Technical Understanding",
  tradeOffAwareness: "Trade-off Awareness & Decision Rationale",
  consistencyAndHonesty: "Consistency & Truth Under Probing",
  communicationClarity: "Communication & Articulation Clarity",
};

export default function TechnicalInterviewRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading"); // loading | interviewing | scoring | feedback
  const [attemptId, setAttemptId] = useState(null);
  const [turns, setTurns] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [totalQuestions, setTotalQuestions] = useState(7);
  const [isFinished, setIsFinished] = useState(false);
  const [focusArea, setFocusArea] = useState("System Architecture");
  const [result, setResult] = useState(null);

  const chatBottomRef = useRef(null);

  const scrollToBottom = () => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [turns, isAiTyping]);

  // --- Initialize Technical Interview ---
  useEffect(() => {
    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    startTechnicalInterview({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setTurns(data.turns || []);
        setQuestionNumber(data.questionNumber || 1);
        setTotalQuestions(data.totalQuestions || 7);
        setFocusArea(data.focusArea || "System Architecture");
        setPhase("interviewing");
      })
      .catch((err) => {
        toast.error(err.response?.data?.message || err.message || "Failed to initialize Technical Interview");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [role, mode, company, navigate]);

  const handleSendTurn = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isAiTyping) return;

    const userText = inputText.trim();
    setInputText("");

    // Optimistically show user turn
    const tempUserTurn = {
      id: `turn-local-${Date.now()}`,
      speaker: "candidate",
      text: userText,
      timestamp: new Date(),
    };
    setTurns((prev) => [...prev, tempUserTurn]);
    setIsAiTyping(true);

    try {
      const data = await turnTechnicalInterview({
        attemptId,
        userText,
      });

      setTurns(data.turns || []);
      setQuestionNumber(data.questionNumber || questionNumber);
      setTotalQuestions(data.totalQuestions || totalQuestions);
      if (data.focusArea) setFocusArea(data.focusArea);
      if (data.isFinished) {
        setIsFinished(true);
        toast.success("Interview questions concluded. Ready for evaluation!");
      } else if (data.pushedBack) {
        toast("Please provide more technical depth to your response.", { icon: "ℹ️" });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Error generating follow-up. You can retry.");
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleScoreInterview = async () => {
    setPhase("scoring");
    try {
      const data = await scoreTechnicalInterview({ attemptId });
      setResult(data);
      setPhase("feedback");
      toast.success("Technical Interview evaluation complete!");
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Scoring failed. Please try again.");
      setPhase("interviewing");
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Analyzing your resume and formulating personalized technical interview questions…
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
            Evaluating Technical Deep Dive
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            Our Principal Bar Raiser engine is scoring your responses across technical depth, trade-off awareness, architectural consistency, and articulation clarity…
          </p>
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return (
      <div className="min-h-screen bg-ink">
        <header className="border-b border-edge/60">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
            <Link to="/dashboard"><Logo /></Link>
            <span className="tag-mono text-accent">Technical Interview · Evaluation Report</span>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-6 py-12">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <span className="tag-mono text-signal">Round Completed</span>
              <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-text">
                Technical Interview Results
              </h1>
            </div>
            <div className="flex items-baseline gap-2 rounded-xl border border-signal/30 bg-signal/10 px-5 py-3">
              <span className="font-display text-4xl font-bold text-signal">{result.score}%</span>
              <span className="text-xs text-text-muted">overall fit</span>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="panel mb-8 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
              Executive Assessment
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text">
              {result.feedback?.summary}
            </p>
          </div>

          {/* 4-Pillar Rubric Breakdown */}
          <div className="mb-8">
            <h2 className="mb-4 font-display text-lg font-semibold text-text">
              Evaluation Criteria Breakdown
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
                <span>✓</span> Key Technical Strengths
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
                <span>△</span> Areas to Deepen
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
      {/* Top Navbar */}
      <header className="shrink-0 border-b border-edge/60 bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-4">
            <Link to="/dashboard"><Logo /></Link>
            <span className="h-4 w-px bg-edge" />
            <span className="text-xs font-medium text-text-muted">
              {mode === "company" ? `${company?.toUpperCase()} Technical Interview` : "Practice Mode · Technical Interview"}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-edge bg-surface-2 px-3 py-1 text-xs">
              <span className="font-mono text-accent">
                Question {Math.min(questionNumber, totalQuestions)} of {totalQuestions}
              </span>
            </div>
            <Link
              to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}
              className="text-xs text-text-muted hover:text-text"
            >
              Exit
            </Link>
          </div>
        </div>
      </header>

      {/* Main Conversation Canvas */}
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 py-4 sm:px-6">
        {/* Topic Context Pill */}
        <div className="mb-3 flex shrink-0 items-center justify-between rounded-lg border border-edge/60 bg-surface/50 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="tag-mono text-accent">Current Focus:</span>
            <span className="font-medium text-text">{focusArea}</span>
          </div>
          <span className="text-text-faint">Conversational AI Bar Raiser</span>
        </div>

        {/* Scrollable Chat Area */}
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          {turns.map((turn, idx) => {
            const isInterviewer = turn.speaker === "interviewer";
            const isPushback = turn.isPushback;

            return (
              <div
                key={turn.id || idx}
                className={`flex gap-3.5 ${isInterviewer ? "items-start" : "flex-row-reverse items-start"}`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-mono font-semibold ${
                    isInterviewer
                      ? isPushback
                        ? "border-amber/50 bg-amber/10 text-amber"
                        : "border-accent/40 bg-accent/15 text-accent"
                      : "border-signal/40 bg-signal/15 text-signal"
                  }`}
                >
                  {isInterviewer ? (isPushback ? "!" : "AI") : "YOU"}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                    isInterviewer
                      ? isPushback
                        ? "border border-amber/30 bg-amber/5 text-amber-200"
                        : "border border-edge bg-surface text-text"
                      : "border border-accent/40 bg-accent/15 text-text"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-4 text-[11px] text-text-faint">
                    <span className="font-semibold text-text-muted">
                      {isInterviewer
                        ? isPushback
                          ? "Interviewer (Elaboration Request)"
                          : "Staff Technical Interviewer"
                        : "You"}
                    </span>
                    <span className="font-mono">
                      {turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap">{turn.text}</div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isAiTyping && (
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/30 bg-accent/10 font-mono text-accent">
                AI
              </div>
              <div className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface px-3 py-2">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0.4s]" />
                <span className="ml-2 text-xs text-text-muted">Evaluating response & formulating follow-up…</span>
              </div>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input / Conclusion Bar */}
        <div className="mt-3 shrink-0 border-t border-edge/60 pt-3">
          {isFinished ? (
            <div className="panel flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
              <div>
                <h3 className="text-sm font-semibold text-text">
                  All discussion questions completed
                </h3>
                <p className="mt-0.5 text-xs text-text-muted">
                  Ready to submit your responses for comprehensive 4-pillar bar-raiser evaluation.
                </p>
              </div>
              <button
                type="button"
                onClick={handleScoreInterview}
                className="btn-primary shrink-0 shadow-lg shadow-accent/25"
              >
                Submit & Score Interview →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendTurn} className="space-y-2">
              <div className="relative">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendTurn();
                    }
                  }}
                  disabled={isAiTyping}
                  rows={3}
                  placeholder="Explain your technical decisions, architecture, trade-offs, and metrics (Press Enter to send, Shift+Enter for new line)..."
                  className="field-input resize-none pr-28 text-sm"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isAiTyping}
                  className="btn-primary absolute bottom-3 right-3 !px-4 !py-1.5 text-xs"
                >
                  Send →
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-faint">
                <span>Tip: Cite concrete technologies, latencies, trade-offs, and failure handling.</span>
                <span>{inputText.length} characters</span>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
