import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import Editor from "@monaco-editor/react";
import toast from "react-hot-toast";
import { startCoding, runCoding, submitCoding } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const SUPPORTED_LANGUAGES = [
  { id: "javascript", label: "JavaScript (Node.js)", monaco: "javascript" },
  { id: "python", label: "Python (3.10)", monaco: "python" },
  { id: "cpp", label: "C++ (GCC)", monaco: "cpp" },
];

export default function CodingRound() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const role = user?.profile?.targetRole;

  const [phase, setPhase] = useState("loading"); // loading | coding | running | submitting | feedback
  const [attemptId, setAttemptId] = useState(null);
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [codeByLang, setCodeByLang] = useState({
    javascript: "",
    python: "",
    cpp: "",
  });
  const [lastVerifiedCode, setLastVerifiedCode] = useState(null);
  const [lastVerifiedLang, setLastVerifiedLang] = useState(null);

  const [timeLeft, setTimeLeft] = useState(1800); // 30 mins default
  const [activeTab, setActiveTab] = useState("problem"); // problem | testcases | console
  const [sampleResults, setSampleResults] = useState(null);
  const [selectedCaseTab, setSelectedCaseTab] = useState(0);
  const [result, setResult] = useState(null);
  const submittingRef = useRef(false);

  // --- Initialize Problem ---
  useEffect(() => {
    if (!role) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    startCoding({ role, mode, company })
      .then((data) => {
        setAttemptId(data.attemptId);
        setProblem(data.problem);
        setTimeLeft((data.durationMinutes || 30) * 60);

        const starter = data.problem.starterCode || {};
        setCodeByLang({
          javascript: starter.javascript || "",
          python: starter.python || "",
          cpp: starter.cpp || "",
        });
        setLastVerifiedCode(null);
        setLastVerifiedLang(null);
        setPhase("coding");
      })
      .catch((err) => {
        toast.error(err.message || "Failed to load coding problem");
        navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
      });
  }, [role, mode, company, navigate]);

  // --- Countdown timer ---
  useEffect(() => {
    if (phase !== "coding" && phase !== "running") return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    setSampleResults(null);
    setLastVerifiedCode(null);
    setLastVerifiedLang(null);
  };

  const handleCodeChange = (newVal) => {
    setCodeByLang((prev) => ({
      ...prev,
      [language]: newVal || "",
    }));
  };

  const handleResetStarter = () => {
    if (!problem?.starterCode?.[language]) return;
    setCodeByLang((prev) => ({
      ...prev,
      [language]: problem.starterCode[language],
    }));
    setSampleResults(null);
    setLastVerifiedCode(null);
    setLastVerifiedLang(null);
    toast("Code reset to starter template", { icon: "🔄" });
  };

  const handleRunSample = async () => {
    const currentCode = codeByLang[language] || "";
    if (!currentCode.trim()) {
      toast.error("Editor is empty. Write your solution first.");
      return;
    }

    setPhase("running");
    setActiveTab("console");

    try {
      const res = await runCoding({
        attemptId,
        code: currentCode,
        language,
      });

      setSampleResults(res);
      setSelectedCaseTab(0);
      if (
        res &&
        Array.isArray(res.results) &&
        res.results.length > 0 &&
        res.allPassed === true &&
        res.passedCount === res.totalCount
      ) {
        setLastVerifiedCode(currentCode);
        setLastVerifiedLang(language);
        toast.success(`All ${res.passedCount} sample test cases passed! Submit enabled.`);
      } else {
        setLastVerifiedCode(null);
        setLastVerifiedLang(null);
        toast.error(
          `${res?.passedCount || 0}/${res?.totalCount || 0} sample test cases passed. Fix failing cases before submitting.`
        );
      }
    } catch (err) {
      setLastVerifiedCode(null);
      setLastVerifiedLang(null);
      toast.error(err.message || "Execution error. Please try again.");
    } finally {
      setPhase("coding");
    }
  };

  const currentCode = codeByLang[language] || "";
  const isCodeVerified = Boolean(
    lastVerifiedCode !== null &&
    lastVerifiedLang === language &&
    lastVerifiedCode === currentCode &&
    sampleResults?.allPassed
  );

  let submitDisabledReason = "";
  if (!currentCode.trim()) {
    submitDisabledReason = "Write your solution before submitting";
  } else if (!sampleResults) {
    submitDisabledReason = "Run your code and pass all sample cases first";
  } else if (!sampleResults.allPassed) {
    submitDisabledReason = `Fix failing sample cases (${sampleResults.passedCount}/${sampleResults.totalCount} passed)`;
  } else if (lastVerifiedCode !== currentCode || lastVerifiedLang !== language) {
    submitDisabledReason = "Code modified since last run — re-run sample cases to verify";
  }

  const handleSubmit = async (isAuto = false) => {
    if (submittingRef.current) return;
    const currentCode = codeByLang[language] || "";
    if (!currentCode.trim() && !isAuto) {
      toast.error("Please write code before submitting.");
      return;
    }

    if (!isCodeVerified && !isAuto) {
      toast.error(submitDisabledReason || "Run and pass all sample cases before submitting.");
      return;
    }

    submittingRef.current = true;
    setPhase("submitting");

    try {
      const data = await submitCoding({
        attemptId,
        code: currentCode,
        language,
      });

      setResult(data);
      setPhase("feedback");
      if (isAuto) {
        toast("Time expired — code submitted automatically.", { icon: "⏰" });
      } else {
        toast.success("Solution submitted & verified successfully!");
      }
    } catch (err) {
      toast.error(err.message || "Submission failed. Please try again.");
      setPhase("coding");
      submittingRef.current = false;
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex items-center gap-3 text-sm text-text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-edge border-t-accent" />
          Loading coding workspace & test fixtures…
        </div>
      </div>
    );
  }

  if (phase === "submitting") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-edge border-t-accent" />
          <div className="text-base font-medium text-text">Executing test cases & analyzing code…</div>
          <div className="text-xs text-text-muted max-w-sm">
            Running hidden test suites on Piston and generating qualitative review for complexity and code quality.
          </div>
        </div>
      </div>
    );
  }

  if (phase === "feedback" && result) {
    return (
      <CodingFeedback
        result={result}
        mode={mode}
        company={company}
        navigate={navigate}
        problem={problem}
      />
    );
  }

  const urgent = timeLeft <= 180;

  return (
    <div className="flex h-screen flex-col bg-ink text-text overflow-hidden">
      {/* Top Navbar */}
      <header className="shrink-0 border-b border-edge/60 bg-ink/95 px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`}>
              <Logo />
            </Link>
            <span className="hidden tag-mono text-accent sm:inline">Round 5 · Live Coding</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 rounded-md border px-3 py-1 font-mono text-xs ${
                urgent ? "border-rose/50 bg-rose/10 text-rose" : "border-edge bg-surface-2 text-text"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${urgent ? "bg-rose animate-pulse" : "bg-signal"}`} />
              {formatTime(timeLeft)}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRunSample}
                disabled={phase === "running"}
                className="flex items-center gap-1.5 rounded-md border border-edge bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-text hover:border-accent/40 disabled:opacity-50"
              >
                {phase === "running" ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-text border-t-accent" />
                ) : (
                  <span>▶</span>
                )}
                Run Code
              </button>

              <div className="relative group">
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={!isCodeVerified || phase === "running" || phase === "submitting"}
                  title={!isCodeVerified ? submitDisabledReason : "Submit verified solution"}
                  className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-all ${
                    isCodeVerified
                      ? "bg-accent text-white shadow-lg shadow-accent/20 hover:bg-accent/90 cursor-pointer"
                      : "bg-surface-2 text-text-faint border border-edge/60 cursor-not-allowed opacity-60"
                  }`}
                >
                  {isCodeVerified && <span className="text-signal">✓</span>}
                  Submit Solution
                </button>
                {!isCodeVerified && submitDisabledReason && (
                  <div className="pointer-events-none absolute right-0 top-full mt-1.5 hidden w-64 rounded-md border border-edge bg-ink/95 p-2 text-[11px] text-text-muted shadow-xl backdrop-blur group-hover:block z-50">
                    <span className="font-semibold text-amber">Verification Required:</span> {submitDisabledReason}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Grid */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Problem Statement Panel */}
        <div className="flex w-1/2 flex-col border-r border-edge/60 bg-surface/30 overflow-y-auto p-6 scrollbar-thin">
          <div className="flex items-center gap-2.5">
            <span
              className={`rounded px-2 py-0.5 font-mono text-[11px] font-semibold ${
                problem?.difficulty === "Easy"
                  ? "bg-signal/10 text-signal border border-signal/20"
                  : problem?.difficulty === "Medium"
                  ? "bg-amber/10 text-amber border border-amber/20"
                  : "bg-rose/10 text-rose border border-rose/20"
              }`}
            >
              {problem?.difficulty || "Medium"}
            </span>
            {problem?.tags?.map((t) => (
              <span key={t} className="tag-mono text-text-faint">
                {t}
              </span>
            ))}
          </div>

          <h1 className="mt-3 font-display text-xl font-semibold text-text">{problem?.title}</h1>

          <div className="mt-4 prose prose-invert max-w-none text-xs leading-relaxed text-text-muted space-y-4">
            <div className="whitespace-pre-wrap font-sans text-sm text-text">{problem?.description}</div>

            {problem?.inputFormat && (
              <div className="mt-4 rounded-md border border-edge bg-surface/60 p-3">
                <div className="font-mono text-[11px] font-semibold text-accent">Input Format:</div>
                <div className="mt-1 text-xs text-text-muted">{problem.inputFormat}</div>
              </div>
            )}

            {problem?.outputFormat && (
              <div className="mt-2 rounded-md border border-edge bg-surface/60 p-3">
                <div className="font-mono text-[11px] font-semibold text-accent">Output Format:</div>
                <div className="mt-1 text-xs text-text-muted">{problem.outputFormat}</div>
              </div>
            )}

            <div className="mt-6">
              <h3 className="font-mono text-xs font-semibold text-text uppercase tracking-wider">
                Sample Test Cases
              </h3>
              <div className="mt-3 space-y-3">
                {problem?.sampleCases?.map((sc, i) => (
                  <div key={i} className="rounded-md border border-edge bg-surface p-3 text-xs">
                    <div className="font-mono font-medium text-accent">Example {i + 1}</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded bg-ink p-2 font-mono text-[11px]">
                        <span className="text-text-faint">Input:</span>
                        <pre className="mt-1 text-text whitespace-pre-wrap">{sc.input}</pre>
                      </div>
                      <div className="rounded bg-ink p-2 font-mono text-[11px]">
                        <span className="text-text-faint">Expected Output:</span>
                        <pre className="mt-1 text-signal whitespace-pre-wrap">{sc.output}</pre>
                      </div>
                    </div>
                    {sc.explanation && (
                      <p className="mt-2 text-[11px] text-text-faint italic">{sc.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {problem?.constraints?.length > 0 && (
              <div className="mt-6">
                <h3 className="font-mono text-xs font-semibold text-text uppercase tracking-wider">
                  Constraints
                </h3>
                <ul className="mt-2 list-disc list-inside space-y-1 font-mono text-[11px] text-text-faint">
                  {problem.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right Code Editor & Console Panel */}
        <div className="flex w-1/2 flex-col bg-ink">
          {/* Editor Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-edge/60 bg-surface/80 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-faint">Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="rounded border border-edge bg-surface-2 px-2.5 py-1 font-mono text-xs text-text focus:border-accent focus:outline-none"
              >
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleResetStarter}
              className="text-[11px] text-text-faint hover:text-text"
            >
              Reset to starter
            </button>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={SUPPORTED_LANGUAGES.find((l) => l.id === language)?.monaco || "javascript"}
              value={currentCode}
              onChange={handleCodeChange}
              theme="vs-dark"
              options={{
                fontSize: 13,
                fontFamily: "JetBrains Mono, Fira Code, Menlo, monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: "on",
                roundedSelection: true,
                automaticLayout: true,
                tabSize: 2,
              }}
            />
          </div>

          {/* Console / Test Output Drawer */}
          <div className="h-56 shrink-0 border-t border-edge/60 bg-surface-2/90 flex flex-col">
            <div className="flex items-center justify-between border-b border-edge/50 px-4 py-1.5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab("console")}
                  className={`font-mono text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                    activeTab === "console" ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text"
                  }`}
                >
                  Test Results {sampleResults ? `(${sampleResults.passedCount}/${sampleResults.totalCount})` : ""}
                </button>
              </div>

              {sampleResults && (
                <div className="flex items-center gap-1">
                  {sampleResults.results.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedCaseTab(i)}
                      className={`flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] ${
                        selectedCaseTab === i
                          ? "bg-surface border border-accent/40 text-text font-semibold"
                          : "text-text-faint hover:text-text"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${r.passed ? "bg-signal" : "bg-rose"}`}
                      />
                      Case {r.caseIndex}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Test Run Output Content */}
            <div className="flex-1 overflow-y-auto p-3 text-xs scrollbar-thin">
              {sampleResults ? (
                (() => {
                  const currentCase = sampleResults.results[selectedCaseTab] || sampleResults.results[0];
                  return (
                    <div className="space-y-3 font-mono text-[11px]">
                      {/* Verification Status Alert */}
                      {isCodeVerified ? (
                        <div className="flex items-center justify-between rounded border border-signal/30 bg-signal/10 px-3 py-1.5 text-xs text-signal">
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold">✓ Verified</span>
                            <span>All {sampleResults.passedCount} sample cases passed — you can submit.</span>
                          </span>
                          <span className="text-[10px] text-signal/80 bg-signal/15 px-1.5 py-0.5 rounded">Submit Unlocked</span>
                        </div>
                      ) : lastVerifiedCode !== currentCode || lastVerifiedLang !== language ? (
                        <div className="flex items-center justify-between rounded border border-amber/30 bg-amber/10 px-3 py-1.5 text-xs text-amber">
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold">⚠️ Code Modified</span>
                            <span>Code modified since last run — re-run sample cases to enable submission.</span>
                          </span>
                          <span className="text-[10px] text-amber/80 bg-amber/15 px-1.5 py-0.5 rounded">Submit Locked</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between rounded border border-rose/30 bg-rose/10 px-3 py-1.5 text-xs text-rose">
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold">✗ Incomplete</span>
                            <span>{sampleResults.passedCount} of {sampleResults.totalCount} sample cases passed — fix these before submitting.</span>
                          </span>
                          <span className="text-[10px] text-rose/80 bg-rose/15 px-1.5 py-0.5 rounded">Submit Locked</span>
                        </div>
                      )}

                      {currentCase && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-text">Test Case {currentCase.caseIndex}</span>
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                                currentCase.passed ? "bg-signal/15 text-signal" : "bg-rose/15 text-rose"
                              }`}
                            >
                              {currentCase.passed ? "✓ Passed" : "✗ Failed"}
                            </span>
                          </div>

                          {currentCase.compileError ? (
                            <div className="rounded border border-rose/30 bg-rose/10 p-2 text-rose">
                              <div className="font-bold">Compile / Syntax Error:</div>
                              <pre className="mt-1 whitespace-pre-wrap">{currentCase.compileError}</pre>
                            </div>
                          ) : currentCase.stderr ? (
                            <div className="rounded border border-rose/30 bg-rose/10 p-2 text-rose">
                              <div className="font-bold">Runtime Error:</div>
                              <pre className="mt-1 whitespace-pre-wrap">{currentCase.stderr}</pre>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded bg-ink/70 p-2">
                                <span className="text-text-faint">Expected:</span>
                                <pre className="mt-1 text-signal whitespace-pre-wrap">{currentCase.expectedOutput}</pre>
                              </div>
                              <div className="rounded bg-ink/70 p-2">
                                <span className="text-text-faint">Your Output:</span>
                                <pre
                                  className={`mt-1 whitespace-pre-wrap ${
                                    currentCase.passed ? "text-signal" : "text-rose"
                                  }`}
                                >
                                  {currentCase.actualOutput || "(empty)"}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-text-faint">
                  Click "Run Code" to execute your solution against sample test cases.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodingFeedback({ result, mode, company, navigate, problem }) {
  const goRounds = () => navigate(`/rounds?mode=${mode}${company ? `&company=${company}` : ""}`);
  const qf = result.qualitativeFeedback || {};

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Logo />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <span className="tag-mono text-accent">Coding Round — Assessment Complete</span>
        <div className="mt-3 flex flex-wrap items-baseline gap-4">
          <h1 className="font-display text-4xl font-semibold text-text">{result.score}%</h1>
          <p className="max-w-xl text-sm text-text-muted">{result.feedback?.summary}</p>
        </div>

        {/* Problem Title */}
        <div className="mt-8 rounded-lg border border-edge bg-surface/50 p-4">
          <div className="text-[11px] font-mono uppercase tracking-wider text-text-faint">Problem Solved</div>
          <div className="mt-1 text-sm font-medium text-text">{problem?.title}</div>
        </div>

        {/* Test Suite Breakdown */}
        <div className="mt-6 panel p-6">
          <div className="flex items-center justify-between">
            <span className="tag-mono">Hidden Test Suite Execution</span>
            <span className="font-mono text-xs font-semibold text-signal">
              {result.passedCount}/{result.totalCases} Passed ({result.testPassPct}%)
            </span>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full transition-all ${
                result.testPassPct === 100
                  ? "bg-signal"
                  : result.testPassPct >= 60
                  ? "bg-accent"
                  : "bg-rose"
              }`}
              style={{ width: `${Math.max(5, result.testPassPct)}%` }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {result.hiddenResults?.map((hr) => (
              <div
                key={hr.caseIndex}
                className={`rounded border p-2.5 text-center font-mono text-xs ${
                  hr.passed
                    ? "border-signal/30 bg-signal/5 text-signal"
                    : "border-rose/30 bg-rose/5 text-rose"
                }`}
              >
                <div className="text-[10px] text-text-faint">Test #{hr.caseIndex}</div>
                <div className="mt-1 font-semibold">{hr.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Code Quality & Complexity Review */}
        <div className="mt-6 panel p-6">
          <span className="tag-mono">Code Quality & Algorithmic Complexity</span>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-2xl font-bold text-accent">{qf.codeQualityScore || 80}/100</div>
              <div className="mt-1 text-xs text-text-faint">Code Structure & Style</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-lg font-bold text-signal">{qf.timeComplexity || "O(N)"}</div>
              <div className="mt-1 text-xs text-text-faint">Inferred Time Complexity</div>
            </div>
            <div className="rounded-lg border border-edge bg-surface p-4 text-center">
              <div className="font-mono text-lg font-bold text-text">{qf.spaceComplexity || "O(N)"}</div>
              <div className="mt-1 text-xs text-text-faint">Inferred Space Complexity</div>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-xs text-text-muted leading-relaxed">
            {qf.codeQuality && (
              <div>
                <strong className="text-text">Readability & Patterns:</strong> {qf.codeQuality}
              </div>
            )}
            {qf.edgeCases && (
              <div>
                <strong className="text-text">Boundary & Edge Cases:</strong> {qf.edgeCases}
              </div>
            )}
          </div>
        </div>

        {/* Strengths & Improvements */}
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="panel p-6">
            <h3 className="text-xs font-medium uppercase tracking-wide text-signal">Strengths</h3>
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

        <div className="mt-10 flex justify-end">
          <button onClick={goRounds} className="btn-primary">
            Back to rounds
          </button>
        </div>
      </main>
    </div>
  );
}
