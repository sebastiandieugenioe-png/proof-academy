// Newsletter signup + unsubscribe (public + token-based).
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeEmail } from '@/lib/validators';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { json, err, tooMany, newUnsubToken } from '../utils';

export async function handle(ctx) {
  const { method, seg, request, body } = ctx;

  // -------- GET /api/newsletter/unsubscribe?token=... --------
  // Public: look up a newsletter subscription by unsubscribe token so the
  // /unsubscribe page can display the (partially-masked) email being unsubscribed
  // BEFORE the user clicks confirm. Returns 404 if the token doesn't match.
  if (method === 'GET' && seg === 'newsletter/unsubscribe') {
    const token = (request.nextUrl?.searchParams?.get('token') || '').trim().slice(0, 200);
    if (!token) return err('Missing token', 400);
    const db = await getDb();
    const [u, sub] = await Promise.all([
      db.collection('users').findOne({ newsletterUnsubscribeToken: token }, { projection: { email: 1, newsletter: 1, newsletterWithdrawnAt: 1 } }),
      db.collection('newsletter').findOne({ unsubscribeToken: token }, { projection: { email: 1, withdrawnAt: 1 } }),
    ]);
    const email = u?.email || sub?.email;
    if (!email) return err('Invalid or expired token', 404);
    // Mask the local part for privacy: a**@example.com
    const [local, domain] = email.split('@');
    const maskedEmail = local && domain
      ? `${local[0]}${'*'.repeat(Math.max(1, local.length - 1))}@${domain}`
      : email;
    const alreadyOff = u ? (!u.newsletter || !!u.newsletterWithdrawnAt) : !!sub?.withdrawnAt;
    return json({ ok: true, maskedEmail, alreadyUnsubscribed: alreadyOff });
  }

  // -------- POST /api/newsletter (signup) --------
  if (method === 'POST' && seg === 'newsletter') {
    const email = (body.email || '').trim().toLowerCase();
    if (!email.includes('@')) return err('Valid email required');
    const db = await getDb();
    const now = new Date();
    const token = newUnsubToken();
    await db.collection('newsletter').updateOne(
      { email },
      {
        $set: {
          email,
          source: body.source || 'landing',
          consentAt: now,
          withdrawnAt: null,
          updatedAt: now,
        },
        $setOnInsert: { id: uuid(), createdAt: now, unsubscribeToken: token },
      },
      { upsert: true }
    );
    return json({ ok: true });
  }

  // -------- POST /api/newsletter/unsubscribe --------
  // Public: one-click newsletter unsubscribe. Works without login.
  // Accepts either a signed-in user's session OR a token OR (as a last resort)
  // an email that we can match to a subscriber. Idempotent — always returns ok.
  if (method === 'POST' && seg === 'newsletter/unsubscribe') {
    const ip = ipFromRequest(request);
    const rl = rateLimit(`nlunsub:${ip}`, { max: 20, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);

    const rawToken = typeof body.token === 'string' ? body.token.trim().slice(0, 200) : '';
    const rawEmail = (body.email || '').trim().toLowerCase();
    const db = await getDb();
    const now = new Date();

    // Prefer token — proves the request came from an actual unsubscribe link.
    let userDoc = null;
    let subDoc = null;
    if (rawToken) {
      userDoc = await db.collection('users').findOne({ newsletterUnsubscribeToken: rawToken });
      subDoc = await db.collection('newsletter').findOne({ unsubscribeToken: rawToken });
    }
    if (!userDoc && !subDoc && rawEmail && isSafeEmail(rawEmail)) {
      userDoc = await db.collection('users').findOne({ email: rawEmail });
      subDoc = await db.collection('newsletter').findOne({ email: rawEmail });
    }

    // Idempotent — don't leak whether a match was found. Always 200.
    const matchedEmail = userDoc?.email || subDoc?.email || null;
    if (matchedEmail) {
      await db.collection('users').updateOne(
        { email: matchedEmail },
        { $set: { newsletter: false, newsletterWithdrawnAt: now, updatedAt: now } }
      );
      await db.collection('newsletter').updateOne(
        { email: matchedEmail },
        { $set: { withdrawnAt: now, updatedAt: now } }
      );
    }
    return json({ ok: true, email: matchedEmail });
  }

  return null;
}
