/**
 * Deterministic-but-dynamic question generators for the Aptitude Round.
 *
 * Every function below produces a fresh question with randomized numbers
 * or a randomly chosen bank entry each time it's called, so two attempts
 * (even back to back, even by the same user) get different questions.
 * This is the fallback path used when GROQ_API_KEY isn't configured, or
 * when the AI call fails/returns malformed output — it's what makes
 * "questions are dynamic for every session" true unconditionally.
 *
 * Each generator returns:
 *   { category, subtype, prompt, options: [4 strings], correctIndex, explanation }
 */

const {
  randInt,
  randChoice,
  gcd,
  buildOptions,
  numericDistractors,
  positiveDistractors,
} = require("./questionUtils");

const CATEGORIES = {
  quant: "Quantitative Aptitude",
  logical: "Logical Reasoning",
  verbal: "Verbal Ability",
  di: "Data Interpretation",
  mixed: "Mixed / Advanced",
};

// ---------- 1-3: Quantitative Aptitude ---------------------------------

function genPercentageProfitLoss() {
  if (Math.random() < 0.5) {
    const cp = randInt(5, 100) * 20; // multiple of 20
    const profitPct = randChoice([5, 10, 15, 20, 25, 30, 40, 50]);
    const sp = cp + (cp * profitPct) / 100;
    const { options, correctIndex } = buildOptions(
      `${profitPct}%`,
      positiveDistractors(profitPct).map((n) => `${n}%`)
    );
    return {
      category: CATEGORIES.quant,
      subtype: "Percentage / Profit & Loss",
      prompt: `A shopkeeper buys an item for ₹${cp} and sells it for ₹${sp}. What is the profit percentage?`,
      options,
      correctIndex,
      explanation: `Profit % = (SP − CP) / CP × 100 = (${sp} − ${cp}) / ${cp} × 100 = ${profitPct}%.`,
    };
  }
  const base = randInt(4, 40) * 20; // multiple of 20
  const pct = randChoice([5, 10, 15, 20, 25, 30, 40, 50, 60, 75]);
  const answer = (base * pct) / 100;
  const { options, correctIndex } = buildOptions(answer, numericDistractors(answer, Math.max(5, answer * 0.3)));
  return {
    category: CATEGORIES.quant,
    subtype: "Percentage / Profit & Loss",
    prompt: `What is ${pct}% of ${base}?`,
    options,
    correctIndex,
    explanation: `${pct}% of ${base} = (${pct}/100) × ${base} = ${answer}.`,
  };
}

function genTimeWorkSpeed() {
  if (Math.random() < 0.5) {
    const pairs = [
      [10, 15, 6], [6, 12, 4], [8, 24, 6], [20, 30, 12],
      [12, 24, 8], [9, 18, 6], [16, 48, 12], [15, 30, 10],
    ];
    const [a, b, together] = randChoice(pairs);
    const { options, correctIndex } = buildOptions(
      `${together} days`,
      positiveDistractors(together).map((n) => `${n} days`)
    );
    return {
      category: CATEGORIES.quant,
      subtype: "Time & Work / Speed",
      prompt: `A can complete a task in ${a} days and B can complete it in ${b} days. Working together, how many days will they take?`,
      options,
      correctIndex,
      explanation: `Combined rate = 1/${a} + 1/${b}. Working together they take ${together} days.`,
    };
  }
  const speed = randInt(8, 24) * 5; // 40-120
  const t = randChoice([2, 3, 4, 5]);
  const d = speed * t;
  const { options, correctIndex } = buildOptions(
    `${speed} km/h`,
    numericDistractors(speed, 15).map((n) => `${Math.max(5, n)} km/h`)
  );
  return {
    category: CATEGORIES.quant,
    subtype: "Time & Work / Speed",
    prompt: `A train travels ${d} km in ${t} hours at a constant speed. What is its speed?`,
    options,
    correctIndex,
    explanation: `Speed = Distance / Time = ${d} / ${t} = ${speed} km/h.`,
  };
}

