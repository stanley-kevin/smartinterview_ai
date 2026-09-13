import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm text-text-muted md:flex">
          <a href="/#how-it-works" className="transition-colors hover:text-text">
            How it works
          </a>
          <a href="/#companies" className="transition-colors hover:text-text">
            Companies
          </a>
          <a href="/#rounds" className="transition-colors hover:text-text">
            Interview rounds
          </a>
        </nav>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-text-muted transition-colors hover:text-text">
            Log in
          </Link>
          <Link to="/register" className="btn-primary !px-4 !py-2 text-sm">
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
