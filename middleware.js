// Edge middleware: first-party attribution capture on every top-level page request.
//
// Responsibilities (all cookie-only, no DB access):
//   1. Ensure osc_vid (visitor id, 30d) and osc_sid (session id, 30min sliding) exist.
//   2. If the incoming URL carries UTM parameters, encode them into the FIRST-touch
//      cookie (only if not yet set) and always into the LAST-touch cookie.
//
// Intentionally excluded from the matcher:
//   - /api/**        — handled per-route (e.g. /api/tracking/ingest)
//   - /_next/**      — static/build assets
//   - /go/[slug]     — handled by the redirect route itself so it can override UTMs
//                       from the tracking link before writing to DB
//   - static assets  — icons/manifest/robots/sitemap
//
// Runs on the Edge runtime by default (v13+). No DB writes here — the
// /api/tracking/ingest beacon (POSTed from AttributionTracker on the client)
// materialises visitor/session/visit rows.

import { NextResponse } from 'next/server';
import {
  COOKIE_NAMES,
  ATTR_COOKIE_MAX_AGE,
  SESSION_COOKIE_MAX_AGE,
  attributionCookieOptions,
  readUtmsFromSearchParams,
  encodeTouch,
  mintId,
} from '@/lib/attribution';

export function middleware(request) {
  const url = request.nextUrl;
  const res = NextResponse.next();

  // ---- visitor id (30d) ---------------------------------------------------
  let vid = request.cookies.get(COOKIE_NAMES.visitor)?.value;
  if (!vid) {
    vid = mintId();
    res.cookies.set(COOKIE_NAMES.visitor, vid, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));
  }

  // ---- session id (30min sliding) ----------------------------------------
  const existingSid = request.cookies.get(COOKIE_NAMES.session)?.value;
  const sid = existingSid || mintId();
  // Refresh cookie on every request — acts as a sliding window.
  res.cookies.set(COOKIE_NAMES.session, sid, attributionCookieOptions(SESSION_COOKIE_MAX_AGE));

  // ---- attribution capture ------------------------------------------------
  const utm = readUtmsFromSearchParams(url.searchParams);
  if (utm) {
    const touch = {
      ...utm,
      ts: Math.floor(Date.now() / 1000),
      url: url.pathname,
    };
    const encoded = encodeTouch(touch);
    if (encoded) {
      // First touch — write only if the cookie is missing.
      const hadFirst = !!request.cookies.get(COOKIE_NAMES.firstTouch)?.value;
      if (!hadFirst) {
        res.cookies.set(COOKIE_NAMES.firstTouch, encoded, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));
      }
      // Last touch — always overwrite.
      res.cookies.set(COOKIE_NAMES.lastTouch, encoded, attributionCookieOptions(ATTR_COOKIE_MAX_AGE));
    }
  }

  return res;
}

export const config = {
  // Skip static assets, api routes, and the /go redirect (which does its own cookie work).
  matcher: [
    '/((?!api/|_next/|go/|icons/|assets/|images/|favicon.ico|placeholder-lesson.svg|manifest.json|sw.js|robots.txt|sitemap.xml).*)',
  ],
};