function genRatioSimplification() {
  if (Math.random() < 0.5) {
    const factor = randInt(2, 9);
    const a = randInt(2, 12) * factor;
    const b = randInt(2, 12) * factor;
    const g = gcd(a, b);
    const simpleA = a / g;
    const simpleB = b / g;
    const correctRatio = `${simpleA}:${simpleB}`;
    const candidatePool = [
      `${simpleA + 1}:${simpleB}`,
      `${simpleA}:${simpleB + 1}`,
      `${simpleB}:${simpleA}`,
      `${simpleA + 2}:${simpleB}`,
      `${simpleA}:${simpleB + 2}`,
      `${Math.max(1, simpleA - 1)}:${simpleB}`,
    ];
    const distractors = [...new Set(candidatePool)].filter((c) => c !== correctRatio).slice(0, 3);
    const { options, correctIndex } = buildOptions(correctRatio, distractors);
    return {
      category: CATEGORIES.quant,
      subtype: "Ratio / Simplification",
      prompt: `Simplify the ratio ${a}:${b} to its simplest form.`,
      options,
      correctIndex,
      explanation: `Dividing both terms by their HCF (${g}) gives ${simpleA}:${simpleB}.`,
    };
  }
  const a = randInt(2, 9);
  const b = randInt(2, 9);
  const k = randInt(2, 10);
  const n = (a + b) * k;
  const larger = k * Math.max(a, b);
  const { options, correctIndex } = buildOptions(larger, numericDistractors(larger, 10));
  return {
    category: CATEGORIES.quant,
    subtype: "Ratio / Simplification",
    prompt: `A sum of ${n} is divided between two people in the ratio ${a}:${b}. What is the larger share?`,
    options,
    correctIndex,
    explanation: `Each part = ${n} / ${a + b} = ${k}. Larger share = ${k} × ${Math.max(a, b)} = ${larger}.`,
  };
}

// ---------- 4-6: Logical Reasoning --------------------------------------

function genNumberSeries() {
  const type = randChoice(["arithmetic", "geometric", "growing-diff"]);
  const start = randInt(2, 20);

  if (type === "arithmetic") {
    const d = randInt(2, 9);
    const terms = Array.from({ length: 5 }, (_, i) => start + i * d);
    const next = start + 5 * d;
    const { options, correctIndex } = buildOptions(next, numericDistractors(next, d * 2));
    return {
      category: CATEGORIES.logical,
      subtype: "Number Series",
      prompt: `Find the next number in the series: ${terms.join(", ")}, ?`,
      options,
      correctIndex,
      explanation: `Each term increases by ${d}, so the next term is ${terms[4]} + ${d} = ${next}.`,
    };
  }

  if (type === "geometric") {
    const r = randChoice([2, 3]);
    const base = randInt(2, 5);
    const terms = Array.from({ length: 4 }, (_, i) => base * r ** i);
    const next = base * r ** 4;
    const { options, correctIndex } = buildOptions(next, numericDistractors(next, next * 0.4));
    return {
      category: CATEGORIES.logical,
      subtype: "Number Series",
      prompt: `Find the next number in the series: ${terms.join(", ")}, ?`,
      options,
      correctIndex,
      explanation: `Each term is multiplied by ${r}, so the next term is ${terms[3]} × ${r} = ${next}.`,
    };
  }

  // growing difference: +2, +4, +6, ...
  const step = randInt(2, 4);
  const terms = [start];
  for (let i = 1; i <= 4; i++) terms.push(terms[i - 1] + step * i);
  const next = terms[4] + step * 5;
  const { options, correctIndex } = buildOptions(next, numericDistractors(next, step * 3));
  return {
    category: CATEGORIES.logical,
    subtype: "Number Series",
    prompt: `Find the next number in the series: ${terms.join(", ")}, ?`,
    options,
    correctIndex,
    explanation: `The difference between terms increases by ${step} each time, so the next term is ${next}.`,
  };
}

