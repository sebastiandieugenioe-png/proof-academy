// /go/[slug] — first-party redirect endpoint for tracking links.
//
// Flow:
//   1. Look up the tracking link by slug. Reject unknown or archived slugs.
//   2. Write attribution cookies (first/last touch) using the link's UTMs.
//   3. Write visitor / session / visit rows in Mongo (best effort; failure never blocks the redirect).
//   4. Increment the link's click counter atomically.
//   5. 302 redirect to the destination URL with UTMs appended.
//
// This route bypasses the /middleware.js matcher — we do all cookie work inline
// so a fresh visitor still gets the correct attribution rows even before their
// first page load.

import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeSlug, isSafeId } from '@/lib/validators';
import { ensureMigrationsRun } from '@/lib/migrations';
import {
  COOKIE_NAMES,
  hasConsent,
  ATTR_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
  attributionCookieOptions,
  encodeTouch,
  mintId,
} from '@/lib/attribution';
import { buildFullUrl } from '@/lib/api/handlers/tracking';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  ensureMigrationsRun();
  const { slug } = await params;

  // Slug validation — mirrors the reserved-slug check on the create endpoint.
  if (!isSafeSlug(slug)) {
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const db = await getDb();
  const link = await db.collection('tracking_links').findOne({ slug });
  if (!link || link.status !== 'active') {
    // Unknown or archived — send them home rather than a hard 404 so campaigns don't fail loud.
    return NextResponse.redirect(new URL('/', request.url), 302);
  }

  const destination = buildFullUrl(link, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL });
  let target;
  try { target = new URL(destination); } catch { target = null; }
  const res = target
    ? NextResponse.redirect(target, 302)
    : NextResponse.redirect(new URL('/', request.url), 302);

  // ---- Cookies (only with consent — see CONSENT_COOKIE in lib/attribution) --
  // Without consent the click is still counted below, but nothing is stored
  // on the visitor's device.
  const consent = hasConsent(request);
  const existingVid = request.cookies.get(COOKIE_NAMES.visitor)?.value;
  const vid = existingVid && isSafeId(existingVid) ? existingVid : mintId();
  if (consent) res.cookies.set(COOKIE_NAMES.visitor, vid, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));

  const existingSid = request.cookies.get(COOKIE_NAMES.session)?.value;
  const sid = existingSid && isSafeId(existingSid) ? existingSid : mintId();
  if (consent) res.cookies.set(COOKIE_NAMES.session, sid, attributionCookieOptions(SESSION_COOKIE_MAX_AGE));

  const touchObj = {
    source: link.utmSource || null,
    medium: link.utmMedium || null,
    campaign: link.utmCampaign || null,
    content: link.utmContent || null,
    term: link.utmTerm || null,
    ts: Math.floor(Date.now() / 1000),
    url: `/go/${link.slug}`,
  };
  const encoded = encodeTouch(touchObj);
  if (encoded && consent) {
    // First touch — write only if the cookie is missing.
    const hadFirst = !!request.cookies.get(COOKIE_NAMES.firstTouch)?.value;
    if (!hadFirst) {
      res.cookies.set(COOKIE_NAMES.firstTouch, encoded, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));
    }
    // Last touch — always overwrite.
    res.cookies.set(COOKIE_NAMES.lastTouch, encoded, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));
  }

  // ---- DB writes (best effort) -------------------------------------------
  const now = new Date();
  const referrer = request.headers.get('referer') || null;
  const userAgent = request.headers.get('user-agent') || null;
  const persistedTouch = {
    source: touchObj.source, medium: touchObj.medium, campaign: touchObj.campaign,
    content: touchObj.content, term: touchObj.term, ts: now, url: touchObj.url,
  };

  Promise.all([
    db.collection('tracking_visitors').updateOne(
      { id: vid },
      { $setOnInsert: { id: vid, firstSeenAt: now, firstTouch: persistedTouch }, $set: { lastSeenAt: now, lastTouch: persistedTouch } },
      { upsert: true }
    ),
    db.collection('tracking_sessions').updateOne(
      { id: sid },
      {
        $setOnInsert: {
          id: sid, visitorId: vid, startedAt: now,
          entryUrl: `/go/${link.slug}`, referrer, userAgent,
          utm: { source: touchObj.source, medium: touchObj.medium, campaign: touchObj.campaign, content: touchObj.content, term: touchObj.term },
        },
        $set: { lastActivityAt: now },
      },
      { upsert: true }
    ),
    db.collection('tracking_visits').insertOne({
      id: uuid(),
      visitorId: vid,
      sessionId: sid,
      userId: null,
      url: `/go/${link.slug}`,
      referrer,
      userAgent,
      linkId: link.id,
      linkSlug: link.slug,
      destinationUrl: destination,
      utm: { source: touchObj.source, medium: touchObj.medium, campaign: touchObj.campaign, content: touchObj.content, term: touchObj.term },
      createdAt: now,
    }),
    db.collection('tracking_links').updateOne(
      { id: link.id },
      { $inc: { clickCount: 1 }, $set: { lastClickAt: now } }
    ),
  ]).catch((e) => console.error('[go/slug] tracking write failed', e));

  return res;
}
