import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import RoundTrackerCard from "../components/RoundTrackerCard";
import landingBg from "../assets/landing-bg.png";

const COMPANIES = [
  { name: "Amazon", initial: "A" },
  { name: "Google", initial: "G" },
  { name: "TCS", initial: "T" },
  { name: "Microsoft", initial: "M" },
  { name: "Infosys", initial: "I" },
  { name: "Wipro", initial: "W" },
];

const STEPS = [
  {
    n: "01",
    title: "Upload your resume",
    body: "The platform reads your resume and maps what you already know against what your target role expects.",
  },
  {
    n: "02",
    title: "See your gaps",
    body: "Get a plain-language readout of your existing skills, the ones you're missing, and how ready you are for the role.",
  },
  {
    n: "03",
    title: "Pick practice or a company",
    body: "Run a general loop across every round type, or load a specific company's real hiring sequence — Amazon, TCS, Google, and more.",
  },
  {
    n: "04",
    title: "Interview, round by round",
    body: "Aptitude, technical MCQs, live coding, and behavioral questions are generated fresh each time and get harder as you improve.",
  },
];

const ROUND_TYPES = [
  { label: "Aptitude", detail: "Quantitative and logical reasoning, timed like the real thing." },
  { label: "Technical MCQ", detail: "Role-specific concept checks that adapt to your accuracy." },
  { label: "Coding", detail: "A live editor with sample and hidden test cases, scored automatically." },
  { label: "Behavioral", detail: "Situational questions evaluated for structure, clarity, and depth." },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen text-text selection:bg-accent/30 selection:text-white">
      {/* High-visibility bright background layer */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <img
          src={landingBg}
          alt=""
          className="h-full w-full object-cover object-center filter brightness-125 contrast-110"
        />
        {/* Subtle, crystal-clear gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-ink/20 via-ink/10 to-ink/45" />
      </div>

      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-accent/10 via-transparent to-teal-500/10" />
        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal-400/40 bg-teal-950/60 px-3.5 py-1 text-xs font-medium text-teal-300 backdrop-blur-md shadow-lg shadow-teal-900/30">
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-teal-400" />
              Next-Gen AI Interview Simulation
            </div>
            <h1 className="max-w-xl font-display text-4xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
              Practice the interview a company actually runs.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-slate-200 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              SmartInterview AI rebuilds each company's real hiring loop — the same
              round order, question style, and pace — and generates new
              questions every time so you're never memorizing answers.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link to="/register" className="btn-primary shadow-xl shadow-accent/30 hover:shadow-accent/50">
                Start practicing free
              </Link>
              <a href="#how-it-works" className="btn-secondary backdrop-blur-md bg-surface/80 border-white/20 hover:border-white/40 shadow-lg">
                See how it works
              </a>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-text-muted">
              <span className="font-mono text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">No credit card</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span className="font-mono text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Resume-aware</span>
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              <span className="font-mono text-slate-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Adaptive difficulty</span>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="rounded-xl border border-white/20 bg-surface/80 p-1 shadow-2xl backdrop-blur-xl">
              <RoundTrackerCard />
            </div>
          </div>
        </div>
      </section>

      {/* Company strip */}
      <section id="companies" className="border-y border-white/15 bg-surface/60 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <p className="mb-6 text-sm font-medium text-slate-300">
            Interview flows modeled on how these companies actually hire
          </p>
          <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
            {COMPANIES.map((c) => (
              <div key={c.name} className="flex items-center gap-2.5 text-slate-200 transition-colors hover:text-white">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-surface-2/90 font-mono text-xs font-semibold text-white shadow-sm backdrop-blur-sm">
                  {c.initial}
                </span>
                <span className="text-sm font-medium">{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-6xl px-6 py-24">
        <div className="mb-14 max-w-lg">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            Four steps from resume to ready.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex gap-5 rounded-xl border border-white/15 bg-surface/70 p-6 backdrop-blur-lg transition-all duration-200 hover:border-accent/50 hover:bg-surface/85 shadow-xl shadow-black/30"
            >
              <span className="font-mono text-base font-bold text-accent">{step.n}</span>
              <div>
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Round types */}
      <section id="rounds" className="border-t border-white/15 bg-surface/50 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mb-14 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <h2 className="max-w-md font-display text-3xl font-semibold tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
              Every round a real interviewer would actually run.
            </h2>
            <p className="max-w-sm text-sm text-slate-300">
              Practice Mode runs all four, in order. Company Mode runs only
              the rounds — and order — that company uses.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROUND_TYPES.map((r) => (
              <div
                key={r.label}
                className="rounded-xl border border-white/15 bg-surface-2/60 p-6 backdrop-blur-md transition-all hover:border-signal/50 hover:bg-surface-2/80 shadow-lg"
              >
                <h3 className="font-mono text-sm font-semibold text-signal">{r.label}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-300">
                  {r.detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="panel relative overflow-hidden flex flex-col items-start justify-between gap-8 border-white/20 bg-surface/80 px-8 py-12 backdrop-blur-2xl shadow-2xl sm:flex-row sm:items-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="relative z-10">
            <h2 className="font-display text-2xl font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
              Your next interview shouldn't be the first real one.
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Create an account and get a skills readout in under two minutes.
            </p>
          </div>
          <Link to="/register" className="btn-primary relative z-10 shrink-0 shadow-xl shadow-accent/30 hover:shadow-accent/50">
            Create your account
          </Link>
        </div>
      </section>

      <footer className="border-t border-white/15 bg-ink/80 backdrop-blur-md px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} SmartInterview AI. All rights reserved.</span>
          <span className="font-mono text-slate-300">Built for practice, not for cramming.</span>
        </div>
      </footer>
    </div>
  );
}