function genCodingDecoding() {
  const words = ["CAT", "DOG", "SUN", "BOOK", "TABLE", "CHAIR", "PLANT", "WATER", "MUSIC", "LIGHT"];
  const [word1, word2] = (() => {
    const shuffled = [...words];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = randInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  })();
  const shift = randInt(1, 5);
  const shiftWord = (w) =>
    w
      .split("")
      .map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift) % 26) + 65))
      .join("");

  const code1 = shiftWord(word1);
  const correct = shiftWord(word2);
  const wrongShift = (delta) =>
    word2
      .split("")
      .map((c) => String.fromCharCode(((c.charCodeAt(0) - 65 + shift + delta + 26) % 26) + 65))
      .join("");

  const { options, correctIndex } = buildOptions(correct, [
    wrongShift(1),
    wrongShift(-1),
    word2.split("").reverse().join(""),
  ]);

  return {
    category: CATEGORIES.logical,
    subtype: "Coding-Decoding",
    prompt: `In a certain code, ${word1} is written as ${code1}. How is ${word2} written in that same code?`,
    options,
    correctIndex,
    explanation: `Each letter is shifted forward by ${shift} in the alphabet, so ${word2} becomes ${correct}.`,
  };
}

const PUZZLE_BANK = [
  {
    prompt:
      "Pointing to a photograph, Rahul said, 'She is the daughter of my grandfather's only son.' How is the woman in the photograph related to Rahul?",
    correct: "Sister",
    distractors: ["Cousin", "Daughter", "Niece"],
    explanation: "Rahul's grandfather's only son is Rahul's father, so his daughter is Rahul's sister.",
  },
  {
    prompt:
      "In a row of children, Meera is 7th from the left and 12th from the right. How many children are there in the row?",
    correct: "18",
    distractors: ["19", "17", "20"],
    explanation: "Total = (position from left) + (position from right) − 1 = 7 + 12 − 1 = 18.",
  },
  {
    prompt:
      "If South-East becomes North, North-East becomes West, then what does South become?",
    correct: "North-East",
    distractors: ["North-West", "South-West", "East"],
    explanation: "Each direction is rotated 135° anticlockwise, so South maps to North-East.",
  },
  {
    prompt:
      "Look at this series: 2, 6, 18, 54, ... Which pattern rule describes it, and what comes next?",
    correct: "×3 each time — next is 162",
    distractors: ["+4 each time — next is 58", "×2 each time — next is 108", "+16 each time — next is 70"],
    explanation: "Each term is multiplied by 3: 2×3=6, 6×3=18, 18×3=54, 54×3=162.",
  },
  {
    prompt:
      "A is B's sister. C is B's mother. D is C's father. E is D's mother. How is A related to D?",
    correct: "Granddaughter",
    distractors: ["Daughter", "Niece", "Sister"],
    explanation: "D is C's father, and C is A's mother, so D is A's grandfather — making A his granddaughter.",
  },
];

function genPuzzlePattern() {
  const item = randChoice(PUZZLE_BANK);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    category: CATEGORIES.logical,
    subtype: "Puzzle / Pattern",
    prompt: item.prompt,
    options,
    correctIndex,
    explanation: item.explanation,
  };
}

// ---------- 7-9: Verbal Ability -----------------------------------------

const SYNONYM_BANK = [
  { word: "Benevolent", correct: "Kind-hearted", distractors: ["Cruel", "Selfish", "Arrogant"] },
  { word: "Meticulous", correct: "Very careful and precise", distractors: ["Careless", "Hasty", "Confused"] },
  { word: "Candid", correct: "Frank and honest", distractors: ["Secretive", "Dishonest", "Vague"] },
  { word: "Resilient", correct: "Able to recover quickly", distractors: ["Fragile", "Stubborn", "Slow"] },
  { word: "Ambiguous", correct: "Open to more than one interpretation", distractors: ["Clear", "Certain", "Simple"] },
  { word: "Diligent", correct: "Hard-working and careful", distractors: ["Lazy", "Reckless", "Distracted"] },
  { word: "Concise", correct: "Brief and to the point", distractors: ["Wordy", "Vague", "Repetitive"] },
  { word: "Skeptical", correct: "Doubtful, not easily convinced", distractors: ["Trusting", "Naive", "Certain"] },
];

