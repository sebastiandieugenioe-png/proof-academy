import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'osc_admin';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function adminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).trim().toLowerCase());
}

// Reject obvious placeholders in production. The prior guard checked only length,
// which meant the committed dev placeholder string passed. Keep this list in sync
// with the strings in `/app/.env`.
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
  const s = process.env.ADMIN_SESSION_SECRET;
  const inProd = process.env.NODE_ENV === 'production';
  if (!s || s.length < 24 || (inProd && isPlaceholder(s))) {
    if (inProd) {
      throw new Error('ADMIN_SESSION_SECRET must be a strong, non-placeholder value (>=24 chars) in production.');
    }
    // Development-only fallback — NEVER used in production due to guard above.
    return 'osc-dev-only-admin-session-secret-do-not-use-in-prod';
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
  const [body, mac] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(mac); const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}

export function checkPassword(input) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw || !input) return false;
  // In production, refuse to authenticate against a placeholder admin password.
  if (process.env.NODE_ENV === 'production' && isPlaceholder(pw)) {
    console.error('ADMIN_PASSWORD is a placeholder value — refusing admin login.');
    return false;
  }
  const a = Buffer.from(String(input));
  const b = Buffer.from(pw);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function makeSessionToken(email) {
  return sign({ email: String(email).toLowerCase(), admin: true, exp: Date.now() + SESSION_TTL_MS });
}

export async function getAdminSession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  const payload = verify(token);
  if (!payload?.admin) return null;
  if (!isAdminEmail(payload.email)) return null;
  return payload;
}

export function getAdminSessionFromRequest(request) {
  // For API route handlers where cookies() from next/headers is also available,
  // but request.cookies is simpler and doesn't need await.
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const payload = verify(token);
  if (!payload?.admin) return null;
  if (!isAdminEmail(payload.email)) return null;
  return payload;
}

export const ADMIN_COOKIE = {
  name: COOKIE_NAME,
  options: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  },
};
