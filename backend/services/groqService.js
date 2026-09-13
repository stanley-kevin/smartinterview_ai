/**
 * Thin wrapper around Groq's OpenAI-compatible chat completions endpoint.
 *
 * Design contract: this NEVER throws. If GROQ_API_KEY is missing, the
 * request fails, or the model returns something that isn't valid JSON,
 * it resolves to `null` and the caller (resumeAnalyzer / aptitudeService)
 * falls back to its own deterministic, dynamic local generator. This is
 * what lets "Generate dynamic questions" work correctly out of the box,
 * with or without an AI key configured.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
const TIMEOUT_MS = 20000;

/**
 * @param {string} systemPrompt - instructions + required JSON shape
 * @param {string} userPrompt - the actual task input (resume text, role, etc.)
 * @returns {Promise<object|null>} parsed JSON object, or null on any failure
 */
async function groqJSON(systemPrompt, userPrompt) {
  if (!process.env.GROQ_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`[groq] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    return JSON.parse(raw);
  } catch (error) {
    console.error(`[groq] request failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * @param {Array<{role: string, content: string}>} messages
 * @param {object} options
 * @param {boolean} [options.json=true]
 * @param {number} [options.temperature=0.7]
 * @param {number} [options.timeoutMs=20000]
 * @returns {Promise<object|string|null>}
 */
async function groqChat(messages, { json = true, temperature = 0.7, timeoutMs = TIMEOUT_MS } = {}) {
  if (!process.env.GROQ_API_KEY) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const body = {
      model: DEFAULT_MODEL,
      temperature,
      messages,
    };
    if (json) {
      body.response_format = { type: "json_object" };
    }

    const res = await fetch(GROQ_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[groq] HTTP ${res.status}: ${await res.text().catch(() => "")}`);
      return null;
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content;
    if (!raw) return null;

    return json ? JSON.parse(raw) : raw;
  } catch (error) {
    console.error(`[groq] chat request failed: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  groqJSON,
  groqChat,
  isConfigured: () => Boolean(process.env.GROQ_API_KEY),
};
