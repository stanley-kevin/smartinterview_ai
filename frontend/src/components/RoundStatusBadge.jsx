const STATUS_STYLES = {
  completed: "border-signal/40 bg-signal/10 text-signal",
  "in-progress": "border-accent/40 bg-accent/10 text-accent",
  available: "border-edge bg-surface-2 text-text-muted",
  locked: "border-edge/60 bg-transparent text-text-faint",
};

const STATUS_LABELS = {
  completed: "Completed",
  "in-progress": "In progress",
  available: "Available",
  locked: "Coming soon",
};

export default function RoundStatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.locked}`}
    >
      {STATUS_LABELS[status] || "Locked"}
    </span>
  );
}
