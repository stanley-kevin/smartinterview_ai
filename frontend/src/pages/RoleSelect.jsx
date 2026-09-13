import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getRoles } from "../api/practice";
import { useAuth } from "../context/AuthContext";
import Logo from "../components/Logo";

export default function RoleSelect() {
  const { user, chooseMode } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "company" ? "company" : "practice";
  const company = searchParams.get("company");

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(user?.profile?.targetRole || null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getRoles()
      .then(setRoles)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const proceed = async () => {
    if (!selected) return toast.error("Select a target role first.");
    setSubmitting(true);
    try {
      await chooseMode({ mode, company, role: selected });
      const qs = mode === "company" ? `mode=company&company=${company}` : "mode=practice";
      navigate(`/rounds?${qs}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
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
        <Link to="/dashboard" className="text-xs text-text-faint hover:text-text-muted">← Back to dashboard</Link>
        <span className="mt-4 block tag-mono text-accent">
          {mode === "company" ? `Company mode · ${company}` : "Practice mode"}
        </span>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-text">
          What role are you targeting?
        </h1>
        <p className="mt-3 max-w-lg text-sm text-text-muted">
          We'll load the right round map for this role — including which
          rounds apply and whether System Design shows up.
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-edge border-t-accent" />
            Loading roles…
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {roles.map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelected(role.id)}
                className={`rounded-md border px-3 py-3 text-left text-xs transition-colors ${
                  selected === role.id
                    ? "border-accent bg-accent/[0.08] text-text"
                    : "border-edge bg-surface text-text-muted hover:border-accent/40"
                }`}
              >
                <div className="font-medium">{role.name}</div>
                {role.isAdvanced && (
                  <div className="mt-1 font-mono text-[10px] text-amber">+ System Design</div>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex justify-end">
          <button onClick={proceed} disabled={!selected || submitting} className="btn-primary">
            {submitting ? "Loading round map…" : "Load round map"}
          </button>
        </div>
      </main>
    </div>
  );
}
