/**
 * Shared helpers for dynamic question generators (aptitudeBank,
 * technicalMcqBank, and any future timed-round question bank).
 */

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Shuffle a correct answer among distractors, returning options + index.
 * Dedupe safety net: if a distractor happens to equal the correct answer
 * or another distractor, pad with clearly-labeled placeholders rather
 * than ship a broken MCQ with fewer than 4 unique options.
 */
function buildOptions(correct, distractors) {
  const seen = new Set([String(correct)]);
  const uniqueDistractors = [];
  for (const d of distractors) {
    const key = String(d);
    if (!seen.has(key)) {
      seen.add(key);
      uniqueDistractors.push(d);
    }
  }
  let filler = 1;
  while (uniqueDistractors.length < 3) {
    const placeholder = `None of the above (${filler++})`;
    if (!seen.has(placeholder)) {
      seen.add(placeholder);
      uniqueDistractors.push(placeholder);
    }
  }

  const pool = [correct, ...uniqueDistractors.slice(0, 3)];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return { options: pool.map(String), correctIndex: pool.indexOf(correct) };
}

function numericDistractors(correct, spread = 10, count = 3) {
  const set = new Set();
  while (set.size < count) {
    const delta = randInt(-spread, spread) || 1;
    const candidate = correct + delta;
    if (candidate !== correct && candidate >= 0) set.add(candidate);
  }
  return [...set];
}

/**
 * Distractors for small positive values (days, percentages, counts) where
 * numericDistractors' random negative deltas would otherwise clamp to the
 * same floor value and collide. Builds an explicit, always-distinct offset
 * set instead of relying on randomness staying clear of the floor.
 */
function positiveDistractors(correct, count = 3) {
  const candidates = [correct + 1, correct + 2, correct + 3, Math.max(1, correct - 1), Math.max(1, correct - 2)];
  return [...new Set(candidates)].filter((n) => n !== correct).slice(0, count);
}

/** Pick a random bank entry, preferring one not in `excludeIds` when possible. */
function pickFresh(bank, excludeIds = new Set()) {
  const fresh = bank.filter((item) => !excludeIds.has(item.id));
  return fresh.length > 0 ? randChoice(fresh) : randChoice(bank);
}

module.exports = {
  randInt,
  randChoice,
  gcd,
  buildOptions,
  numericDistractors,
  positiveDistractors,
  pickFresh,
};