function genSynonymVocabulary() {
  const item = randChoice(SYNONYM_BANK);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    category: CATEGORIES.verbal,
    subtype: "Synonym / Vocabulary",
    prompt: `Choose the word or phrase closest in meaning to "${item.word}".`,
    options,
    correctIndex,
    explanation: `"${item.word}" most closely means "${item.correct}".`,
  };
}

const SENTENCE_CORRECTION_BANK = [
  {
    correct: "She has been working here since 2015.",
    distractors: [
      "She has being working here since 2015.",
      "She has been work here since 2015.",
      "She have been working here since 2015.",
    ],
  },
  {
    correct: "Neither of the answers is correct.",
    distractors: [
      "Neither of the answers are correct.",
      "Neither of the answer is correct.",
      "Neither of the answers is correctly.",
    ],
  },
  {
    correct: "Each of the candidates was asked the same question.",
    distractors: [
      "Each of the candidates were asked the same question.",
      "Each of the candidate was asked the same question.",
      "Each of the candidates was ask the same question.",
    ],
  },
  {
    correct: "If I were you, I would accept the offer.",
    distractors: [
      "If I was you, I would accept the offer.",
      "If I were you, I would have accepted the offer now.",
      "If I am you, I would accept the offer.",
    ],
  },
  {
    correct: "The team, along with its coach, is arriving today.",
    distractors: [
      "The team, along with its coach, are arriving today.",
      "The team, along with their coach, is arriving today.",
      "The team, along with its coach, arriving today.",
    ],
  },
];

function genSentenceCorrection() {
  const item = randChoice(SENTENCE_CORRECTION_BANK);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    category: CATEGORIES.verbal,
    subtype: "Sentence Correction",
    prompt: "Choose the grammatically correct sentence.",
    options,
    correctIndex,
    explanation: `"${item.correct}" is the grammatically correct version.`,
  };
}

const RC_BANK = [
  {
    passage:
      "Remote work grew rapidly after 2020, but recent surveys show many companies now prefer a hybrid model. Employees value flexibility, while managers cite collaboration and mentorship as reasons to bring teams back part-time. Neither fully remote nor fully in-office setups satisfy every team, which is why hybrid arrangements — typically two to three in-office days per week — have become the most common compromise.",
    question: "According to the passage, why do many companies now prefer a hybrid model?",
    correct: "It balances employee flexibility with in-person collaboration and mentorship.",
    distractors: [
      "It fully replaces the need for an office.",
      "It was mandated by government regulation.",
      "It eliminates the need for team collaboration.",
    ],
  },
  {
    passage:
      "A well-known study on decision fatigue found that people make progressively worse choices as the day goes on and their pool of self-control depletes. Judges, for instance, were shown to grant parole more often earlier in the day than later — not because cases changed, but because decision-making capacity did. The practical takeaway is that important decisions are best made when mental energy is highest, not last on a long list.",
    question: "What does the judge example illustrate?",
    correct: "Decision quality can decline over the course of a day due to mental fatigue.",
    distractors: [
      "Judges are inherently biased against parole.",
      "Parole cases become more complex later in the day.",
      "Mental energy has no effect on professional decisions.",
    ],
  },
  {
    passage:
      "Compound interest rewards patience: the longer money stays invested, the more its growth accelerates, since returns are earned on both the original amount and prior returns. A modest sum invested consistently over decades can outgrow a much larger sum invested for only a few years, which is why financial advisors emphasize starting early over starting big.",
    question: "What is the main point the passage makes about investing?",
    correct: "Starting early matters more than starting with a large amount.",
    distractors: [
      "Only large investments benefit from compound interest.",
      "Investment returns are the same regardless of duration.",
      "Financial advisors discourage long-term investing.",
    ],
  },
];

