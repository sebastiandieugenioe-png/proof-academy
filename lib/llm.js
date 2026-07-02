// Emergent LLM proxy client (OpenAI-compatible).
const LLM_URL = 'https://integrations.emergentagent.com/llm/v1/chat/completions';
const DEFAULT_MODEL = process.env.LLM_MODEL || 'claude-sonnet-4-5-20250929';

function stripFences(text) {
  if (!text) return text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

// Global single-flight semaphore. Emergent's proxy only allows 1 concurrent request.
let _chain = Promise.resolve();
function serialize(fn) {
  const next = _chain.then(fn, fn);
  // Prevent unhandled rejection from breaking the chain
  _chain = next.catch(() => {});
  return next;
}

async function _callOnce({ system, user, model, maxTokens, temperature }) {
  const apiKey = process.env.EMERGENT_LLM_KEY;
  const body = {
    model,
    max_tokens: maxTokens,
    temperature,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  };
  const maxAttempts = 6;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = Math.min(30000, 1200 * Math.pow(2, attempt - 1)) + Math.floor(Math.random() * 400);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const data = await res.json();
    if (!res.ok) throw new Error(`LLM ${res.status}: ${JSON.stringify(data).slice(0, 400)}`);
    return { raw: data?.choices?.[0]?.message?.content || '', usage: data.usage };
  }
  throw new Error('LLM: exhausted retries after 429/5xx');
}

export async function llmJSON({ system, user, model = DEFAULT_MODEL, maxTokens = 6000, temperature = 0.6 }) {
  const apiKey = process.env.EMERGENT_LLM_KEY;
  if (!apiKey) throw new Error('EMERGENT_LLM_KEY missing from environment');

  // Two attempts: on JSON parse failure, ask the model to re-emit valid JSON.
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { raw, usage } = await serialize(() => _callOnce({ system, user, model, maxTokens, temperature }));
    const cleaned = stripFences(raw);
    try {
      return { json: JSON.parse(cleaned), raw, usage };
    } catch (_) {
      const first = cleaned.indexOf('{');
      const last = cleaned.lastIndexOf('}');
      if (first !== -1 && last > first) {
        try { return { json: JSON.parse(cleaned.slice(first, last + 1)), raw, usage }; }
        catch (__) { /* fallthrough */ }
      }
      if (attempt === 2) throw new Error('LLM did not return valid JSON: ' + cleaned.slice(0, 300));
      // Retry with an explicit fixer instruction
      user = user + '\n\nIMPORTANT: your previous response contained invalid JSON. Return ONLY a valid JSON object, no trailing commas, no unescaped quotes inside strings, no explanatory text.';
    }
  }
  throw new Error('LLM: unreachable');
}
