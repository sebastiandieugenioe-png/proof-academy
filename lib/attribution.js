// First-party attribution helpers.
// Shared by:
//   - middleware.js         (edge; sets cookies on incoming page loads)
//   - /app/go/[slug]        (node; overrides UTMs to those on the tracking link)
//   - /api/tracking/ingest  (node; persists visitor/session/visit rows)
//   - /api/register         (node; copies first/last touch onto the new user)
//
// Design notes:
//  * Cookies are HTTP-only (no client JS reads them). Server routes read via request.cookies.
//  * Values are base64url-encoded JSON with a hard length ceiling (500 chars) to keep cookies small.
//  * FIRST touch is never overwritten. LAST touch is always overwritten when new UTMs arrive.
//  * Sanitisation: UTM strings are clipped to 120 chars and stripped of control chars.
//
// This module MUST remain Edge-safe (no Node-only APIs). Anything DB-related lives
// in /lib/api/handlers/tracking.js.

export const COOKIE_NAMES = Object.freeze({
  visitor: 'osc_vid',
  session: 'osc_sid',
  firstTouch: 'osc_ft',
  lastTouch: 'osc_lt',
});

// 30 days for visitor + attribution cookies.
export const ATTR_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;
// 30 min sliding for the session cookie — refreshed on every request that
// hits middleware/go/ingest. Keeps distinct sessions from bleeding together.
export const SESSION_COOKIE_MAX_AGE = 30 * 60;

export const UTM_KEYS = Object.freeze(['source', 'medium', 'campaign', 'content', 'term']);

const SAFE_UTM_MAX_LEN = 120;
const SAFE_URL_MAX_LEN = 500;
const MAX_COOKIE_VALUE_LEN = 500;

// ---- Sanitisation --------------------------------------------------------

export function sanitizeUtmValue(v) {
  if (typeof v !== 'string') return null;
  // Drop control chars (incl. newlines) and clip to a safe max length.
  // eslint-disable-next-line no-control-regex
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, SAFE_UTM_MAX_LEN);
}

export function sanitizePath(v) {
  if (typeof v !== 'string') return null;
  // eslint-disable-next-line no-control-regex
  const cleaned = v.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!cleaned) return null;
  return cleaned.slice(0, SAFE_URL_MAX_LEN);
}

// ---- UTM reading ---------------------------------------------------------

// Parse UTMs from a URL / URLSearchParams. Returns an object with only the keys
// that were present with non-empty values. Returns null when no UTM was seen.
export function readUtmsFromSearchParams(searchParams) {
  const out = {};
  for (const key of UTM_KEYS) {
    const raw = searchParams.get(`utm_${key}`);
    const clean = sanitizeUtmValue(raw);
    if (clean) out[key] = clean;
  }
  return Object.keys(out).length ? out : null;
}

export function readUtmsFromUrl(urlLike) {
  try {
    const u = urlLike instanceof URL ? urlLike : new URL(urlLike);
    return readUtmsFromSearchParams(u.searchParams);
  } catch { return null; }
}

// ---- Touch payload encoding ---------------------------------------------

// Serialise a touch object to a compact base64url string suitable for a cookie value.
// Shape:
//   { s, m, c, co?, t?, ts, u? }
//     s  = utm_source, m = utm_medium, c = utm_campaign,
//     co = utm_content, t = utm_term, ts = unix seconds, u = referring path
export function encodeTouch(touch) {
  if (!touch || typeof touch !== 'object') return null;
  const payload = {};
  if (touch.source) payload.s = touch.source;
  if (touch.medium) payload.m = touch.medium;
  if (touch.campaign) payload.c = touch.campaign;
  if (touch.content) payload.co = touch.content;
  if (touch.term) payload.t = touch.term;
  if (touch.ts) payload.ts = touch.ts;
  if (touch.url) payload.u = touch.url;
  const json = JSON.stringify(payload);
  const b64 = toBase64Url(json);
  return b64.length > MAX_COOKIE_VALUE_LEN ? null : b64;
}

export function decodeTouch(cookieValue) {
  if (typeof cookieValue !== 'string' || !cookieValue) return null;
  try {
    const json = fromBase64Url(cookieValue);
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== 'object') return null;
    return {
      source:   sanitizeUtmValue(obj.s)  || null,
      medium:   sanitizeUtmValue(obj.m)  || null,
      campaign: sanitizeUtmValue(obj.c)  || null,
      content:  sanitizeUtmValue(obj.co) || null,
      term:     sanitizeUtmValue(obj.t)  || null,
      ts:       typeof obj.ts === 'number' ? obj.ts : null,
      url:      sanitizePath(obj.u)      || null,
    };
  } catch { return null; }
}

// ---- Cookie option builders (usable by NextResponse / Node routes) ------

const isProd = process.env.NODE_ENV === 'production';

// ---- Consent gate ---------------------------------------------------------
// Attribution cookies are not strictly necessary, so under the Irish ePrivacy
// Regulations (S.I. 336/2011) they are only set after the visitor consents.
// components/AttributionTracker.js sets CONSENT_COOKIE when the consent banner
// (Google's certified CMP, via the IAB TCF API) reports consent to store
// information on the device (TCF purpose 1), or when GDPR does not apply.
export const CONSENT_COOKIE = 'osc_consent';

export function hasConsent(request) {
  return request.cookies.get(CONSENT_COOKIE)?.value === '1';
}

export function attributionCookieOptions(maxAge = ATTR_COOKIE_MAX_AGE) {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge,
  };
}

// ---- ID minting ---------------------------------------------------------

// Uses Web Crypto (Edge + Node runtimes both expose randomUUID).
export function mintId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* fallthrough */ }
  // Fallback — non-cryptographic, only used if crypto is unavailable.
  return 'v-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---- base64url helpers (Edge-safe) --------------------------------------

function toBase64Url(str) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url');
  }
  const b64 = btoa(unescape(encodeURIComponent(str)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url) {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64url, 'base64url').toString('utf8');
  }
  const pad = b64url.length % 4 === 0 ? '' : '='.repeat(4 - (b64url.length % 4));
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return decodeURIComponent(escape(atob(b64)));
}
