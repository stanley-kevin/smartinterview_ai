const Attempt = require("../models/Attempt");
const { executeCode } = require("./codeExecutor");
const { groqChat } = require("./groqService");

const CODING_PROBLEMS = [
  {
    id: "two-sum",
    title: "Target Sum Indices (Two Sum)",
    difficulty: "Easy",
    timeLimitMinutes: 30,
    tags: ["Array", "Hash Table"],
    description: `Given an array of integers \`nums\` and an integer \`target\`, return indices of the two numbers such that they add up to \`target\`.

You may assume that each input would have exactly one solution, and you may not use the same element twice.
You can return the answer with indices separated by a space, sorted in ascending order.`,
    inputFormat: "First line contains the target integer. Second line contains the space-separated integers in the array.",
    outputFormat: "Two space-separated integers representing the 0-based indices.",
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists.",
    ],
    sampleCases: [
      {
        input: "9\n2 7 11 15",
        output: "0 1",
        explanation: "Because nums[0] + nums[1] == 2 + 7 == 9, we return 0 1.",
      },
      {
        input: "6\n3 2 4",
        output: "1 2",
        explanation: "Because nums[1] + nums[2] == 2 + 4 == 6, we return 1 2.",
      },
      {
        input: "6\n3 3",
        output: "0 1",
        explanation: "nums[0] + nums[1] == 3 + 3 == 6, we return 0 1.",
      },
    ],
    hiddenCases: [
      { input: "10\n1 2 3 4 6", output: "3 4" },
      { input: "0\n-3 4 3 90", output: "0 2" },
      { input: "100\n5 20 35 80 95", output: "0 4" },
      { input: "-8\n-1 -2 -3 -4 -5", output: "2 4" },
      { input: "14\n1 7 11 13 7", output: "1 4" },
    ],
    starterCode: {
      javascript: `// Read input from stdin
const fs = require('fs');
const raw = fs.readFileSync(0, 'utf-8').trim();
const lines = raw.split(/\\r?\\n/);

function twoSum(target, nums) {
  // TODO: Implement your solution here
  // Return two 0-based indices separated by a space (e.g. "0 1")
  return "";
}

function solve() {
  if (lines.length < 2) return;
  const target = parseInt(lines[0].trim(), 10);
  const nums = lines[1].trim().split(/\\s+/).map(Number);

  const result = twoSum(target, nums);
  console.log(result);
}

solve();
`,
      python: `import sys

def two_sum(target: int, nums: list[int]) -> str:
    # TODO: Implement your solution here
    # Return two 0-based indices separated by a space (e.g. "0 1")
    return ""

def solve():
    lines = sys.stdin.read().split()
    if not lines:
        return
    target = int(lines[0])
    nums = [int(x) for x in lines[1:]]

    result = two_sum(target, nums)
    print(result)

if __name__ == '__main__':
    solve()
`,
      cpp: `#include <iostream>
#include <vector>
#include <string>

using namespace std;

string twoSum(int target, const vector<int>& nums) {
    // TODO: Implement your solution here
    // Return two 0-based indices separated by a space (e.g. "0 1")
    return "";
}

int main() {
    int target;
    if (!(cin >> target)) return 0;
    
    vector<int> nums;
    int val;
    while (cin >> val) {
        nums.push_back(val);
    }

    cout << twoSum(target, nums) << "\\n";
    return 0;
}
`,
    },
  },
  {
    id: "valid-parentheses",
    title: "Valid Parentheses String",
    difficulty: "Easy",
    timeLimitMinutes: 25,
    tags: ["String", "Stack"],
    description: `Given a string \`s\` containing just the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine if the input string is valid.

An input string is valid if:
1. Open brackets must be closed by the same type of brackets.
2. Open brackets must be closed in the correct order.
3. Every close bracket has a corresponding open bracket of the same type.

Output "true" if valid, or "false" otherwise.`,
    inputFormat: "A single line containing the bracket string.",
    outputFormat: "A single line with \"true\" or \"false\".",
    constraints: ["1 <= s.length <= 10^4", "s consists of parentheses only '()[]{}'."],
    sampleCases: [
      {
        input: "()",
        output: "true",
        explanation: "Simple matching pair.",
      },
      {
        input: "()[]{}",
        output: "true",
        explanation: "All pairs match in order.",
      },
      {
        input: "(]",
        output: "false",
        explanation: "Mismatched bracket types.",
      },
    ],
    hiddenCases: [
      { input: "([)]", output: "false" },
      { input: "{[]}", output: "true" },
      { input: "(((", output: "false" },
      { input: ")))", output: "false" },
      { input: "{[()()]}", output: "true" },
      { input: "()(){}[()]", output: "true" },
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').trim();

function isValid(str) {
  // TODO: Implement your solution here
  // Return true if valid bracket sequence, or false otherwise
  return false;
}

console.log(isValid(s) ? "true" : "false");
`,
      python: `import sys

def isValid(s: str) -> bool:
    # TODO: Implement your solution here
    # Return True if valid bracket sequence, or False otherwise
    return False

if __name__ == '__main__':
    s = sys.stdin.read().strip()
    print("true" if isValid(s) else "false")
`,
      cpp: `#include <iostream>
#include <string>

using namespace std;

bool isValid(const string& s) {
    // TODO: Implement your solution here
    // Return true if valid bracket sequence, or false otherwise
    return false;
}

int main() {
    string s;
    if (cin >> s) {
        cout << (isValid(s) ? "true" : "false") << "\\n";
    }
    return 0;
}
`,
    },
  },
  {
    id: "longest-unique-substring",
    title: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    timeLimitMinutes: 30,
    tags: ["String", "Sliding Window", "Hash Table"],
    description: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.`,
    inputFormat: "A single line containing string \`s\`.",
    outputFormat: "An integer representing the length of the longest substring.",
    constraints: ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols and spaces."],
    sampleCases: [
      {
        input: "abcabcbb",
        output: "3",
        explanation: "The answer is 'abc', with the length of 3.",
      },
      {
        input: "bbbbb",
        output: "1",
        explanation: "The answer is 'b', with the length of 1.",
      },
      {
        input: "pwwkew",
        output: "3",
        explanation: "The answer is 'wke', with the length of 3.",
      },
    ],
    hiddenCases: [
      { input: " ", output: "1" },
      { input: "au", output: "2" },
      { input: "dvdf", output: "3" },
      { input: "tmmzuxt", output: "5" },
      { input: "abcdefghij", output: "10" },
    ],
    starterCode: {
      javascript: `const fs = require('fs');
const s = fs.readFileSync(0, 'utf-8').replace(/[\\r\\n]+$/, '');

function lengthOfLongestSubstring(str) {
  // TODO: Implement your solution here
  // Return the integer length of longest substring without repeating characters
  return 0;
}

console.log(lengthOfLongestSubstring(s));
`,
      python: `import sys

def lengthOfLongestSubstring(s: str) -> int:
    # TODO: Implement your solution here
    # Return the integer length of longest substring without repeating characters
    return 0

if __name__ == '__main__':
    raw = sys.stdin.read().rstrip('\\r\\n')
    print(lengthOfLongestSubstring(raw))
`,
      cpp: `#include <iostream>
#include <string>

using namespace std;

int lengthOfLongestSubstring(const string& s) {
    // TODO: Implement your solution here
    // Return the integer length of longest substring without repeating characters
    return 0;
}

int main() {
    string s;
    if (getline(cin, s)) {
        cout << lengthOfLongestSubstring(s) << "\\n";
    }
    return 0;
}
`,
    },
  },
];

