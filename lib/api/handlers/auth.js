// Authentication endpoints — register, login, logout, email verification, password reset & change.
// Extracted from the previously-monolithic route.js. Behaviour is unchanged.
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/mongo';
import { isSafeEmail } from '@/lib/validators';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { sendTransactionalEmail, templates as emailTemplates } from '@/lib/mailer';
import { issueToken, verifyAndConsumeToken } from '@/lib/auth-tokens';
import { USER_COOKIE_CLEAR } from '@/lib/user-session';
import {
  json, err, tooMany,
  BCRYPT_ROUNDS,
  validatePassword,
  sanitizeUserOut,
  sanitizeProfileField,
  sanitizeRole,
  newUnsubToken,
} from '../utils';
import { attachUserSession, clearUserSession, requireUser } from '../session';

export async function handle(ctx) {
  const { method, seg, request, body } = ctx;

  // -------- POST /api/register --------
  if (method === 'POST' && seg === 'register') {
    const ip = ipFromRequest(request);
    const rl = rateLimit(`register:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password;
    const confirmPassword = body.confirmPassword;
    const name = (body.name || '').trim() || (isSafeEmail(email) ? email.split('@')[0] : '');
    const country = sanitizeProfileField(body.country, 60);
    const city = sanitizeProfileField(body.city, 80);
    const role = sanitizeRole(body.role);
    const newsletter = !!body.newsletter;

    if (!isSafeEmail(email)) return err('Valid email required');
    if (!country) return err('Country is required');
    if (!city) return err('City is required');
    if (!role) return err('Role is required');
    const pwErr = validatePassword(password);
    if (pwErr) return err(pwErr);
    if (password !== confirmPassword) return err('Passwords do not match');

    const db = await getDb();
    const existing = await db.collection('users').findOne({ email });
    // SEC-002: never let /register overwrite or claim an existing account, even a legacy one.
    if (existing) {
      return err('This email is already registered. Please log in or contact support.', 409);
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date();
    const unsubToken = newsletter ? newUnsubToken() : null;
    const user = {
      id: uuid(), email, name, provider: 'email',
      authMethod: 'password',
      // Email verification is gated by an env flag so we can toggle it
      // without touching the verification code path. During the public
      // beta we bypass it to reduce sign-up friction — every newly
      // created account is treated as already verified.
      // Set EMAIL_VERIFICATION_REQUIRED=true in the environment to re-enable.
      emailVerified: (process.env.EMAIL_VERIFICATION_REQUIRED === 'true') ? false : true,
      emailVerifiedAt: (process.env.EMAIL_VERIFICATION_REQUIRED === 'true') ? null : now,
      passwordHash,
      passwordLastChangedAt: now,
      newsletter,
      newsletterConsentAt: newsletter ? now : null,
      newsletterWithdrawnAt: null,
      newsletterUnsubscribeToken: unsubToken,
      newsletterSource: newsletter ? 'register' : null,
      newsletterSyncedAt: null,
      source: body.source || null,
      country, city, role,
      createdAt: now, updatedAt: now,
    };
    await db.collection('users').insertOne({ ...user });
    if (newsletter) {
      await db.collection('newsletter').updateOne(
        { email },
        { $set: {
            email,
            source: 'register',
            consentAt: now,
            withdrawnAt: null,
            unsubscribeToken: unsubToken,
            userId: user.id,
            updatedAt: now,
          },
          $setOnInsert: { id: uuid(), createdAt: now },
        },
        { upsert: true }
      );
    }

    if (process.env.EMAIL_VERIFICATION_REQUIRED === 'true') {
      const { token: verifyRawToken } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(verifyRawToken)}`;
      const mailRes = await sendTransactionalEmail({
        to: email,
        ...emailTemplates.verification({ name, url: verifyUrl }),
      });
      return json({
        ok: true,
        emailVerified: false,
        emailSent: !!mailRes?.ok,
        emailSkipped: !!mailRes?.skipped,
        user: sanitizeUserOut(user),
      });
    }

    // Beta path — auto-login. Session cookie set on the response.
    console.log(`[register] auto-login (email verification bypass on) email=${email}`);
    const res = json({
      ok: true,
      emailVerified: true,
      emailSent: false,
      emailSkipped: false,
      autoLogin: true,
      user: sanitizeUserOut(user),
    });
    attachUserSession(res, user.id);
    return res;
  }

  // -------- POST /api/auth/verify-email --------
  if (method === 'POST' && seg === 'auth/verify-email') {
    const ip = ipFromRequest(request);
    const rl = rateLimit(`verifyemail:${ip}`, { max: 30, windowMs: 15 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);
    const rawToken = typeof body.token === 'string' ? body.token : '';
    if (!rawToken) return err('Missing verification token', 400);
    const db = await getDb();
    const consumed = await verifyAndConsumeToken(db, { token: rawToken, purpose: 'verify_email' });
    if (!consumed) return err('This verification link is invalid or has expired. Please request a new one.', 400);
    const now = new Date();
    const upd = await db.collection('users').findOneAndUpdate(
      { id: consumed.userId },
      { $set: { emailVerified: true, emailVerifiedAt: now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    const user = upd?.value || upd;
    if (!user) return err('Account not found', 404);
    const res = json({ ok: true, user: sanitizeUserOut(user) });
    attachUserSession(res, user.id);
    return res;
  }

  // -------- POST /api/auth/resend-verification --------
  if (method === 'POST' && seg === 'auth/resend-verification') {
    const ip = ipFromRequest(request);
    const rlIp = rateLimit(`resendv:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!rlIp.allowed) return tooMany(rlIp.retryAfterMs);
    const email = (body.email || '').trim().toLowerCase();
    if (!isSafeEmail(email)) {
      return json({ ok: true }); // generic response even for malformed emails
    }
    const rlEmail = rateLimit(`resendv:e:${email}`, { max: 3, windowMs: 60 * 60 * 1000 });
    if (!rlEmail.allowed) return tooMany(rlEmail.retryAfterMs);
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (user && user.emailVerified === false && user.passwordHash) {
      const { token } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
      await sendTransactionalEmail({ to: email, ...emailTemplates.verification({ name: user.name, url }) });
    }
    return json({ ok: true });
  }

  // -------- POST /api/auth/forgot-password --------
  if (method === 'POST' && seg === 'auth/forgot-password') {
    const ip = ipFromRequest(request);
    const rlIp = rateLimit(`fp:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!rlIp.allowed) return tooMany(rlIp.retryAfterMs);
    const email = (body.email || '').trim().toLowerCase();
    if (!isSafeEmail(email)) return json({ ok: true });
    const rlEmail = rateLimit(`fp:e:${email}`, { max: 3, windowMs: 60 * 60 * 1000 });
    if (!rlEmail.allowed) return json({ ok: true });
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    if (user && user.passwordHash) {
      const { token } = await issueToken(db, { userId: user.id, purpose: 'password_reset' });
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
      await sendTransactionalEmail({ to: email, ...emailTemplates.passwordReset({ name: user.name, url }) });
    }
    return json({ ok: true });
  }

  // -------- POST /api/auth/reset-password --------
  if (method === 'POST' && seg === 'auth/reset-password') {
    const ip = ipFromRequest(request);
    const rl = rateLimit(`rp:${ip}`, { max: 10, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);
    const rawToken = typeof body.token === 'string' ? body.token : '';
    const password = body.password;
    const confirmPassword = body.confirmPassword;
    if (!rawToken) return err('Missing token', 400);
    const pwErr = validatePassword(password);
    if (pwErr) return err(pwErr);
    if (password !== confirmPassword) return err('Passwords do not match');
    const db = await getDb();
    const consumed = await verifyAndConsumeToken(db, { token: rawToken, purpose: 'password_reset' });
    if (!consumed) return err('This reset link is invalid or has expired. Please request a new one.', 400);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const now = new Date();
    const upd = await db.collection('users').findOneAndUpdate(
      { id: consumed.userId },
      { $set: { passwordHash, passwordLastChangedAt: now, emailVerified: true, emailVerifiedAt: (await db.collection('users').findOne({ id: consumed.userId }))?.emailVerifiedAt || now, updatedAt: now } },
      { returnDocument: 'after' }
    );
    const user = upd?.value || upd;
    if (user) {
      sendTransactionalEmail({ to: user.email, ...emailTemplates.passwordChanged({ name: user.name }) }).catch(() => {});
    }
    const res = json({ ok: true });
    clearUserSession(res); // force re-login
    return res;
  }

  // -------- POST /api/me/change-password --------
  if (method === 'POST' && seg === 'me/change-password') {
    const userId = requireUser(request);
    const ip = ipFromRequest(request);
    const rl = rateLimit(`cp:${ip}`, { max: 8, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);
    const currentPassword = body.currentPassword;
    const newPassword = body.newPassword;
    const confirmNewPassword = body.confirmNewPassword;
    if (typeof currentPassword !== 'string' || !currentPassword) return err('Current password is required');
    const pwErr = validatePassword(newPassword);
    if (pwErr) return err(pwErr);
    if (newPassword !== confirmNewPassword) return err('Passwords do not match');
    if (newPassword === currentPassword) return err('Your new password must be different from the current one.');
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: userId });
    if (!user || !user.passwordHash) return err('Account not found', 404);
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return err('Current password is incorrect.', 401);
    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    const now = new Date();
    await db.collection('users').updateOne({ id: userId }, { $set: { passwordHash, passwordLastChangedAt: now, updatedAt: now } });
    sendTransactionalEmail({ to: user.email, ...emailTemplates.passwordChanged({ name: user.name }) }).catch(() => {});
    const res = json({ ok: true, passwordLastChangedAt: now });
    attachUserSession(res, userId); // rotate current session
    return res;
  }

  // -------- POST /api/login --------
  if (method === 'POST' && seg === 'login') {
    const ip = ipFromRequest(request);
    const emailForLimit = String((body && body.email) || '').trim().toLowerCase().slice(0, 254);
    const rl1 = rateLimit(`login:${ip}:${emailForLimit}`, { max: 8, windowMs: 10 * 60 * 1000 });
    if (!rl1.allowed) return tooMany(rl1.retryAfterMs);
    const rl2 = rateLimit(`login:${ip}`, { max: 30, windowMs: 10 * 60 * 1000 });
    if (!rl2.allowed) return tooMany(rl2.retryAfterMs);

    const email = (body.email || '').trim().toLowerCase();
    const password = body.password;
    if (!isSafeEmail(email) || typeof password !== 'string' || !password) {
      return err('Invalid email or password', 401);
    }
    const db = await getDb();
    const user = await db.collection('users').findOne({ email });
    // SEC-002: legacy accounts without a password MUST NOT reveal their existence.
    if (!user || !user.passwordHash) return err('Invalid email or password', 401);
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return err('Invalid email or password', 401);
    // Block unverified accounts (registered AFTER we shipped email verification).
    if (user.emailVerified === false) {
      return NextResponse.json(
        { error: 'Please verify your email before logging in.', code: 'EMAIL_NOT_VERIFIED', email: user.email },
        { status: 403 }
      );
    }
    const res = json({ user: sanitizeUserOut(user) });
    attachUserSession(res, user.id);
    return res;
  }

  // -------- POST /api/set-password (disabled) --------
  if (method === 'POST' && seg === 'set-password') {
    return err('Legacy account claim is not available. Please contact support.', 410);
  }

  // -------- POST /api/auth (deprecated) --------
  if (method === 'POST' && seg === 'auth') {
    return err('This endpoint has been deprecated. Please use /api/register or /api/login.', 410);
  }

  if (method === 'POST' && seg === 'auth-legacy-disabled') {
    return err('Deprecated', 410);
  }

  // -------- POST /api/logout --------
  if (method === 'POST' && seg === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...USER_COOKIE_CLEAR.options, name: USER_COOKIE_CLEAR.name, value: '' });
    return res;
  }

  return null;
}