function genReadingComprehension() {
  const item = randChoice(RC_BANK);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    category: CATEGORIES.verbal,
    subtype: "Reading Comprehension",
    prompt: `${item.passage}\n\nQuestion: ${item.question}`,
    options,
    correctIndex,
    explanation: `The passage directly supports: "${item.correct}"`,
  };
}

// ---------- 10-12: Data Interpretation -----------------------------------

function genTableBased() {
  const products = ["Product A", "Product B", "Product C", "Product D"];
  const quarters = ["Q1", "Q2", "Q3"];
  let table;
  let totals;
  // avoid ties on the max-total product
  do {
    table = products.map(() => quarters.map(() => randInt(10, 90) * 10));
    totals = table.map((row) => row.reduce((a, b) => a + b, 0));
  } while (new Set(totals).size !== totals.length);

  const maxIdx = totals.indexOf(Math.max(...totals));
  const tableText = products
    .map((p, i) => `${p}: ${quarters.map((q, j) => `${q}=${table[i][j]}`).join(", ")}`)
    .join(" | ");

  const { options, correctIndex } = buildOptions(products[maxIdx], products.filter((_, i) => i !== maxIdx));
  return {
    category: CATEGORIES.di,
    subtype: "Table-based question",
    prompt: `Quarterly sales (units): ${tableText}. Which product had the highest total sales across all three quarters?`,
    options,
    correctIndex,
    explanation: `Totals — ${products.map((p, i) => `${p}: ${totals[i]}`).join(", ")}. ${products[maxIdx]} has the highest total.`,
  };
}

function genBarGraph() {
  const months = ["Jan", "Feb", "Mar", "Apr"];
  const values = Array.from({ length: 4 }, () => randInt(10, 60) * 4); // multiples of 4
  const total = values.reduce((a, b) => a + b, 0);
  const avg = total / 4;
  const valuesText = months.map((m, i) => `${m}: ${values[i]}`).join(", ");

  const { options, correctIndex } = buildOptions(avg, numericDistractors(avg, 10));
  return {
    category: CATEGORIES.di,
    subtype: "Bar graph question",
    prompt: `The bar graph shows units sold each month — ${valuesText}. What is the average number of units sold per month?`,
    options,
    correctIndex,
    explanation: `Average = (${values.join(" + ")}) / 4 = ${total} / 4 = ${avg}.`,
  };
}

function genPercentageAnalysis() {
  const base = randInt(10, 100) * 20; // multiple of 20
  const pct = randChoice([5, 10, 15, 20, 25, 30, 40]);
  const increase = Math.random() < 0.6;
  const changed = increase ? base + (base * pct) / 100 : base - (base * pct) / 100;
  const label = increase ? "increase" : "decrease";

  const { options, correctIndex } = buildOptions(
    `${pct}% ${label}`,
    positiveDistractors(pct).map((n) => `${n}% ${label}`)
  );

  return {
    category: CATEGORIES.di,
    subtype: "Percentage analysis",
    prompt: `A company's revenue changed from ₹${base}L to ₹${changed}L over one year. What was the percentage change?`,
    options,
    correctIndex,
    explanation: `% change = |(${changed} − ${base})| / ${base} × 100 = ${pct}% ${label}.`,
  };
}

// ---------- 13-15: Mixed / Advanced --------------------------------------