/**
 * Start a new Coding attempt
 */
async function startCoding({ userId, role, company, mode }) {
  // Select a problem from the catalog
  const problem = CODING_PROBLEMS[Math.floor(Math.random() * CODING_PROBLEMS.length)];

  // Create attempt
  const attempt = await Attempt.create({
    user: userId,
    mode,
    company: company || null,
    role,
    roundKey: "coding",
    status: "in-progress",
    codingData: {
      problem: {
        id: problem.id,
        title: problem.title,
        difficulty: problem.difficulty,
        tags: problem.tags,
        description: problem.description,
        inputFormat: problem.inputFormat,
        outputFormat: problem.outputFormat,
        constraints: problem.constraints,
        sampleCases: problem.sampleCases,
        hiddenCases: problem.hiddenCases, // preserved server-side
        starterCode: problem.starterCode,
      },
      userCode: problem.starterCode.javascript,
      language: "javascript",
      sampleResults: [],
      hiddenResults: [],
      passRate: 0,
      qualitativeFeedback: null,
    },
  });

  return {
    attemptId: attempt._id,
    problem: {
      id: problem.id,
      title: problem.title,
      difficulty: problem.difficulty,
      tags: problem.tags,
      description: problem.description,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      sampleCases: problem.sampleCases,
      hiddenCasesCount: problem.hiddenCases.length,
      starterCode: problem.starterCode,
    },
    durationMinutes: problem.timeLimitMinutes || 30,
  };
}

