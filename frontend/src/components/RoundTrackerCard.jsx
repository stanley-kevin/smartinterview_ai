import { useEffect, useState } from "react";

const ROUNDS = [
  { key: "resume-screening", label: "Resume Screening (AI)" },
  { key: "aptitude", label: "Aptitude Round" },
  { key: "technical-mcq", label: "Technical MCQ Round" },
  { key: "group-discussion", label: "Group Discussion (GD)" },
  { key: "coding", label: "Coding Round" },
  { key: "technical-interview", label: "Technical Interview" },
  { key: "system-design", label: "System Design" },
  { key: "behavioral", label: "Behavioral / HR" },
];

/**
 * A self-contained visual that cycles through interview rounds to give the
 * hero section a concrete, product-accurate focal point instead of a
 * generic stat block.
 */
export default function RoundTrackerCard() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ROUNDS.length);
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="panel relative w-full max-w-sm overflow-hidden p-6">
      <div className="mb-5 flex items-center justify-between">
        <span className="tag-mono">Live session · Amazon SDE-1</span>
        <span className="flex h-2 w-2 rounded-full bg-signal shadow-[0_0_0_3px_rgba(52,211,153,0.2)]" />
      </div>

      <ol className="space-y-3">
        {ROUNDS.map((round, i) => {
          const state =
            i < activeIndex ? "done" : i === activeIndex ? "active" : "pending";
          return (
            <li
              key={round.key}
              className={`flex items-center gap-3 rounded-md border px-3 py-2.5 transition-colors duration-500 ${
                state === "active"
                  ? "border-accent/50 bg-accent/10"
                  : state === "done"
                  ? "border-edge bg-surface-2"
                  : "border-edge/60 bg-transparent"
              }`}
            >
              <span
                className={`font-mono text-xs ${
                  state === "active"
                    ? "text-accent"
                    : state === "done"
                    ? "text-signal"
                    : "text-text-faint"
                }`}
              >
                {state === "done" ? "✓" : String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`text-sm ${
                  state === "pending" ? "text-text-faint" : "text-text"
                }`}
              >
                {round.label}
              </span>
              {state === "active" && (
                <span className="ml-auto flex gap-1">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-5 border-t border-edge pt-4">
        <div className="flex items-baseline justify-between">
          <span className="tag-mono">Adaptive difficulty</span>
          <span className="font-mono text-xs text-signal">↑ Medium → Hard</span>
        </div>
      </div>
    </div>
  );
}
