import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { startHR, answerHR, scoreHR } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function BehavioralHrRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading"); // loading | answering | analyzing | feedback
  const [attemptId, setAttemptId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answersMap, setAnswersMap] = useState({}); // { [qId]: { text, starScores, feedback, score, evaluated } }
  const [currentText, setCurrentText] = useState("");
  const [result, setResult] = useState(null);

  // --- Initialize Round ---
  useEffect(() => {
    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    startHR({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setQuestions(data.questions || []);
        setPhase("answering");
      })
      .catch((err) => {
        toast.error(err.message || "Failed to initialize Behavioral / HR round");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [role, mode, company, navigate]);

  const currentQ = questions[currentIndex];
  const existingAns = currentQ ? answersMap[currentQ.id] : null;

  // When switching questions, load existing text if any
  useEffect(() => {
    if (currentQ) {
      setCurrentText(answersMap[currentQ.id]?.text || "");
    }
  }, [currentIndex, currentQ, answersMap]);

  const handleEvaluateAnswer = async (e) => {
    e?.preventDefault();
    if (!currentText.trim() || currentText.trim().length < 20) {
      toast.error("Please elaborate more thoroughly before submitting for evaluation.");
      return;
    }

    setPhase("analyzing");
    try {
      const res = await answerHR({
        attemptId,
        questionId: currentQ.id,
        answerText: currentText,
      });

      setAnswersMap((prev) => ({
        ...prev,
        [currentQ.id]: {
          text: currentText,
          starScores: res.answer.starScores,
          clarityScore: res.answer.clarityScore,
          feedback: res.answer.feedback,
          score: res.answer.score,
          evaluated: true,
        },
      }));
      toast.success("Answer evaluated with STAR breakdown!");
    } catch (err) {
      toast.error(err.message || "Evaluation error. Please try again.");
    } finally {
      setPhase("answering");
    }
  };

  const handleNextOrFinish = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Conclude and score full round
      const answeredCount = Object.keys(answersMap).length;
      if (answeredCount < 1) {
        toast.error("Please answer at least one question before concluding.");
        return;
      }

      setPhase("analyzing");
      try {
        const finalData = await scoreHR({ attemptId });
        setResult(finalData);
        setPhase("feedback");
        toast.success("Behavioral / HR round successfully completed!");
      } catch (err) {
        toast.error(err.message || "Scoring failed. Please try again.");
        setPhase("answering");
      }
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Preparing situational & behavioral interview prompts…
        </div>
      </div>
    );
  }

  if (phase === "analyzing") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <div className="text-base font-medium text-text">Analyzing STAR response structure…</div>
          <div className="text-xs text-text-muted max-w-sm">
            Verifying Situation framing, Task clarity, Action initiatives, and measurable Results.
          </div>
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return (
      <HRFeedback
        result={result}
        mode={mode}
        company={company}
        navigate={navigate}
      />
    );
  }

  const answeredCount = Object.keys(answersMap).length;
  const wordCount = currentText.trim() ? currentText.trim().split(/\s+/).length : 0;

  return (
    <div className="min-h-screen bg-ink text-text pb-20">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-edge/60 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}>
              <Logo />
            </Link>
            <span className="hidden tag-mono text-accent sm:inline">Round 6 · Behavioral / HR</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-text-muted">
              {answeredCount}/{questions.length} completed
            </span>
            <button
              onClick={handleNextOrFinish}
              disabled={answeredCount < 1}
              className={`rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors ${
                answeredCount >= 1
                  ? "bg-accent text-white hover:bg-accent/90"
                  : "border border-edge bg-surface text-text-faint opacity-40 cursor-not-allowed"
              }`}
            >
              {currentIndex === questions.length - 1 ? "Finish & View Score" : "Next / Skip"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-5xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
          {/* Question & Input Area */}
          <div>
            <div className="flex items-center gap-3">
              <span className="tag-mono text-accent">Question {currentIndex + 1} of {questions.length}</span>
              <span className="text-xs text-text-faint">{currentQ?.category}</span>
            </div>

            <h1 className="mt-4 font-display text-xl font-semibold leading-relaxed text-text">
              {currentQ?.question}
            </h1>

            {/* STAR Method Hint Box */}
            <div className="mt-5 rounded-lg border border-edge bg-surface/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-accent uppercase tracking-wider">
                  STAR Formulation Guide
                </span>
                <span className="text-[11px] text-text-faint">Situation · Task · Action · Result</span>
              </div>
              <ul className="mt-3 space-y-1.5 text-xs text-text-muted">
                {currentQ?.hints?.map((hint, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-accent" />
                    <span>{hint}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Answer Text Area */}
            <form onSubmit={handleEvaluateAnswer} className="mt-6">
              <div className="flex items-center justify-between text-xs text-text-faint mb-2">
                <span>Your Response</span>
                <span>{wordCount} words (recommend 80-200)</span>
              </div>

              <textarea
                rows={8}
                value={currentText}
                onChange={(e) => setCurrentText(e.target.value)}
                placeholder="Describe your situation, the task you needed to accomplish, the actions you personally took, and the quantifiable outcome or learnings..."
                className="w-full rounded-lg border border-edge bg-surface p-4 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
              />

              <div className="mt-4 flex items-center justify-between">
                <button
                  type="submit"
                  disabled={wordCount < 10}
                  className="btn-primary text-xs disabled:opacity-40"
                >
                  {existingAns ? "Re-Evaluate STAR Answer" : "Evaluate Response with STAR"}
                </button>

                {existingAns && (
                  <button
                    type="button"
                    onClick={handleNextOrFinish}
                    className="btn-secondary text-xs"
                  >
                    {currentIndex === questions.length - 1 ? "Conclude Round →" : "Proceed to Next →"}
                  </button>
                )}
              </div>
            </form>

            {/* Inline STAR Feedback Card */}
            {existingAns && (
              <div className="mt-6 rounded-lg border border-edge bg-surface-2 p-5 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-edge/60 pb-3">
                  <span className="tag-mono text-accent">STAR Component Detection</span>
                  <span className="font-mono text-sm font-semibold text-signal">
                    Score: {existingAns.score}/100
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 font-mono text-xs">
                  <div
                    className={`rounded border p-2.5 text-center ${
                      existingAns.starScores?.situation
                        ? "border-signal/30 bg-signal/10 text-signal"
                        : "border-rose/30 bg-rose/10 text-rose"
                    }`}
                  >
                    <div className="font-bold">Situation</div>
                    <div className="text-[10px] mt-0.5">
                      {existingAns.starScores?.situation ? "✓ Present" : "✗ Missing"}
                    </div>
                  </div>

                  <div
                    className={`rounded border p-2.5 text-center ${
                      existingAns.starScores?.task
                        ? "border-signal/30 bg-signal/10 text-signal"
                        : "border-rose/30 bg-rose/10 text-rose"
                    }`}
                  >
                    <div className="font-bold">Task</div>
                    <div className="text-[10px] mt-0.5">
                      {existingAns.starScores?.task ? "✓ Present" : "✗ Missing"}
                    </div>
                  </div>

                  <div
                    className={`rounded border p-2.5 text-center ${
                      existingAns.starScores?.action
                        ? "border-signal/30 bg-signal/10 text-signal"
                        : "border-rose/30 bg-rose/10 text-rose"
                    }`}
                  >
                    <div className="font-bold">Action</div>
                    <div className="text-[10px] mt-0.5">
                      {existingAns.starScores?.action ? "✓ Present" : "✗ Missing"}
                    </div>
                  </div>

                  <div
                    className={`rounded border p-2.5 text-center ${
                      existingAns.starScores?.result
                        ? "border-signal/30 bg-signal/10 text-signal"
                        : "border-rose/30 bg-rose/10 text-rose"
                    }`}
                  >
                    <div className="font-bold">Result</div>
                    <div className="text-[10px] mt-0.5">
                      {existingAns.starScores?.result ? "✓ Present" : "✗ Missing"}
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-text-muted">
                  <strong className="text-text">Feedback:</strong> {existingAns.feedback}
                </p>
              </div>
            )}
          </div>

          {/* Question Navigator */}
          <aside className="panel h-fit p-5">
            <span className="tag-mono">Questions</span>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const isAnswered = Boolean(answersMap[q.id]);
                const isActive = i === currentIndex;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(i)}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-xs transition-colors ${
                      isActive
                        ? "border-accent bg-accent text-white"
                        : isAnswered
                        ? "border-signal/40 bg-signal/10 text-signal"
                        : "border-edge bg-surface-2 text-text-faint hover:text-text"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleNextOrFinish}
              disabled={answeredCount < 1}
              className="btn-secondary mt-5 w-full text-xs disabled:opacity-40"
            >
              {currentIndex === questions.length - 1 ? "Submit Round" : "Next Question"}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
}

function HRFeedback({ result, mode, company, navigate }) {
  const goRounds = () => navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
  const star = result.starSummary || {};

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="tag-mono text-accent">Behavioral / HR Round — Assessment Complete</span>
        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <h1 className="font-display text-4xl font-semibold text-text">{result.score}%</h1>
          <p className="max-w-xl text-sm text-text-muted">{result.feedback?.summary}</p>
        </div>

        {/* STAR Compliance Matrix */}
        <div className="mt-10 panel p-6">
          <span className="tag-mono">STAR Methodology Compliance</span>

          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-accent">{star.situationPct || 0}%</div>
              <div className="mt-1 text-xs text-text-faint">Situation (Context)</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-accent">{star.taskPct || 0}%</div>
              <div className="mt-1 text-xs text-text-faint">Task (Objective)</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-signal">{star.actionPct || 0}%</div>
              <div className="mt-1 text-xs text-text-faint">Action (Initiative)</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-signal">{star.resultPct || 0}%</div>
              <div className="mt-1 text-xs text-text-faint">Result (Impact)</div>
            </div>
          </div>
        </div>

        {/* Strengths & Growth Areas */}
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
            <h3 className="text-xs font-medium uppercase tracking-wide text-amber">Growth Areas</h3>
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

        {/* Question Review Breakdown */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Interview Responses Review</span>
          <div className="mt-4 divide-y divide-edge/60">
            {result.answers?.map((ans, i) => (
              <div key={ans.questionId || i} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono text-accent">{ans.category}</span>
                    <p className="text-sm font-medium text-text mt-0.5">
                      {i + 1}. {ans.questionText}
                    </p>
                  </div>
                  <span className="font-mono text-xs font-semibold text-signal shrink-0">
                    {ans.score}/100
                  </span>
                </div>

                <div className="mt-2 rounded bg-ink/70 p-3 text-xs text-text-muted leading-relaxed">
                  "{ans.answerText}"
                </div>

                <p className="mt-2 text-xs text-text-faint">
                  <strong className="text-text">Feedback:</strong> {ans.feedback}
                </p>
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
