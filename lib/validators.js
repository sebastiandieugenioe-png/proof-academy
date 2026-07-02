// Type-safe input validators used across the API layer.
// Any value that will be interpolated into a Mongo filter MUST pass isSafeId().
// This prevents NoSQL operator injection (e.g. { $ne: null }, { $regex: ... }).

const ID_RE = /^[A-Za-z0-9._-]{1,128}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isSafeId(v) {
  return typeof v === 'string' && ID_RE.test(v);
}
export function assertSafeId(v, label = 'id') {
  if (!isSafeId(v)) {
    const e = new Error(`Invalid ${label}`);
    e.status = 400;
    throw e;
  }
  return v;
}

export function isSafeSlug(v) {
  return typeof v === 'string' && v.length <= 80 && SLUG_RE.test(v);
}
export function assertSafeSlug(v, label = 'slug') {
  if (!isSafeSlug(v)) {
    const e = new Error(`Invalid ${label}`);
    e.status = 400;
    throw e;
  }
  return v;
}

export function isSafeEmail(v) {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v);
}
export function assertSafeEmail(v) {
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!isSafeEmail(s)) {
    const e = new Error('Valid email required');
    e.status = 400;
    throw e;
  }
  return s;
}

export function assertPlainString(v, label = 'value', { min = 0, max = 400 } = {}) {
  if (typeof v !== 'string') {
    const e = new Error(`Invalid ${label}`);
    e.status = 400;
    throw e;
  }
  const t = v.trim();
  if (t.length < min || t.length > max) {
    const e = new Error(`Invalid ${label}`);
    e.status = 400;
    throw e;
  }
  return t;
}

// Utility: safely coerce optional string field, returning null when missing/invalid rather than throwing.
export function optionalSafeString(v, max = 400) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}
