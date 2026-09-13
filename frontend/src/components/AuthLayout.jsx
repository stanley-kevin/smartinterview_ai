import { Link } from "react-router-dom";
import Logo from "./Logo";

const FACTS = [
  { label: "Round types", value: "4" },
  { label: "Companies modeled", value: "6+" },
  { label: "Questions", value: "Generated fresh" },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_1fr]">
      {/* Form side */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-10 font-display text-2xl font-semibold text-text">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
          )}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-text-muted">{footer}</div>}
        </div>
      </div>

      {/* Brand side */}
      <div className="relative hidden overflow-hidden border-l border-edge/60 bg-surface lg:flex lg:flex-col lg:justify-between lg:p-14">
        <div className="pointer-events-none absolute inset-0 bg-grid-fade" />
        <div className="relative">
          <p className="max-w-sm font-display text-2xl font-medium leading-snug text-text">
            "The closest thing to sitting in the actual interview room."
          </p>
          <p className="mt-4 text-sm text-text-muted">
            Every round is generated live and scored against how the company
            actually evaluates candidates.
          </p>
        </div>
        <div className="relative grid grid-cols-3 gap-6 border-t border-edge pt-6">
          {FACTS.map((f) => (
            <div key={f.label}>
              <div className="font-mono text-lg text-accent">{f.value}</div>
              <div className="mt-1 text-xs text-text-faint">{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
