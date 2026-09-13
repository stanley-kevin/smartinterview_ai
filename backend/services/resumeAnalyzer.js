const { groqJSON } = require("./groqService");

const ACTION_VERBS = [
  "built", "led", "designed", "developed", "implemented", "optimized",
  "launched", "created", "improved", "reduced", "increased", "managed",
  "architected", "automated", "deployed", "delivered", "mentored",
];

/**
 * Lightweight structural checks that don't require any AI call — resume
 * length, presence of contact info, sections, and action-verb usage.
 * These are shown alongside the skill-gap analysis regardless of whether
 * the AI or fallback path produced the skills breakdown.
 */
function runStructuralChecks(text) {
  const lower = text.toLowerCase();
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;

  const hasEmail = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s-]{8,}\d)/.test(text);
  const hasEducationSection = /education|b\.?tech|b\.?e\.|degree|university|college/i.test(lower);
  const hasProjectsSection = /projects?|portfolio/i.test(lower);
  const hasExperienceSection = /experience|internship|employment/i.test(lower);
  const actionVerbCount = ACTION_VERBS.filter((v) => lower.includes(v)).length;

  return {
    wordCount,
    hasEmail,
    hasPhone,
    hasEducationSection,
    hasProjectsSection,
    hasExperienceSection,
    actionVerbCount,
    isTooShort: wordCount < 120,
    isTooLong: wordCount > 1200,
  };
}

/**
 * Deterministic fallback: keyword-matches the role's skill list against
 * the resume text. No AI required, always available, always fast.
 */
function analyzeFallback(text, role, checks) {
  const lower = text.toLowerCase();

  const extractedSkills = role.skills.filter((skill) =>
    lower.includes(skill.toLowerCase())
  );
  const missingSkills = role.skills.filter((s) => !extractedSkills.includes(s));

  const skillCoverage = extractedSkills.length / role.skills.length;
  let score = Math.round(skillCoverage * 70); // skills = 70% of the score

  // Structural quality = remaining 30%
  let structuralPoints = 0;
  if (checks.hasEmail) structuralPoints += 5;
  if (checks.hasPhone) structuralPoints += 3;
  if (checks.hasEducationSection) structuralPoints += 5;
  if (checks.hasProjectsSection) structuralPoints += 6;
  if (checks.hasExperienceSection) structuralPoints += 5;
  if (checks.actionVerbCount >= 3) structuralPoints += 6;
  if (!checks.isTooShort && !checks.isTooLong) structuralPoints += 0;
  score += structuralPoints;
  score = Math.max(5, Math.min(100, score));

  const strengths = [];
  if (extractedSkills.length > 0) {
    strengths.push(
      `Your resume shows ${extractedSkills.length} of the ${role.skills.length} skills we look for in a ${role.name}: ${extractedSkills.slice(0, 5).join(", ")}${extractedSkills.length > 5 ? "…" : ""}.`
    );
  }
  if (checks.hasProjectsSection) strengths.push("A clear projects section gives interviewers something concrete to ask about.");
  if (checks.actionVerbCount >= 3) strengths.push("You lead bullet points with strong action verbs, which reads as ownership rather than task-listing.");
  if (checks.hasEmail && checks.hasPhone) strengths.push("Contact details are complete and easy to find.");
  if (strengths.length === 0) strengths.push("Your resume is on file and ready for a first pass — small edits below will meaningfully improve it.");

  const improvements = [];
  if (missingSkills.length > 0) {
    improvements.push(
      `Consider adding evidence of: ${missingSkills.slice(0, 5).join(", ")}${missingSkills.length > 5 ? "…" : ""} — these show up often in ${role.name} job descriptions.`
    );
  }
  if (!checks.hasProjectsSection) improvements.push("Add a projects section — even 2-3 focused projects give interviewers concrete things to probe.");
  if (checks.actionVerbCount < 3) improvements.push("Start more bullet points with action verbs (built, led, optimized) instead of passive descriptions.");
  if (checks.isTooShort) improvements.push("Your resume reads as quite short — add measurable outcomes to your experience and project bullets.");
  if (checks.isTooLong) improvements.push("Your resume runs long — tighten it to the most relevant one or two pages for this role.");
  if (!checks.hasEmail || !checks.hasPhone) improvements.push("Make sure your email and phone number are both clearly visible near the top.");
  if (improvements.length === 0) improvements.push("Solid coverage overall — focus your prep on the rounds ahead rather than the resume itself.");

  const summary =
    score >= 75
      ? `Strong match for ${role.name}. Your resume covers most of the skills we'd expect and reads well structurally.`
      : score >= 45
      ? `Reasonable starting point for ${role.name}, with clear gaps worth closing before you apply.`
      : `Your resume needs targeted work before it's competitive for ${role.name} — start with the skill gaps below.`;

  return {
    suitabilityScore: score,
    extractedSkills,
    missingSkills,
    strengths: strengths.slice(0, 4),
    improvements: improvements.slice(0, 4),
    summary,
  };
}

const SYSTEM_PROMPT = `You are an expert technical recruiter and resume screener. Given a candidate's resume text and a target job role with its expected skills, evaluate the resume.

Respond ONLY with a JSON object of this exact shape:
{
  "suitabilityScore": <integer 0-100>,
  "extractedSkills": [<skills from the role's list that the resume evidences, as strings>],
  "missingSkills": [<skills from the role's list that are missing or weak, as strings>],
  "strengths": [<2-4 short, specific, encouraging strengths as strings>],
  "improvements": [<2-4 short, specific, actionable improvements as strings>],
  "summary": "<one or two sentence overall verdict>"
}
Be honest and specific. Reference real content from the resume in strengths/improvements where possible. Do not include any text outside the JSON object.`;

async function analyzeResume(text, role) {
  const checks = runStructuralChecks(text);

  const truncated = text.slice(0, 6000); // keep prompt bounded
  const userPrompt = `Target role: ${role.name}\nExpected skills: ${role.skills.join(", ")}\n\nResume text:\n"""\n${truncated}\n"""`;

  const aiResult = await groqJSON(SYSTEM_PROMPT, userPrompt);

  if (
    aiResult &&
    typeof aiResult.suitabilityScore === "number" &&
    Array.isArray(aiResult.extractedSkills) &&
    Array.isArray(aiResult.missingSkills)
  ) {
    return {
      ...aiResult,
      suitabilityScore: Math.max(0, Math.min(100, Math.round(aiResult.suitabilityScore))),
      checks,
      generatedBy: "ai",
    };
  }

  return { ...analyzeFallback(text, role, checks), checks, generatedBy: "fallback" };
}

module.exports = { analyzeResume, runStructuralChecks };
