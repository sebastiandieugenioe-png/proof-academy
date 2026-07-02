// HTTP-only signed session cookie for regular users.
// Replaces the previous localStorage.osc.userId + x-user-id header design.
// Server is the ONLY source of truth for the current user's id.

import crypto from 'crypto';

export const USER_COOKIE_NAME = 'osc_user';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Reject obvious placeholders in production. Keep this list in sync with `.env`.
const PLACEHOLDER_PATTERNS = [
  /change[-_ ]?in[-_ ]?prod/i,
  /preview[-_ ]?(only|secret|session|user)/i,
  /rotate[-_ ]?(in|to|before)/i,
  /placeholder/i,
  /example\.com/i,
  /insecure/i,
  /dev[-_ ]?only/i,
];
function isPlaceholder(s) {
  return typeof s === 'string' && PLACEHOLDER_PATTERNS.some((r) => r.test(s));
}

function secret() {
  const s = process.env.USER_SESSION_SECRET;
  const inProd = process.env.NODE_ENV === 'production';
  if (!s || s.length < 24 || (inProd && isPlaceholder(s))) {
    if (inProd) {
      throw new Error('USER_SESSION_SECRET must be a strong, non-placeholder value (>=24 chars) in production.');
    }
    // Development-only fallback derived from another env value; never used in prod due to the guard.
    return (process.env.ADMIN_SESSION_SECRET || '') + '::user-fallback-dev-only';
  }
  return s;
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const idx = token.indexOf('.');
  const body = token.slice(0, idx);
  const mac = token.slice(idx + 1);
  if (!body || !mac) return null;
  try {
    const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
    const a = Buffer.from(mac);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload || typeof payload.userId !== 'string') return null;
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function makeUserSessionToken(userId) {
  if (typeof userId !== 'string' || !userId) throw new Error('userId must be a non-empty string');
  return sign({ userId, exp: Date.now() + SESSION_TTL_MS });
}

// Read + verify the cookie from a Next.js Request (App Router). Returns the userId string or null.
export function getUserIdFromRequest(request) {
  try {
    const token = request.cookies.get(USER_COOKIE_NAME)?.value;
    const payload = verify(token);
    return payload?.userId || null;
  } catch { return null; }
}

export const USER_COOKIE = {
  name: USER_COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  },
};

export const USER_COOKIE_CLEAR = {
  name: USER_COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  },
};
