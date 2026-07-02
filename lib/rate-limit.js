// Simple in-memory sliding-window rate limiter.
// Keyed by (bucket + ip + optional identifier). Suitable for a single-instance MVP;
// swap for Redis/Upstash before horizontal scaling.

const BUCKETS = new Map(); // key -> array of timestamps (ms)

function now() { return Date.now(); }

export function ipFromRequest(request) {
  const h = request.headers;
  // Prefer platform-provided headers set by the trusted proxy hop.
  // NEVER trust the *left-most* XFF value directly (attacker-controlled).
  const real = h.get('x-real-ip');
  if (real) return real.trim();
  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.trim();
  const xf = h.get('x-forwarded-for');
  if (xf) {
    // Take the RIGHT-most hop, which is the last node before our server (typically
    // the trusted ingress). This makes header spoofing impossible unless the ingress
    // is compromised.
    const parts = xf.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return 'unknown';
}

/**
 * @param {string} key - bucket key, e.g. `login:${ip}:${email}`
 * @param {object} opts
 * @param {number} opts.max - allowed requests within windowMs
 * @param {number} opts.windowMs - window in ms
 * @returns {{allowed: boolean, retryAfterMs: number, remaining: number}}
 */
export function rateLimit(key, { max, windowMs }) {
  const nowMs = now();
  const cutoff = nowMs - windowMs;
  const arr = BUCKETS.get(key) || [];
  // Drop old timestamps
  const fresh = arr.filter((t) => t > cutoff);
  if (fresh.length >= max) {
    const oldest = fresh[0];
    return { allowed: false, retryAfterMs: Math.max(0, windowMs - (nowMs - oldest)), remaining: 0 };
  }
  fresh.push(nowMs);
  BUCKETS.set(key, fresh);
  // Occasional cleanup so the Map doesn't grow forever.
  if (BUCKETS.size > 5000) {
    for (const [k, v] of BUCKETS) {
      if (!v.length || v[v.length - 1] < cutoff) BUCKETS.delete(k);
    }
  }
  return { allowed: true, retryAfterMs: 0, remaining: max - fresh.length };
}

export function rateLimitResponse(retryAfterMs) {
  const seconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  return {
    status: 429,
    headers: { 'Retry-After': String(seconds) },
    body: { error: 'Too many requests. Please try again later.' },
  };
}
