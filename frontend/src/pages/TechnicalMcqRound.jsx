import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { startTechnicalMcq, submitTechnicalMcq } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const CATEGORY_ORDER = ["DBMS", "Operating Systems", "OOP", "Computer Networks", "Programming", "Mixed / Advanced"];

const DIFFICULTY_STYLE = {
  Easy: "border-signal/40 bg-signal/10 text-signal",
  Medium: "border-amber/40 bg-amber/10 text-amber",
  Hard: "border-rose/40 bg-rose/10 text-rose",
};

export default function TechnicalMcqRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading");
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState(null);

  const activeStartRef = useRef(Date.now());
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }
    startTechnicalMcq({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setQuestions(data.questions);
        setTimeLeft(data.durationSeconds);
        activeStartRef.current = Date.now();
        setPhase("testing");
      })
      .catch((err) => {
        toast.error(err.message);
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "testing") return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const flushActiveQuestionTime = useCallback(() => {
    const q = questions[currentIndex];
    if (!q) return;
    const elapsed = (Date.now() - activeStartRef.current) / 1000;
    setTimeSpent((prev) => ({ ...prev, [q.id]: (prev[q.id] || 0) + elapsed }));
    activeStartRef.current = Date.now();
  }, [questions, currentIndex]);

  const goToQuestion = (index) => {
    if (index === currentIndex) return;
    flushActiveQuestionTime();
    setCurrentIndex(index);
  };

  const selectAnswer = (optionIndex) => {
    const q = questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [q.id]: optionIndex }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    flushActiveQuestionTime();
    setPhase("submitting");

    try {
      const responses = questions.map((q) => ({
        questionId: q.id,
        selectedIndex: answers[q.id] ?? null,
        timeSpentSeconds: Math.round(timeSpent[q.id] || (q.id === questions[currentIndex]?.id ? (Date.now() - activeStartRef.current) / 1000 : 0)),
      }));

      const data = await submitTechnicalMcq(attemptId, { responses });
      setResult(data);
      setPhase("feedback");
      if (isAutoSubmit) toast("Time's up — your answers were submitted automatically.", { icon: "⏰" });
    } catch (err) {
      toast.error(err.message);
      setPhase("testing");
      submittingRef.current = false;
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Generating your Technical MCQ questions…
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return <TechnicalMcqFeedback result={result} mode={mode} company={company} navigate={navigate} />;
  }

  const q = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const urgent = timeLeft <= 90;

  return (
    <div className="min-h-screen bg-ink pb-20">
      <header className="sticky top-0 z-40 border-b border-edge/60 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4">
            <span className="hidden text-xs text-text-muted sm:inline">
              {answeredCount}/{questions.length} answered
            </span>
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-1.5 font-mono text-sm ${
                urgent ? "border-rose/50 bg-rose/10 text-rose" : "border-edge bg-surface-2 text-text"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${urgent ? "bg-rose animate-pulse" : "bg-signal"}`} />
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
          <div>
            <div className="flex items-center gap-3">
              <span className="tag-mono text-accent">{q.category}</span>
              {q.difficulty && (
                <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${DIFFICULTY_STYLE[q.difficulty] || ""}`}>
                  {q.difficulty}
                </span>
              )}
            </div>
            <h1 className="mt-4 whitespace-pre-line text-lg font-medium leading-relaxed text-text">
              {q.prompt}
            </h1>

            <div className="mt-6 space-y-3">
              {q.options.map((opt, i) => {
                const selected = answers[q.id] === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectAnswer(i)}
                    className={`flex w-full items-start gap-3 rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      selected ? "border-accent bg-accent/[0.08] text-text" : "border-edge bg-surface text-text-muted hover:border-accent/30"
                    }`}
                  >
                    <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border font-mono text-[10px] ${
                      selected ? "border-accent bg-accent text-white" : "border-edge text-text-faint"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => goToQuestion(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="btn-secondary disabled:opacity-40"
              >
                Previous
              </button>
              {currentIndex === questions.length - 1 ? (
                <button onClick={() => handleSubmit(false)} className="btn-primary">
                  Submit test
                </button>
              ) : (
                <button onClick={() => goToQuestion(currentIndex + 1)} className="btn-primary">
                  Next question
                </button>
              )}
            </div>
          </div>

          <aside className="panel h-fit p-5">
            <span className="tag-mono">Questions</span>
            <div className="mt-4 grid grid-cols-5 gap-2 lg:grid-cols-4">
              {questions.map((qq, i) => {
                const isAnswered = answers[qq.id] !== undefined;
                const isActive = i === currentIndex;
                return (
                  <button
                    key={qq.id}
                    onClick={() => goToQuestion(i)}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-xs transition-colors ${
                      isActive
                        ? "border-accent bg-accent text-white"
                        : isAnswered
                        ? "border-signal/40 bg-signal/10 text-signal"
                        : "border-edge bg-surface-2 text-text-faint"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <button onClick={() => handleSubmit(false)} className="btn-secondary mt-5 w-full text-xs">
              Submit now
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function TechnicalMcqFeedback({ result, mode, company, navigate }) {
  const goRounds = () => navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="tag-mono text-accent">Technical MCQ Round — complete</span>
        <div className="mt-3 flex items-baseline gap-4">
          <h1 className="font-display text-4xl font-semibold text-text">{result.score}%</h1>
          <p className="text-sm text-text-muted">{result.feedback.summary}</p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Category breakdown */}
          <div className="panel p-6">
            <span className="tag-mono">By category</span>
            <div className="mt-4 space-y-4">
              {CATEGORY_ORDER.map((cat) => {
                const entry = result.categoryBreakdown.find((c) => c.category === cat);
                if (!entry) return null;
                const pct = Math.round((entry.correct / entry.total) * 100);
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{cat}</span>
                      <span className="font-mono">{entry.correct}/{entry.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${pct >= 67 ? "bg-signal" : pct >= 34 ? "bg-amber" : "bg-rose"}`}
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Difficulty breakdown */}
          <div className="panel p-6">
            <span className="tag-mono">By difficulty</span>
            <div className="mt-4 space-y-4">
              {["Easy", "Medium", "Hard"].map((diff) => {
                const entry = result.difficultyBreakdown?.find((d) => d.difficulty === diff);
                if (!entry) return null;
                const pct = Math.round((entry.correct / entry.total) * 100);
                return (
                  <div key={diff}>
                    <div className="flex items-center justify-between text-xs text-text-muted">
                      <span>{diff}</span>
                      <span className="font-mono">{entry.correct}/{entry.total}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className={`h-full rounded-full ${pct >= 67 ? "bg-signal" : pct >= 34 ? "bg-amber" : "bg-rose"}`}
                        style={{ width: `${Math.max(3, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Time-based analysis */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Time-based analysis</span>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <div className="font-mono text-xl text-text">{result.timeAnalysis.avgTimePerQuestion}s</div>
              <div className="mt-1 text-xs text-text-faint">Avg time / question</div>
            </div>
            <div>
              <div className="font-mono text-xl text-amber">{result.timeAnalysis.slowCount}</div>
              <div className="mt-1 text-xs text-text-faint">Slow-thinking flags</div>
            </div>
            <div>
              <div className="font-mono text-xl text-rose">{result.timeAnalysis.guessedCount}</div>
              <div className="mt-1 text-xs text-text-faint">Likely guesses</div>
            </div>
            <div>
              <div className="font-mono text-xl text-text-faint">{result.timeAnalysis.unansweredCount}</div>
              <div className="mt-1 text-xs text-text-faint">Unanswered</div>
            </div>
          </div>
        </div>

        {/* Strengths / improvements */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-signal">Strengths</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback.strengths.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />{s}
                </li>
              ))}
            </ul>
          </div>
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-amber">Improve</h3>
            <ul className="mt-3 space-y-2">
              {result.feedback.improvements.map((s, i) => (
                <li key={i} className="flex gap-2 text-sm text-text-muted">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />{s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Question review */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Question review</span>
          <div className="mt-4 divide-y divide-edge/60">
            {result.review.map((q, i) => (
              <div key={q.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <p className="text-sm text-text">{i + 1}. {q.prompt.split("\n")[0]}</p>
                  <div className="flex shrink-0 items-center gap-2">
                    {q.difficulty && (
                      <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${DIFFICULTY_STYLE[q.difficulty] || ""}`}>
                        {q.difficulty}
                      </span>
                    )}
                    {q.behavior === "guessed" && <span className="rounded border border-rose/40 bg-rose/10 px-1.5 py-0.5 font-mono text-[10px] text-rose">Guessed</span>}
                    {q.behavior === "slow" && <span className="rounded border border-amber/40 bg-amber/10 px-1.5 py-0.5 font-mono text-[10px] text-amber">Slow</span>}
                    <span className={`font-mono text-xs ${q.isCorrect ? "text-signal" : "text-rose"}`}>
                      {q.isCorrect ? "Correct" : "Incorrect"}
                    </span>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-text-faint">
                  Your answer: {q.selectedIndex != null ? q.options[q.selectedIndex] : "—"} · Correct: {q.options[q.correctIndex]} · {q.timeSpentSeconds}s
                </p>
                {!q.isCorrect && <p className="mt-1 text-xs text-text-muted">{q.explanation}</p>}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex justify-end">
          <button onClick={goRounds} className="btn-primary">Back to rounds</button>
        </div>
      </main>
    </div>
  );
}
