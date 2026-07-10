// Admin authentication endpoints — admin-auth login / logout.
import { NextResponse } from 'next/server';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { checkPassword, isAdminEmail, makeSessionToken, ADMIN_COOKIE } from '@/lib/admin-auth';
import { tooMany, diagnoseAuthEnv } from '../utils';

export async function handle(ctx) {
  const { method, seg, request, body } = ctx;

  // -------- POST /api/admin-auth --------
  if (method === 'POST' && seg === 'admin-auth') {
    try {
      const ip = ipFromRequest(request);
      const emailForLimit = String((body && body.email) || '').trim().toLowerCase().slice(0, 254);
      // 8 attempts per 10 min per (ip+email); 30 per 10 min per ip.
      const rl1 = rateLimit(`admin-auth:${ip}:${emailForLimit}`, { max: 8, windowMs: 10 * 60 * 1000 });
      if (!rl1.allowed) return tooMany(rl1.retryAfterMs);
      const rl2 = rateLimit(`admin-auth:${ip}`, { max: 30, windowMs: 10 * 60 * 1000 });
      if (!rl2.allowed) return tooMany(rl2.retryAfterMs);
      const { email, password } = body || {};
      if (!isAdminEmail(email)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      if (!checkPassword(password)) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      // makeSessionToken can throw in production if ADMIN_SESSION_SECRET is missing,
      // too short, or matches a placeholder pattern — catch and surface a diagnostic.
      const token = makeSessionToken(email);
      const res = NextResponse.json({ ok: true });
      res.cookies.set({ ...ADMIN_COOKIE.options, name: ADMIN_COOKIE.name, value: token });
      return res;
    } catch (e) {
      console.error('[admin-auth] Server misconfiguration:', e?.message || e);
      console.error('[admin-auth] Env check:', diagnoseAuthEnv());
      return NextResponse.json({
        error: 'Server is not configured. Contact the site owner.',
        hint: diagnoseAuthEnv(),
      }, { status: 503 });
    }
  }

  // -------- POST /api/admin-auth/logout --------
  if (method === 'POST' && seg === 'admin-auth/logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...ADMIN_COOKIE.options, name: ADMIN_COOKIE.name, value: '', maxAge: 0 });
    return res;
  }

  return null;
}
