// Shared utilities for /api handlers — pure functions, no I/O.
// Extracted from the previously-monolithic /app/app/api/[[...path]]/route.js
// so each domain handler can pull only what it needs.
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { rateLimitResponse } from '@/lib/rate-limit';

// ---- Constants -----------------------------------------------------------

export const BCRYPT_ROUNDS = 10;
export const MIN_PASSWORD = 8;

// Slug rules for pages/courses: lowercase, alphanumeric + dashes, 1-80 chars.
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Reserved slugs (cannot be used for public pages or renamed courses).
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'learn', 'about', 'privacy', 'terms', 'contact', 'newsletter', 'journal', 'p',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images',
]);

// Reserved slugs specifically for PUBLIC PAGES (pages tab) — courses live under /learn/*,
// so course slugs can be more flexible. But pages sit at site root, so we forbid clashes with the SPA.
export const RESERVED_PAGE_SLUGS = new Set([
  'admin', 'api', 'learn', 'p', 'unsubscribe', 'journal',
  'verify-email', 'forgot-password', 'reset-password',
  'brand',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images',
]);

// GDPR audience profiling — role options.
export const ROLE_OPTIONS = new Set([
  'Bartender', 'Barback', 'Waiter/Server', 'Hospitality student',
  'Cocktail enthusiast', 'Spirits enthusiast', 'Beer enthusiast', 'Wine enthusiast',
  'Bar manager', 'Other',
]);

// ---- Response helpers ----------------------------------------------------

export const json = (data, init = {}) => NextResponse.json(data, init);
export const err = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

// 429 response helper — takes the retry-after hint from rateLimit() and wraps it in a NextResponse.
export function tooMany(retryAfterMs) {
  const r = rateLimitResponse(retryAfterMs);
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}

// ---- Value helpers -------------------------------------------------------

// Generate a URL-safe random token for one-click newsletter unsubscribe links.
// 32 bytes = 43 chars base64url — plenty of entropy, no PII, safe in mailto links.
export function newUnsubToken() {
  return crypto.randomBytes(32).toString('base64url');
}

export function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return 'Password is too long.';
  return null;
}

export function sanitizeUserOut(u) {
  if (!u) return u;
  const c = { ...u };
  delete c._id;
  delete c.passwordHash;
  return c;
}

export function sanitizeProfileField(v, max = 80) {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

export function sanitizeRole(v) {
  const t = sanitizeProfileField(v, 40);
  if (!t) return null;
  return ROLE_OPTIONS.has(t) ? t : 'Other';
}

// Strip "Beginner" suffix from public-facing course titles (level is still "Beginner" for filtering/admin).
export function publicCourseTitle(course) {
  if (!course?.title) return course?.title;
  return course.title.replace(/\s+Beginner\s*$/i, '').trim();
}

// ---- Diagnostic helpers --------------------------------------------------

// Diagnose which auth env var is likely misconfigured, WITHOUT leaking values.
// Returned as a machine-readable object so the ops person can see it in platform logs
// AND in the response body of a 503 (safe — no secret content is exposed).
export function diagnoseAuthEnv() {
  const PLACEHOLDER = /(change[-_ ]?in[-_ ]?prod|preview[-_ ]?(only|secret|session|user)|rotate[-_ ]?(in|to|before)|placeholder|example\.com|insecure|dev[-_ ]?only)/i;
  const inspect = (name) => {
    const v = process.env[name];
    if (!v) return { name, set: false, reason: 'unset' };
    if (v.length < 24) return { name, set: true, length: v.length, reason: `length ${v.length} < 24 required` };
    if (process.env.NODE_ENV === 'production' && PLACEHOLDER.test(v)) return { name, set: true, reason: 'matches a placeholder pattern (contains e.g. "rotate", "preview", "change-in-prod", ...)' };
    return { name, set: true, ok: true };
  };
  return {
    nodeEnv: process.env.NODE_ENV || 'undefined',
    baseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
    adminEmails: (process.env.ADMIN_EMAILS || '').split(',').map((s) => s.trim()).filter(Boolean).length,
    adminPassword: process.env.ADMIN_PASSWORD ? (process.env.NODE_ENV === 'production' && PLACEHOLDER.test(process.env.ADMIN_PASSWORD) ? 'set-but-placeholder' : 'set') : 'unset',
    adminSessionSecret: inspect('ADMIN_SESSION_SECRET'),
    userSessionSecret: inspect('USER_SESSION_SECRET'),
  };
}
