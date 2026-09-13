import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getRoles, analyzeResume } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function PracticeSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const fileInputRef = useRef(null);
  const roleId = user?.profile?.targetRole;

  const [roleName, setRoleName] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!roleId) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }
    getRoles()
      .then((roles) => setRoleName(roles.find((r) => r.id === roleId)?.name || roleId))
      .catch(() => setRoleName(roleId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleId]);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      toast.error("File is too large — please keep it under 5MB.");
      return;
    }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async () => {
    if (!file) return toast.error("Upload your resume to continue.");
    setSubmitting(true);
    try {
      const attempt = await analyzeResume({ file, role: roleId, mode, company });
      setResult(attempt);
      toast.success("Resume analyzed.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const goToRounds = () => {
    const qs = mode === "company" ? `mode=company&company=${company}` : "mode=practice";
    navigate(`/rounds?${qs}`);
  };

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link to="/dashboard"><Logo /></Link>
          <span className="text-sm text-text-muted">{user?.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <button onClick={goToRounds} className="text-xs text-text-faint hover:text-text-muted">← Back to rounds</button>

        <span className="mt-4 block tag-mono text-accent">
          Round 1 · {mode === "company" ? `Company mode · ${company}` : "Practice mode"}
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
          Resume Screening
        </h1>
        <p className="mt-3 max-w-lg text-sm text-text-muted">
          Upload your resume — we'll score it against {roleName || "your target role"} and
          give you specific, actionable feedback before you move on.
        </p>

        {!result ? (
          <div className="mt-10 space-y-8">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-edge bg-surface px-6 py-10 text-center transition-colors hover:border-accent/50"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="hidden"
                onChange={handleFileChange}
              />
              {file ? (
                <>
                  <p className="text-sm font-medium text-text">{file.name}</p>
                  <p className="mt-1 text-xs text-text-faint">{(file.size / 1024).toFixed(0)} KB · click to replace</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-text">Drop your resume here, or click to browse</p>
                  <p className="mt-1 text-xs text-text-faint">PDF, DOCX, or TXT · up to 5MB</p>
                </>
              )}
            </div>

            <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full sm:w-auto">
              {submitting ? "Analyzing resume…" : "Analyze resume"}
            </button>
          </div>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="panel p-8">
              <div className="flex items-center justify-between">
                <span className="tag-mono text-accent">Resume Screening — complete</span>
                <span className="font-mono text-2xl text-text">{result.score}%</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-muted">{result.feedback.summary}</p>

              <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-signal">Strengths</h3>
                  <ul className="mt-3 space-y-2">
                    {result.feedback.strengths.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text-muted">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xs font-medium uppercase tracking-wide text-amber">Improve</h3>
                  <ul className="mt-3 space-y-2">
                    {result.feedback.improvements.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-text-muted">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {result.extractedSkills?.length > 0 && (
                <div className="mt-6 border-t border-edge pt-5">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-text-faint">Skills matched</h3>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {result.extractedSkills.map((s) => (
                      <span key={s} className="rounded border border-signal/30 bg-signal/5 px-2 py-0.5 font-mono text-[10px] text-signal">{s}</span>
                    ))}
                    {result.missingSkills.map((s) => (
                      <span key={s} className="rounded border border-edge px-2 py-0.5 font-mono text-[10px] text-text-faint line-through">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button onClick={goToRounds} className="btn-primary">
                Continue to interview rounds
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
