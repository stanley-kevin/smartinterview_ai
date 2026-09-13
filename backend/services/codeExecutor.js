const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const PISTON_URL = process.env.PISTON_URL || "https://emkc.org/api/v2/piston/execute";
const EXECUTION_TIMEOUT_MS = 6000;

const LANGUAGE_MAP = {
  javascript: {
    language: "javascript",
    version: "*",
    filename: "index.js",
  },
  python: {
    language: "python",
    version: "*",
    filename: "main.py",
  },
  cpp: {
    language: "cpp",
    version: "*",
    filename: "main.cpp",
  },
};

/**
 * Execute code snippet via local subprocess runner or Piston API
 * @param {object} params
 * @param {string} params.language - "javascript" | "python" | "cpp"
 * @param {string} params.code - source code string
 * @param {string} [params.stdin=""] - input passed to program
 * @returns {Promise<{stdout: string, stderr: string, code: number, compileError: string|null, error: string|null}>}
 */
async function executeCode({ language, code, stdin = "" }) {
  // If a custom self-hosted Piston URL is explicitly provided in .env, try it
  if (process.env.USE_REMOTE_PISTON === "true" && process.env.PISTON_URL) {
    try {
      const pistonRes = await runPiston({ language, code, stdin });
      if (pistonRes) return pistonRes;
    } catch (err) {
      console.warn(`[codeExecutor] Remote Piston failed: ${err.message}, switching to local sandbox`);
    }
  }

  // Local sandbox execution (supports JS, Python, C++)
  return executeLocalSandbox({ language, code, stdin });
}

/**
 * Local sandbox runner with timeouts and stdin piping
 */
function executeLocalSandbox({ language, code, stdin = "" }) {
  return new Promise((resolve) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "interview-exec-"));
    let child;
    let cleanup = () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {}
    };

    let stdout = "";
    let stderr = "";
    let compileError = null;
    let finished = false;

    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        if (child) {
          try {
            child.kill("SIGKILL");
          } catch (e) {}
        }
        cleanup();
        resolve({
          stdout: stdout.trim(),
          stderr: "Time Limit Exceeded (Execution timed out after 6 seconds)",
          compileError: null,
          exitCode: 124,
          error: "Time Limit Exceeded",
        });
      }
    }, EXECUTION_TIMEOUT_MS);

    try {
      if (language === "javascript") {
        const filePath = path.join(tmpDir, "solution.js");
        fs.writeFileSync(filePath, code, "utf8");

        child = spawn(process.execPath, [filePath], {
          cwd: tmpDir,
          env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=128" },
        });

        attachPipes(child, stdin, (out, err, code) => {
          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            cleanup();
            resolve({
              stdout: out.trim(),
              stderr: err.trim(),
              compileError: null,
              exitCode: code ?? 0,
              error: null,
            });
          }
        });
      } else if (language === "python") {
        const filePath = path.join(tmpDir, "solution.py");
        fs.writeFileSync(filePath, code, "utf8");

        child = spawn("python", [filePath], { cwd: tmpDir });

        attachPipes(child, stdin, (out, err, code) => {
          if (!finished) {
            finished = true;
            clearTimeout(timeout);
            cleanup();
            resolve({
              stdout: out.trim(),
              stderr: err.trim(),
              compileError: null,
              exitCode: code ?? 0,
              error: null,
            });
          }
        });
      } else if (language === "cpp") {
        const srcPath = path.join(tmpDir, "solution.cpp");
        const exePath = path.join(tmpDir, process.platform === "win32" ? "solution.exe" : "solution");
        fs.writeFileSync(srcPath, code, "utf8");

        // Compile first
        const compiler = spawn("g++", ["-O2", "-std=c++17", srcPath, "-o", exePath], { cwd: tmpDir });
        let compErr = "";
        compiler.stderr.on("data", (d) => (compErr += d.toString()));
        compiler.on("close", (compCode) => {
          if (compCode !== 0) {
            if (!finished) {
              finished = true;
              clearTimeout(timeout);
              cleanup();
              resolve({
                stdout: "",
                stderr: "",
                compileError: compErr.trim() || "Compilation failed",
                exitCode: compCode,
                error: "Compilation error",
              });
            }
            return;
          }

          // Run compiled binary
          child = spawn(exePath, [], { cwd: tmpDir });
          attachPipes(child, stdin, (out, err, runCode) => {
            if (!finished) {
              finished = true;
              clearTimeout(timeout);
              cleanup();
              resolve({
                stdout: out.trim(),
                stderr: err.trim(),
                compileError: null,
                exitCode: runCode ?? 0,
                error: null,
              });
            }
          });
        });
      } else {
        clearTimeout(timeout);
        cleanup();
        resolve({
          stdout: "",
          stderr: `Unsupported language: ${language}`,
          compileError: null,
          exitCode: 1,
          error: "Unsupported language",
        });
      }
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        cleanup();
        resolve({
          stdout: "",
          stderr: err.message,
          compileError: null,
          exitCode: 1,
          error: err.message,
        });
      }
    }
  });
}

function attachPipes(child, stdin, callback) {
  let stdout = "";
  let stderr = "";

  if (child.stdout) child.stdout.on("data", (d) => (stdout += d.toString()));
  if (child.stderr) child.stderr.on("data", (d) => (stderr += d.toString()));

  child.on("error", (err) => {
    stderr += `\n${err.message}`;
    callback(stdout, stderr, 1);
  });

  child.on("close", (code) => {
    callback(stdout, stderr, code);
  });

  if (stdin) {
    child.stdin.write(stdin.trim() + "\n");
  }
  child.stdin.end();
}

async function runPiston({ language, code, stdin = "" }) {
  const langConfig = LANGUAGE_MAP[language] || LANGUAGE_MAP.javascript;
  const res = await fetch(PISTON_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      language: langConfig.language,
      version: langConfig.version,
      files: [{ name: langConfig.filename, content: code }],
      stdin: stdin ? String(stdin).trim() + "\n" : "",
      run_timeout: 5000,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return {
    stdout: (data.run?.stdout || "").trim(),
    stderr: (data.run?.stderr || "").trim(),
    compileError: data.compile?.stderr || null,
    exitCode: data.run?.code ?? 0,
    error: null,
  };
}

module.exports = {
  executeCode,
  LANGUAGE_MAP,
};
