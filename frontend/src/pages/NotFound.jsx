import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink px-6 text-center">
      <span className="font-mono text-sm text-text-faint">404</span>
      <h1 className="mt-3 font-display text-2xl font-semibold text-text">
        This round doesn't exist.
      </h1>
      <p className="mt-2 text-sm text-text-muted">
        The page you're looking for isn't part of the interview flow.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