/**
 * Run user code against visible sample test cases only
 */
async function runSampleCases({ attemptId, userId, code, language }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    throw new Error("Coding attempt not found");
  }

  const problem = attempt.codingData.problem;
  const sampleCases = problem.sampleCases || [];

  const results = [];
  for (let i = 0; i < sampleCases.length; i++) {
    const testCase = sampleCases[i];
    const exec = await executeCode({
      language,
      code,
      stdin: testCase.input,
    });

    const normalizedExpected = (testCase.output || "").trim();
    const normalizedActual = (exec.stdout || "").trim();
    const passed =
      !exec.compileError &&
      !exec.stderr &&
      !exec.error &&
      normalizedExpected.length > 0 &&
      normalizedActual.length > 0 &&
      normalizedActual === normalizedExpected;

    results.push({
      caseIndex: i + 1,
      input: testCase.input,
      expectedOutput: normalizedExpected,
      actualOutput: normalizedActual,
      stdout: exec.stdout,
      stderr: exec.stderr,
      compileError: exec.compileError,
      passed,
      explanation: testCase.explanation,
    });
  }

  // Update draft code in Attempt
  attempt.codingData.userCode = code;
  attempt.codingData.language = language;
  attempt.codingData.sampleResults = results;
  attempt.markModified("codingData");
  await attempt.save();

  const allPassed =
    sampleCases.length > 0 &&
    results.length === sampleCases.length &&
    results.every((r) => r.passed === true);

  return {
    results,
    allPassed,
    passedCount: results.filter((r) => r.passed === true).length,
    totalCount: results.length,
  };
}

/**
 * Submit user code against hidden test cases + LLM qualitative review
 * Structurally guarantees:
 * 1. Sample test cases are re-verified against submitted code; rejected if any fail.
 * 2. Hidden test cases are executed through codeExecutor.
 * 3. Final score is computed directly from hidden-case pass rate (passed / total * 100).
 * 4. LLM qualitative feedback is advisory and cannot alter the test-backed score.
 */
