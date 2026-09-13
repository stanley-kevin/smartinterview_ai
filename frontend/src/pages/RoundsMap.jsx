import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getPracticeRounds, getCompanyRounds, getCompanies } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";
import RoundStatusBadge from "../components/RoundStatusBadge";

export default function RoundsMap() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");
  const roleId = user?.profile?.targetRole;

  const [rounds, setRounds] = useState([]);
  const [companyName, setCompanyName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleId) {
      toast.error("Select a target role first.");
      navigate(`/role-select?mode=${mode}${company ? `&company=${company}` : ""}`);
      return;
    }

    async function load() {
      try {
        if (mode === "company" && company) {
          const [roundData, companies] = await Promise.all([
            getCompanyRounds(company, roleId),
            getCompanies(),
          ]);
          setCompanyName(companies.find((c) => c.slug === company)?.name || company);
          setRounds(roundData);
        } else {
          const roundData = await getPracticeRounds(roleId);
          setRounds(roundData);
        }
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, company, roleId]);

  const qs = mode === "company" ? `mode=company&company=${company}` : "mode=practice";

  const ROUND_NAVIGATION = {
    "resume-screening": () => navigate(`/setup?${qs}`),
    aptitude: () => navigate(`/rounds/aptitude?${qs}`),
    "technical-mcq": () => navigate(`/rounds/technical-mcq?${qs}`),
    "group-discussion": () => navigate(`/rounds/gd?${qs}`),
    coding: () => navigate(`/rounds/coding?${qs}`),
    "technical-interview": () => navigate(`/rounds/technical-interview?${qs}`),
    "system-design": () => navigate(`/rounds/system-design?${qs}`),
    behavioral: () => navigate(`/rounds/hr?${qs}`),
  };

  const handleOpenRound = (round) => {
    if (round.status === "locked") {
      toast(round.lockedReason || "Complete the previous round to unlock.", { icon: "🔒" });
      return;
    }
    const go = ROUND_NAVIGATION[round.key];
    if (go) go();
    else toast(round.lockedReason || "This round is coming soon.", { icon: "🔒" });
  };

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link to="/dashboard"><Logo /></Link>
          <span className="text-sm text-text-muted">{user?.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <Link to="/dashboard" className="text-xs text-text-faint hover:text-text-muted">← Back to dashboard</Link>
        <span className="mt-4 block tag-mono text-accent">
          {mode === "company" ? `Company mode · ${companyName || company}` : "Practice mode"}
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
          Your interview rounds
        </h1>
        <p className="mt-3 max-w-lg text-sm text-text-muted">
          {mode === "company"
            ? "This list reflects the exact rounds this company runs for your chosen role — strictly ordered and unlocked sequentially."
            : "Attempt rounds in order. Each one gives you a detailed feedback report before you move to the next."}
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-edge border-t-accent" />
            Loading round map…
          </div>
        ) : (
          <ol className="mt-10 space-y-3">
            {rounds.map((round) => {
              const clickable = round.status !== "locked";
              return (
                <li key={round.key}>
                  <button
                    type="button"
                    onClick={() => handleOpenRound(round)}
                    disabled={!clickable}
                    className={`flex w-full items-center justify-between gap-4 rounded-lg border px-5 py-4 text-left transition-colors ${
                      clickable
                        ? "border-edge bg-surface hover:border-accent/40"
                        : "cursor-not-allowed border-edge/40 bg-surface/30 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm text-text-faint">{String(round.order).padStart(2, "0")}</span>
                      <div>
                        <div className="text-sm font-medium text-text">{round.label}</div>
                        <div className="mt-0.5 text-xs text-text-muted">
                          {round.status === "locked" && round.lockedReason
                            ? `🔒 ${round.lockedReason}`
                            : round.description}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {round.lastScore != null && (
                        <span className="font-mono text-sm text-signal">{round.lastScore}%</span>
                      )}
                      <RoundStatusBadge status={round.status} />
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </div>
  );
}
