// OSC Journal subscription endpoint. Idempotent; sends welcome email on newly-active outcomes.
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeEmail } from '@/lib/validators';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { sendTransactionalEmail, templates as emailTemplates } from '@/lib/mailer';
import { tooMany, newUnsubToken } from '../utils';

// Behaviour is explicit. Every request resolves to ONE of four outcomes,
// logged with a stable prefix so we can grep production logs:
//   [journal] new_subscriber                — email seen for the first time
//   [journal] existing_user_newly_subscribed — has an OSC account, was not opted in
//   [journal] already_subscribed             — active subscription exists (no email sent)
//   [journal] email_skipped_resend_not_configured — Resend not set up (no email sent)
//   [journal] welcome_email_sent / welcome_email_failed
//
// Idempotent — safe to POST repeatedly. Never sends duplicate welcome emails.
// Blocks on the mailer so send failures surface in the response.
export async function handle(ctx) {
  const { method, seg, request, body } = ctx;
  if (!(method === 'POST' && seg === 'journal/subscribe')) return null;

  try {
    const ip = ipFromRequest(request);
    // 5 subs per 10 min per IP — prevents automated abuse.
    const rl = rateLimit(`journal:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);

    const raw = String(body?.email || '').trim().toLowerCase().slice(0, 254);
    if (!isSafeEmail(raw)) {
      return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });
    }

    const db = await getDb();
    const now = new Date();

    const [nlDoc, userDoc] = await Promise.all([
      db.collection('newsletter').findOne({ email: raw }),
      db.collection('users').findOne(
        { email: raw },
        { projection: { _id: 1, id: 1, email: 1, name: 1, newsletter: 1, newsletterWithdrawnAt: 1, newsletterConsentAt: 1, newsletterUnsubscribeToken: 1, journalOptIn: 1, journalOptInAt: 1 } }
      ),
    ]);

    const nlActive = !!(nlDoc && !nlDoc.withdrawnAt);
    const userActive = !!(userDoc && userDoc.newsletter && !userDoc.newsletterWithdrawnAt);
    const wasAlreadyActive = nlActive || userActive;

    let outcome;
    if (wasAlreadyActive) outcome = 'already_subscribed';
    else if (userDoc)     outcome = 'existing_user_newly_subscribed';
    else                  outcome = 'new_subscriber';

    const unsubscribeToken = nlDoc?.unsubscribeToken || userDoc?.newsletterUnsubscribeToken || newUnsubToken();

    // --- Upsert newsletter document (source of truth for anyone subscribed).
    await db.collection('newsletter').updateOne(
      { email: raw },
      {
        $set: {
          email: raw,
          source: nlDoc?.source || 'journal',
          consentAt: nlDoc?.consentAt || now,
          lastConsentAt: now,
          withdrawnAt: null,
          unsubscribeToken,
          userId: userDoc ? (userDoc.id || String(userDoc._id)) : (nlDoc?.userId || null),
          updatedAt: now,
        },
        $setOnInsert: { id: uuid(), createdAt: now },
      },
      { upsert: true }
    );

    // --- Sync the user document so /profile + /admin stay coherent with /newsletter.
    if (userDoc) {
      await db.collection('users').updateOne(
        { email: raw },
        {
          $set: {
            newsletter: true,
            newsletterConsentAt: userDoc.newsletterConsentAt || now,
            newsletterLastConsentAt: now,
            newsletterWithdrawnAt: null,
            newsletterUnsubscribeToken: unsubscribeToken,
            journalOptIn: true,
            journalOptInAt: userDoc.journalOptInAt || now,
            updatedAt: now,
          },
        }
      );
    }

    let emailSent = false;
    let emailSkipped = false;
    let emailError = null;

    if (outcome === 'new_subscriber' || outcome === 'existing_user_newly_subscribed') {
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const unsubUrl = `${base}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
      const result = await sendTransactionalEmail({
        to: raw,
        ...emailTemplates.journalWelcome({ unsubUrl }),
      });

      if (result?.skipped) {
        emailSkipped = true;
        console.warn(`[journal] email_skipped_resend_not_configured reason="${result.reason}" email=${raw} outcome=${outcome}`);
      } else if (result?.ok) {
        emailSent = true;
        console.log(`[journal] welcome_email_sent id=${result.id || 'n/a'} email=${raw} outcome=${outcome}`);
      } else {
        emailError = result?.message || 'Unknown mailer error';
        console.error(`[journal] welcome_email_failed status=${result?.status || 'n/a'} email=${raw} outcome=${outcome} message="${emailError}"`);
      }
    } else {
      console.log(`[journal] no_email_sent reason=already_subscribed email=${raw}`);
    }

    console.log(`[journal] subscription outcome=${outcome} email=${raw} emailSent=${emailSent} emailSkipped=${emailSkipped}${emailError ? ` emailError="${emailError}"` : ''}`);

    const message =
      outcome === 'already_subscribed'
        ? "You're already subscribed to the OSC Journal."
        : outcome === 'existing_user_newly_subscribed'
          ? 'Welcome to the Journal. Your subscription is now active.'
          : 'Welcome to the Journal. A confirmation email is on its way.';

    return NextResponse.json({
      ok: true,
      outcome,
      alreadySubscribed: outcome === 'already_subscribed',
      message,
      emailSent,
      emailSkipped,
      emailError,
    });
  } catch (e) {
    console.error('[journal/subscribe] unexpected error:', e);
    return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
  }
}
