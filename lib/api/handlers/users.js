// User self-service endpoints — GET /api/me, POST /api/me/update, POST /api/me/delete.
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isAdminEmail } from '@/lib/admin-auth';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import {
  json, err, tooMany,
  sanitizeUserOut, sanitizeProfileField, sanitizeRole, newUnsubToken,
} from '../utils';
import { requireUser, clearUserSession } from '../session';
import { eraseUserData } from '../erasure';

export async function handle(ctx) {
  const { method, seg, request, body } = ctx;

  // -------- GET /api/me --------
  if (method === 'GET' && seg === 'me') {
    const userId = requireUser(request);
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: userId });
    if (!user) return err('User not found', 404);
    const out = sanitizeUserOut(user);
    out.isAdmin = isAdminEmail(user.email);
    out.hasPassword = !!user.passwordHash;
    return json(out);
  }

  // -------- POST /api/me/update --------
  if (method === 'POST' && seg === 'me/update') {
    const userId = requireUser(request);
    const { name, newsletter, country, city, role } = body;
    const db = await getDb();
    const set = { updatedAt: new Date() };
    if (typeof name === 'string') set.name = name.trim().slice(0, 100);
    if (typeof country === 'string') set.country = sanitizeProfileField(country, 60);
    if (typeof city === 'string') set.city = sanitizeProfileField(city, 80);
    if (typeof role === 'string') set.role = sanitizeRole(role);
    // Newsletter consent: only touch consent metadata when the value ACTUALLY changes,
    // so unrelated profile updates don't move the audit timestamps.
    if (typeof newsletter === 'boolean') {
      const now = new Date();
      const current = await db.collection('users').findOne({ id: userId }, { projection: { newsletter: 1, email: 1, newsletterUnsubscribeToken: 1 } });
      set.newsletter = newsletter;
      if (current && current.newsletter !== newsletter) {
        if (newsletter) {
          const token = current.newsletterUnsubscribeToken || newUnsubToken();
          set.newsletterConsentAt = now;
          set.newsletterWithdrawnAt = null;
          set.newsletterUnsubscribeToken = token;
          set.newsletterSource = 'profile';
          if (current.email) {
            await db.collection('newsletter').updateOne(
              { email: current.email },
              { $set: {
                  email: current.email,
                  source: 'profile',
                  consentAt: now,
                  withdrawnAt: null,
                  unsubscribeToken: token,
                  userId,
                  updatedAt: now,
                },
                $setOnInsert: { id: uuid(), createdAt: now },
              },
              { upsert: true }
            );
          }
        } else {
          set.newsletterWithdrawnAt = now;
          if (current.email) {
            await db.collection('newsletter').updateOne(
              { email: current.email },
              { $set: { withdrawnAt: now, updatedAt: now } }
            );
          }
        }
      }
    }
    await db.collection('users').updateOne({ id: userId }, { $set: set });
    const user = await db.collection('users').findOne({ id: userId });
    return json({ user: sanitizeUserOut(user) });
  }

  // -------- POST /api/me/delete (GDPR Art. 17 self-service erasure) --------
  if (method === 'POST' && seg === 'me/delete') {
    const userId = requireUser(request);
    const ip = ipFromRequest(request);
    const rl = rateLimit(`medel:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);
    const confirmation = typeof body?.confirmation === 'string' ? body.confirmation.trim() : '';
    if (confirmation !== 'DELETE') {
      return err('Type DELETE in the confirmation field to confirm account deletion.', 400);
    }
    const db = await getDb();
    const exists = await db.collection('users').findOne({ id: userId }, { projection: { id: 1 } });
    if (!exists) return err('Account no longer exists', 404);
    await eraseUserData(db, userId, { method: 'self-service' });
    const res = json({ ok: true, deleted: true });
    clearUserSession(res);
    return res;
  }

  return null;
}