async function submitCode({ attemptId, userId, code, language }) {
  const attempt = await Attempt.findOne({ _id: attemptId, user: userId });
  if (!attempt) {
    const err = new Error("Coding attempt not found");
    err.statusCode = 404;
    throw err;
  }

  const problem = attempt.codingData.problem;
  const sampleCases = problem.sampleCases || [];

  // 1. Re-verify sample cases pass server-side
  let samplePassedCount = 0;
  for (let i = 0; i < sampleCases.length; i++) {
    const sc = sampleCases[i];
    const execSample = await executeCode({
      language,
      code,
      stdin: sc.input,
    });

    const normalizedExpected = (sc.output || "").trim();
    const normalizedActual = (execSample.stdout || "").trim();
    const passed =
      !execSample.compileError &&
      !execSample.stderr &&
      !execSample.error &&
      normalizedExpected.length > 0 &&
      normalizedActual.length > 0 &&
      normalizedActual === normalizedExpected;
    if (passed) samplePassedCount++;
  }

  if (sampleCases.length > 0 && samplePassedCount < sampleCases.length) {
    const err = new Error(
      `Cannot submit: Sample test cases failed (${samplePassedCount}/${sampleCases.length} passed). Run and pass all sample cases first.`
    );
    err.statusCode = 400;
    throw err;
  }

  // 2. Execute hidden test cases
  const hiddenCases = problem.hiddenCases || [];
  const hiddenResults = [];
  let passedCount = 0;

  for (let i = 0; i < hiddenCases.length; i++) {
    const testCase = hiddenCases[i];
    const exec = await executeCode({
      language,
      code,
      stdin: testCase.input,
    });

    const normalizedExpected = (testCase.output || "").trim();
    const normalizedActual = (exec.stdout || "").trim();
    const passed =
      !exec.compileError &&
      !exec.stderr &&
      !exec.error &&
      normalizedExpected.length > 0 &&
      normalizedActual.length > 0 &&
      normalizedActual === normalizedExpected;

    if (passed) passedCount++;

    hiddenResults.push({
      caseIndex: i + 1,
      passed,
      error: exec.compileError || exec.stderr || null,
      status: passed
        ? "Accepted"
        : exec.error === "Time Limit Exceeded"
        ? "Time Limit Exceeded"
        : exec.compileError
        ? "Compile Error"
        : exec.stderr
        ? "Runtime Error"
        : "Wrong Answer",
    });
  }

  const totalCases = hiddenCases.length;
  // 3. Base score computed strictly from real execution pass rate
  const testPassPct = Math.round((passedCount / Math.max(1, totalCases)) * 100);
  const finalScore = testPassPct;

  // 4. Advisory qualitative AI review
  let qualitativeFeedback = null;
  const reviewSystemPrompt = `You are a Senior Technical Interviewer and Code Reviewer.
Analyze the candidate's code submission for the problem: "${problem.title}".

Problem Summary:
${problem.description}

Candidate Language: ${language}
Test Cases Passed: ${passedCount}/${totalCases} (${testPassPct}%)

Provide an objective evaluation. Return JSON with this schema:
{
  "codeQualityScore": number (0-100),
  "timeComplexity": "e.g. O(N) or O(N^2)",
  "spaceComplexity": "e.g. O(N) or O(1)",
  "codeQuality": "string critique of structure, readability, and naming",
  "edgeCases": "string critique of boundary handling",
  "strengths": ["string", "string"],
  "improvements": ["string", "string"],
  "summary": "2-3 sentences overview"
}`;

  try {
    const aiReview = await groqChat(
      [
        { role: "system", content: "You are a code review expert. Return strict JSON." },
        { role: "user", content: `Candidate code:\n\`\`\`${language}\n${code}\n\`\`\`\n\n${reviewSystemPrompt}` },
      ],
      { json: true, temperature: 0.3 }
    );

    if (aiReview && typeof aiReview.codeQualityScore === "number") {
      qualitativeFeedback = aiReview;
    }
  } catch (err) {
    console.error("[coding] Qualitative AI review failed:", err.message);
  }

  if (!qualitativeFeedback) {
    qualitativeFeedback = evaluateFallbackCoding(code, language, testPassPct);
  }

  attempt.score = finalScore;
  attempt.status = "completed";
  attempt.completedAt = new Date();
  attempt.codingData.userCode = code;
  attempt.codingData.language = language;
  attempt.codingData.hiddenResults = hiddenResults;
  attempt.codingData.passRate = testPassPct;
  attempt.codingData.qualitativeFeedback = qualitativeFeedback;
  attempt.feedback = {
    summary: qualitativeFeedback.summary,
    strengths: qualitativeFeedback.strengths || ["Implemented logical problem-solving approach", "Correctly structured I/O parsing"],
    improvements: qualitativeFeedback.improvements || ["Consider optimization for edge constraints", "Improve variable readability and error checks"],
  };

  attempt.markModified("codingData");
  attempt.markModified("feedback");
  await attempt.save();

  return {
    attemptId: attempt._id,
    score: finalScore,
    testPassPct,
    passedCount,
    totalCases,
    hiddenResults,
    qualitativeFeedback,
    feedback: attempt.feedback,
  };
}

function evaluateFallbackCoding(code, language, testPassPct) {
  const lineCount = code.split("\n").length;
  const hasMap = code.includes("Map") || code.includes("dict") || code.includes("unordered_map") || code.includes("{}");
  const hasLoop = code.includes("for") || code.includes("while");

  let codeQualityScore = testPassPct >= 80 ? 85 : testPassPct > 0 ? 70 : 45;
  if (hasMap && hasLoop) codeQualityScore += 5;

  return {
    codeQualityScore: Math.min(95, codeQualityScore),
    timeComplexity: hasMap ? "O(N)" : "O(N^2)",
    spaceComplexity: hasMap ? "O(N)" : "O(1)",
    codeQuality: "Code is structured with clear flow and appropriate algorithmic constructs for the selected language.",
    edgeCases: testPassPct === 100 ? "All edge cases and boundary tests resolved successfully." : "Some boundary edge cases or performance constraints were missed.",
    strengths: [
      "Effective implementation of core algorithmic pattern",
      `Clean standard I/O integration for ${language}`,
    ],
    improvements: [
      "Review space vs time trade-offs for high-scale input constraints",
      "Add inline defensive boundary checks for empty or malformed inputs",
    ],
    summary: `Solved ${testPassPct}% of hidden test suites with clean ${language} logic and structured complexity.`,
  };
}

module.exports = {
  startCoding,
  runSampleCases,
  submitCode,
};
