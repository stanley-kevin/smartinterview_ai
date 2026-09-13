import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { getCompanies } from "../api/practice";
import Logo from "../components/Logo";
import { useAuth } from "../context/AuthContext";

export default function CompanySelect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const proceed = () => {
    if (!selected) return;
    navigate(`/role-select?mode=company&company=${selected.slug}`);
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
        <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-text">
          Which company are you preparing for?
        </h1>
        <p className="mt-3 max-w-lg text-sm text-text-muted">
          We'll run the exact round order that company uses in real interviews.
        </p>

        {loading ? (
          <div className="mt-10 flex items-center gap-3 text-sm text-text-muted">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-edge border-t-accent" />
            Loading company hiring patterns…
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => {
              const isSelected = selected?.slug === company.slug;
              return (
                <button
                  key={company.slug}
                  type="button"
                  onClick={() => setSelected(company)}
                  className={`rounded-lg border p-5 text-left transition-colors ${
                    isSelected ? "border-accent bg-accent/[0.06]" : "border-edge bg-surface hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-white"
                      style={{ backgroundColor: company.color }}
                    >
                      {company.logoInitial}
                    </span>
                    <span className="font-mono text-[11px] text-text-faint">{company.difficulty}</span>
                  </div>
                  <h4 className="mt-3 text-sm font-semibold text-text">{company.name}</h4>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-muted">{company.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {company.rounds.map((r, i) => (
                      <span key={`${r}-${i}`} className="rounded border border-edge/80 px-1.5 py-0.5 font-mono text-[10px] text-text-faint">
                        {r}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-10 flex justify-end">
          <button onClick={proceed} disabled={!selected} className="btn-primary">
            {selected ? `Continue with ${selected.name}` : "Select a company to continue"}
          </button>
        </div>
      </main>
    </div>
  );
}
