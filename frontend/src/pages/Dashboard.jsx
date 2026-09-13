import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";
import { getDashboard } from "../api/practice";
import Logo from "../components/Logo";
import RoundStatusBadge from "../components/RoundStatusBadge";

function ScoreRing({ value }) {
  const size = 72;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const offset = circumference - (pct / 100) * circumference;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="#262D3A" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={pct >= 70 ? "#34D399" : pct >= 40 ? "#F5A623" : "#F2617A"}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={value == null ? circumference : offset}
        strokeLinecap="round"
      />
      <text
        x="50%"
        y="50%"
        transform={`rotate(90 ${size / 2} ${size / 2})`}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-text font-mono text-sm font-medium"
      >
        {value == null ? "—" : `${value}%`}
      </text>
    </svg>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

const ROUND_LABELS = {
  "resume-screening": "Resume Screening",
  aptitude: "Aptitude Round",
  "technical-mcq": "Technical MCQ",
  coding: "Coding Round",
  "technical-interview": "Technical Interview",
  behavioral: "Behavioral / HR",
  "group-discussion": "Group Discussion",
  "system-design": "System Design",
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const goPractice = () => navigate("/role-select?mode=practice");
  const goCompany = () => navigate("/company/select");

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-edge/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Logo />
          <div className="flex items-center gap-4 text-sm text-text-muted">
            <span>{user?.name}</span>
            <button
              onClick={logout}
              className="rounded-md border border-edge px-3 py-1.5 text-xs text-text-muted transition-colors hover:border-accent/50 hover:text-text"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-2xl font-semibold text-text">
          Welcome back, {user?.name?.split(" ")[0]}.
        </h1>
        <p className="mt-1.5 text-sm text-text-muted">
          Here's where you stand, and where to pick up.
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-edge border-t-accent" />
            Loading your dashboard…
          </div>
        ) : (
          <>
            {/* Profile + progress */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="panel p-6 lg:col-span-2">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <span className="tag-mono">Candidate profile</span>
                    <h2 className="mt-2 font-display text-lg font-semibold text-text">
                      {data.profile.targetRoleName || "No target role selected yet"}
                    </h2>
                    <p className="mt-1 text-sm text-text-muted">
                      {data.profile.resumeUploaded
                        ? `Resume on file: ${data.profile.resumeFileName}`
                        : "No resume uploaded yet — upload one from Practice or Company setup."}
                    </p>
                    {data.profile.extractedSkills?.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {data.profile.extractedSkills.slice(0, 8).map((s) => (
                          <span key={s} className="rounded border border-edge/80 px-2 py-0.5 font-mono text-[10px] text-text-muted">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <ScoreRing value={data.profile.roleSuitabilityScore} />
                </div>

                <div className="mt-6 grid grid-cols-3 gap-4 border-t border-edge pt-5">
                  <div>
                    <div className="font-mono text-xl text-text">
                      {data.stats.roundsCompleted}
                      <span className="text-text-faint">/{data.stats.totalRounds}</span>
                    </div>
                    <div className="mt-1 text-xs text-text-faint">Rounds completed</div>
                  </div>
                  <div>
                    <div className="font-mono text-xl text-text">
                      {data.stats.averageScore == null ? "—" : `${data.stats.averageScore}%`}
                    </div>
                    <div className="mt-1 text-xs text-text-faint">Average score</div>
                  </div>
                  <div>
                    <div className="font-mono text-xl text-text">{data.stats.totalAttempts}</div>
                    <div className="mt-1 text-xs text-text-faint">Total attempts</div>
                  </div>
                </div>
              </div>

              {/* Recent activity */}
              <div className="panel p-6">
                <span className="tag-mono">Recent activity</span>
                {data.recentActivity.length === 0 ? (
                  <p className="mt-4 text-sm text-text-muted">
                    Nothing yet — pick a mode below to attempt your first round.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {data.recentActivity.slice(0, 5).map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="text-text">{ROUND_LABELS[a.roundKey] || a.roundKey}</div>
                          <div className="text-xs text-text-faint">{timeAgo(a.date)}</div>
                        </div>
                        <span className={`font-mono text-xs ${a.status === "completed" ? "text-signal" : "text-text-faint"}`}>
                          {a.status === "completed" ? `${a.score}%` : "in progress"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Round progress strip */}
            <div className="mt-6 panel p-6">
              <span className="tag-mono">Round map</span>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
                {data.rounds.map((r) => (
                  <div key={r.key} className="rounded-md border border-edge/70 bg-surface-2 p-3">
                    <div className="font-mono text-[10px] text-text-faint">{String(r.order).padStart(2, "0")}</div>
                    <div className="mt-1 text-xs font-medium text-text">{r.shortLabel}</div>
                    <div className="mt-2">
                      <RoundStatusBadge status={r.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mode selection */}
            <div className="mt-10">
              <h2 className="font-display text-xl font-semibold text-text">Attend an interview</h2>
              <p className="mt-1.5 text-sm text-text-muted">Choose how you want to practice.</p>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
                <button
                  type="button"
                  onClick={goPractice}
                  className="group panel flex flex-col items-start p-8 text-left transition-colors hover:border-accent/40"
                >
                  <span className="tag-mono text-accent">General loop</span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-text">Practice Mode</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    Pick a target role, upload your resume for AI analysis, then work through
                    every round — aptitude, technical, coding, behavioral — at your own pace.
                  </p>
                  <span className="btn-primary mt-6">Start Practice Mode</span>
                </button>

                <button
                  type="button"
                  onClick={goCompany}
                  className="group panel flex flex-col items-start p-8 text-left transition-colors hover:border-accent/40"
                >
                  <span className="tag-mono text-amber">Targeted loop</span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-text">Company-Based Mode</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">
                    Choose a company, then a role, and run the exact round order that
                    company uses in real interviews.
                  </p>
                  <span className="btn-secondary mt-6">Choose a company</span>
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
