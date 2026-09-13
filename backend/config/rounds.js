/**
 * The full 8-round interview map, in the canonical order shown across the
 * app (landing page, dashboard, rounds map). `enabled: false` rounds are
 * shown in the UI as "coming soon" — they may still be *applicable* to a
 * given company/role (see companies.js `getEffectiveRoundKeys`), they're
 * just not built yet.
 */
const ROUND_DEFS = [
  {
    key: "resume-screening",
    order: 1,
    label: "Resume Screening (AI)",
    shortLabel: "Resume",
    description: "AI reads your resume against the role and scores your fit.",
    enabled: true,
  },
  {
    key: "aptitude",
    order: 2,
    label: "Aptitude Round",
    shortLabel: "Aptitude",
    description: "15 timed questions across quant, logic, verbal, and DI.",
    enabled: true,
  },
  {
    key: "technical-mcq",
    order: 3,
    label: "Technical MCQ Round",
    shortLabel: "Tech MCQ",
    description: "15 timed questions across DBMS, OS, OOP, CN, and programming.",
    enabled: true,
  },
  {
    key: "group-discussion",
    order: 4,
    label: "Group Discussion (GD)",
    shortLabel: "GD",
    description: "A simulated panel discussion on a live topic.",
    enabled: true,
  },
  {
    key: "coding",
    order: 5,
    label: "Coding Round",
    shortLabel: "Coding",
    description: "A live editor with sample and hidden test cases.",
    enabled: true,
  },
  {
    key: "technical-interview",
    order: 6,
    label: "Technical Interview Round",
    shortLabel: "Tech Interview",
    description: "A conversational, AI-driven deep dive on your experience.",
    enabled: true,
  },
  {
    key: "system-design",
    order: 7,
    label: "System Design Round",
    shortLabel: "Sys Design",
    description: "Whiteboard-style architecture questions with follow-ups. Advanced roles only.",
    enabled: true,
  },
  {
    key: "behavioral",
    order: 8,
    label: "Behavioral / HR Round",
    shortLabel: "Behavioral",
    description: "Situational questions evaluated for structure and clarity.",
    enabled: true,
  },
];

module.exports = ROUND_DEFS;
