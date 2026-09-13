/**
 * Static catalog describing each supported company's hiring pattern.
 * `type` and `hasGD` feed `getEffectiveRoundKeys` below, which is the
 * single source of truth for which rounds actually apply to a given
 * company + role combination — nobody else should hand-roll this logic.
 */
const COMPANIES = [
  {
    slug: "amazon",
    name: "Amazon",
    logoInitial: "A",
    color: "#FF9900",
    difficulty: "High",
    type: "product-based",
    hasGD: false,
    rounds: ["technical-mcq", "coding", "technical-interview", "behavioral"],
    description:
      "Leadership-principles-driven interviews with a strong behavioral component alongside DSA coding rounds.",
  },
  {
    slug: "google",
    name: "Google",
    logoInitial: "G",
    color: "#4285F4",
    difficulty: "Very High",
    type: "product-based",
    hasGD: false,
    rounds: ["technical-mcq", "coding", "technical-interview", "system-design", "behavioral"],
    description:
      "Heavy emphasis on algorithmic problem solving across multiple coding rounds plus a Googleyness/behavioral round.",
  },
  {
    slug: "tcs",
    name: "TCS",
    logoInitial: "T",
    color: "#EE3124",
    difficulty: "Moderate",
    type: "service-based",
    hasGD: true,
    rounds: ["aptitude", "technical-mcq", "group-discussion", "technical-interview", "behavioral"],
    description:
      "Aptitude-first process (TCS NQT style) followed by technical MCQs, a group discussion, and an HR round.",
  },
  {
    slug: "microsoft",
    name: "Microsoft",
    logoInitial: "M",
    color: "#00A4EF",
    difficulty: "High",
    type: "product-based",
    hasGD: false,
    rounds: ["technical-mcq", "coding", "technical-interview", "system-design", "behavioral"],
    description:
      "Strong systems and coding focus across two rounds, with a final round assessing collaboration and design thinking.",
  },
  {
    slug: "infosys",
    name: "Infosys",
    logoInitial: "I",
    color: "#007CC3",
    difficulty: "Moderate",
    type: "service-based",
    hasGD: false,
    rounds: ["aptitude", "technical-mcq", "technical-interview", "behavioral"],
    description:
      "Aptitude and pseudocode-style technical MCQs followed by an HR round focused on communication and fit.",
  },
  {
    slug: "wipro",
    name: "Wipro",
    logoInitial: "W",
    color: "#341F65",
    difficulty: "Moderate",
    type: "service-based",
    hasGD: true,
    rounds: ["aptitude", "technical-mcq", "group-discussion", "coding", "behavioral"],
    description:
      "Full-funnel process (Wipro NTH style): aptitude, technical MCQs, a group discussion, a coding round, then HR.",
  },
];

/**
 * Computes which round keys actually apply to a company for a given role,
 * per the platform's hiring-pattern rules:
 *   - Resume Screening always applies.
 *   - service-based companies always get Aptitude + Technical MCQ, even
 *     if not explicitly listed in `rounds`.
 *   - product-based companies never get Aptitude (they lean on coding).
 *   - Group Discussion only applies if the company runs one.
 *   - System Design only applies to roles flagged `isAdvanced`.
 *
 * Returns a Set of round keys (unordered) — callers sort against
 * ROUND_DEFS' canonical `order` for display.
 */
function getEffectiveRoundKeys(company, role) {
  const keys = new Set(company.rounds);
  keys.add("resume-screening");

  if (company.type === "product-based") {
    keys.delete("aptitude");
  } else if (company.type === "service-based") {
    keys.add("aptitude");
    keys.add("technical-mcq");
  }

  if (company.hasGD) keys.add("group-discussion");
  else keys.delete("group-discussion");

  if (!role?.isAdvanced) keys.delete("system-design");

  return keys;
}

module.exports = COMPANIES;
module.exports.getEffectiveRoundKeys = getEffectiveRoundKeys;