function genLogicalMathCombo() {
  const a = randChoice([10, 20, 30, 40, 50]);
  const netChange = -(a * a) / 100;
  const { options, correctIndex } = buildOptions(
    `${netChange}%`,
    numericDistractors(Math.abs(netChange), 5).map((n) => `${-n}%`)
  );
  return {
    category: CATEGORIES.mixed,
    subtype: "Logical + Math combination",
    prompt: `A number is increased by ${a}% and then the result is decreased by ${a}%. What is the net percentage change from the original number?`,
    options,
    correctIndex,
    explanation: `Net change = (1 + ${a}/100)(1 − ${a}/100) − 1 = 1 − (${a}/100)² − 1 = −${a}²/100 = ${netChange}%. The two changes never fully cancel out.`,
  };
}

function genCaseBased() {
  const a = randInt(2, 8) * 3; // multiple of 3
  const days = a / 3;
  const { options, correctIndex } = buildOptions(`${days} days`, positiveDistractors(days).map((n) => `${n} days`));
  return {
    category: CATEGORIES.mixed,
    subtype: "Case-based problem",
    prompt: `A alone can finish a project in ${a} days. B is twice as efficient as A. If A and B work together, how many days will they take to finish the project?`,
    options,
    correctIndex,
    explanation: `A's rate = 1/${a}. B's rate = 2/${a}. Combined rate = 3/${a}, so together they take ${a}/3 = ${days} days.`,
  };
}

const TRICK_BANK = [
  {
    prompt: "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
    correct: "9",
    distractors: ["8", "17", "0"],
    explanation: "'All but 9 die' means 9 survive — the total of 17 is a distraction.",
  },
  {
    prompt:
      "If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets?",
    correct: "5 minutes",
    distractors: ["100 minutes", "20 minutes", "50 minutes"],
    explanation: "Each machine makes 1 widget in 5 minutes regardless of how many machines run in parallel.",
  },
  {
    prompt:
      "A clerk at a butcher shop is 5'10\" tall and wears size 13 shoes. What does he weigh?",
    correct: "Meat",
    distractors: ["180 lbs", "It cannot be determined", "200 lbs"],
    explanation: "He weighs meat — he's a butcher. The physical details are a deliberate distraction.",
  },
  {
    prompt: "How many months have 28 days?",
    correct: "All 12",
    distractors: ["1", "2", "11"],
    explanation: "Every month has at least 28 days — February has exactly 28 (or 29), the rest have more.",
  },
  {
    prompt:
      "You have two ropes that each take exactly 1 hour to burn, but burn unevenly. How do you measure exactly 45 minutes?",
    correct: "Light one rope at both ends and the other at one end; when the first finishes, light the other's second end.",
    distractors: [
      "Burn both ropes at one end simultaneously and wait an hour.",
      "Cut each rope in half and burn the pieces one at a time.",
      "It cannot be done with only two ropes.",
    ],
    explanation: "Rope A burnt at both ends finishes in 30 min; lighting rope B's other end then gives 15 more minutes — 45 total.",
  },
];

function genTrickCriticalThinking() {
  const item = randChoice(TRICK_BANK);
  const { options, correctIndex } = buildOptions(item.correct, item.distractors);
  return {
    category: CATEGORIES.mixed,
    subtype: "Trick question / Critical thinking",
    prompt: item.prompt,
    options,
    correctIndex,
    explanation: item.explanation,
  };
}

// ---------- assembly ----------------------------------------------------

const GENERATORS_IN_ORDER = [
  genPercentageProfitLoss, genTimeWorkSpeed, genRatioSimplification,
  genNumberSeries, genCodingDecoding, genPuzzlePattern,
  genSynonymVocabulary, genSentenceCorrection, genReadingComprehension,
  genTableBased, genBarGraph, genPercentageAnalysis,
  genLogicalMathCombo, genCaseBased, genTrickCriticalThinking,
];

/** Generates the fixed 15-question set: 5 categories x 3 subtypes each. */
function generateLocalQuestionSet() {
  return GENERATORS_IN_ORDER.map((gen, i) => ({ id: `q${i + 1}`, ...gen() }));
}

module.exports = { generateLocalQuestionSet, CATEGORIES };
