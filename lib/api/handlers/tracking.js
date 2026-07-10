// Tracking-links API surface.
//
//   Public:
//     POST  /api/tracking/ingest           - Beacon from AttributionTracker.js. Writes
//                                             visitor/session/visit rows in Mongo. Rate limited.
//
//   Admin:
//     GET    /api/admin/tracking-links               - list (all or filtered by status)
//     GET    /api/admin/tracking-links/:id           - detail
//     POST   /api/admin/tracking-links               - create
//     PATCH  /api/admin/tracking-links/:id           - update
//     DELETE /api/admin/tracking-links/:id           - hard delete (rarely used; prefer archive)
//     POST   /api/admin/tracking-links/:id/duplicate - clone into a fresh draft
//     POST   /api/admin/tracking-links/:id/archive   - set status ('archived' | 'active')
//
// Every admin endpoint is protected by requireAdmin(). Slugs are validated against SLUG_RE
// and against a small reserved-slug set (so /go/admin doesn't fight the admin panel).
import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeId } from '@/lib/validators';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { getUserIdFromRequest } from '@/lib/user-session';
import { json, err, tooMany, SLUG_RE } from '../utils';
import { requireAdmin } from '../admin-guard';
import {
  COOKIE_NAMES,
  UTM_KEYS,
  sanitizeUtmValue,
  sanitizePath,
  decodeTouch,
} from '@/lib/attribution';

// Slugs owned by /go/... must not clash with important root paths. Kept minimal;
// the admin can also just avoid these when picking a short slug.
const RESERVED_LINK_SLUGS = new Set([
  'admin', 'api', 'learn', 'go', 'about', 'contact', 'privacy', 'terms',
  'unsubscribe', 'journal', 'p', 'brand',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico',
]);

// Small helper — optional string sanitiser used across the tracking-link CRUD.
function optionalString(v, max = 200) {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

function validateDestinationUrl(v) {
  if (typeof v !== 'string' || !v.trim()) return { ok: false, error: 'Destination URL is required.' };
  const t = v.trim();
  if (t.length > 2000) return { ok: false, error: 'Destination URL is too long.' };
  // Accept only http(s) OR a site-relative path starting with '/'.
  if (t.startsWith('/')) return { ok: true, value: t };
  try {
    const u = new URL(t);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, error: 'Destination URL must use http:// or https://' };
    }
    return { ok: true, value: t };
  } catch { return { ok: false, error: 'Destination URL is not a valid URL.' }; }
}

function sanitizeTrackingLink(body, { forCreate }) {
  const name = optionalString(body?.name, 200);
  const dest = validateDestinationUrl(body?.destinationUrl);
  if (forCreate) {
    if (!name) return { error: 'Internal name is required.' };
  }
  if (!dest.ok) return { error: dest.error };

  const utmSource = sanitizeUtmValue(body?.utmSource);
  const utmMedium = sanitizeUtmValue(body?.utmMedium);
  const utmCampaign = sanitizeUtmValue(body?.utmCampaign);
  const utmContent = sanitizeUtmValue(body?.utmContent);
  const utmTerm = sanitizeUtmValue(body?.utmTerm);
  if (forCreate) {
    if (!utmSource || !utmMedium || !utmCampaign) {
      return { error: 'UTM Source, Medium and Campaign are required.' };
    }
  }

  const status = body?.status === 'archived' ? 'archived' : 'active';
  return { ok: true, patch: { name, destinationUrl: dest.value, utmSource, utmMedium, utmCampaign, utmContent, utmTerm, status } };
}

async function validateSlug(db, rawSlug, { excludeId } = {}) {
  if (typeof rawSlug !== 'string') return { error: 'Short slug is required.' };
  const slug = rawSlug.trim().toLowerCase();
  if (!slug) return { error: 'Short slug is required.' };
  if (slug.length > 60) return { error: 'Short slug must be 60 characters or fewer.' };
  if (!SLUG_RE.test(slug)) return { error: 'Short slug can only use lowercase letters, numbers, and dashes.' };
  if (RESERVED_LINK_SLUGS.has(slug)) return { error: `"${slug}" is a reserved slug.` };
  const clash = await db.collection('tracking_links').findOne({ slug, ...(excludeId ? { id: { $ne: excludeId } } : {}) });
  if (clash) return { error: 'Another tracking link already uses that slug.' };
  return { slug };
}

// Build the full destination URL (with UTMs appended) that /go/:slug 302-redirects to.
// Exported so the /go route can share the same logic.
export function buildFullUrl(link, { baseUrl } = {}) {
  const base = link.destinationUrl.startsWith('/')
    ? `${(baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')}${link.destinationUrl}`
    : link.destinationUrl;
  let u;
  try { u = new URL(base); } catch { return base; }
  // Only overwrite UTMs that this link defines. Preserve any other query string the destination has.
  if (link.utmSource)   u.searchParams.set('utm_source',   link.utmSource);
  if (link.utmMedium)   u.searchParams.set('utm_medium',   link.utmMedium);
  if (link.utmCampaign) u.searchParams.set('utm_campaign', link.utmCampaign);
  if (link.utmContent)  u.searchParams.set('utm_content',  link.utmContent);
  if (link.utmTerm)     u.searchParams.set('utm_term',     link.utmTerm);
  return u.toString();
}

function publicLink(row, { baseUrl } = {}) {
  const short = `${(baseUrl || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '')}/go/${row.slug}`;
  return {
    id: row.id,
    name: row.name,
    destinationUrl: row.destinationUrl,
    utmSource: row.utmSource,
    utmMedium: row.utmMedium,
    utmCampaign: row.utmCampaign,
    utmContent: row.utmContent || null,
    utmTerm: row.utmTerm || null,
    slug: row.slug,
    status: row.status,
    clickCount: row.clickCount || 0,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt || null,
    fullUrl: buildFullUrl(row, { baseUrl }),
    shortUrl: short,
  };
}

// Convert a decodeTouch() payload into the record shape used on tracking_visitors.firstTouch / lastTouch.
function touchFromCookie(v) {
  if (!v) return null;
  const decoded = decodeTouch(v);
  if (!decoded) return null;
  const src = { source: decoded.source, medium: decoded.medium, campaign: decoded.campaign, content: decoded.content, term: decoded.term, url: decoded.url };
  return { ...src, ts: decoded.ts ? new Date(decoded.ts * 1000) : new Date() };
}

export async function handle(ctx) {
  const { method, seg, path, request, body } = ctx;

  // -------- POST /api/tracking/ingest (public beacon) -------------
  if (method === 'POST' && seg === 'tracking/ingest') {
    const ip = ipFromRequest(request);
    // Generous — typical SPA fires a few beacons per session on navigation.
    const rl = rateLimit(`ingest:${ip}`, { max: 60, windowMs: 60 * 1000 });
    if (!rl.allowed) return tooMany(rl.retryAfterMs);

    const vid = request.cookies.get(COOKIE_NAMES.visitor)?.value;
    const sid = request.cookies.get(COOKIE_NAMES.session)?.value;
    // If middleware didn't run (e.g. static export edge case), we still write the
    // beacon but without visitor/session correlation. Better than losing the event.
    if (!vid || !sid || !isSafeId(vid) || !isSafeId(sid)) {
      return NextResponse.json({ ok: true, skipped: 'no-cookies' });
    }

    const firstCookie = request.cookies.get(COOKIE_NAMES.firstTouch)?.value;
    const lastCookie = request.cookies.get(COOKIE_NAMES.lastTouch)?.value;
    const firstTouch = touchFromCookie(firstCookie);
    const lastTouch = touchFromCookie(lastCookie);

    const url = sanitizePath(body?.url);
    const referrer = optionalString(body?.referrer, 500);
    const userAgent = optionalString(request.headers.get('user-agent') || '', 500);
    const now = new Date();

    // Auth-optional — if the user is signed in we can link the visitor doc to them.
    let userId = null;
    try { const uid = await getUserIdFromRequest(request); if (uid && isSafeId(uid)) userId = uid; } catch { /* anonymous */ }

    const db = await getDb();

    // -- visitor doc --
    const setOnInsert = {
      id: vid,
      firstSeenAt: now,
      firstTouch: firstTouch || null,
    };
    const setAlways = { lastSeenAt: now };
    if (lastTouch) setAlways.lastTouch = lastTouch;
    if (userId) setAlways.userId = userId;
    await db.collection('tracking_visitors').updateOne(
      { id: vid },
      { $setOnInsert: setOnInsert, $set: setAlways },
      { upsert: true }
    );

    // -- session doc --
    const sessSetOnInsert = {
      id: sid,
      visitorId: vid,
      startedAt: now,
      entryUrl: url,
      referrer,
      userAgent,
      utm: lastTouch
        ? { source: lastTouch.source, medium: lastTouch.medium, campaign: lastTouch.campaign, content: lastTouch.content, term: lastTouch.term }
        : null,
    };
    await db.collection('tracking_sessions').updateOne(
      { id: sid },
      { $setOnInsert: sessSetOnInsert, $set: { lastActivityAt: now, ...(userId ? { userId } : {}) } },
      { upsert: true }
    );

    // -- visit doc (one per beacon call) --
    await db.collection('tracking_visits').insertOne({
      id: uuid(),
      visitorId: vid,
      sessionId: sid,
      userId,
      url,
      referrer,
      userAgent,
      linkId: null,
      linkSlug: null,
      utm: lastTouch
        ? { source: lastTouch.source, medium: lastTouch.medium, campaign: lastTouch.campaign, content: lastTouch.content, term: lastTouch.term }
        : null,
      createdAt: now,
    });

    return NextResponse.json({ ok: true });
  }

  // -------- Admin -----------------------------------------------------
  if (path[0] !== 'admin' || path[1] !== 'tracking-links') return null;

  const g = requireAdmin(request); if (g.response) return g.response;
  const admin = g.session;

  // GET /api/admin/tracking-links  (or ?status=...)
  if (method === 'GET' && !path[2]) {
    const db = await getDb();
    const status = ctx.url.searchParams.get('status');
    const filter = status && ['active', 'archived'].includes(status) ? { status } : {};
    const rows = await db.collection('tracking_links').find(filter).sort({ createdAt: -1 }).limit(1000).toArray();
    return json({ links: rows.map((r) => publicLink(r, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL })) });
  }

  // GET /api/admin/tracking-links/:id
  if (method === 'GET' && path[2] && !path[3]) {
    if (!isSafeId(path[2])) return err('Invalid tracking link id', 400);
    const db = await getDb();
    const row = await db.collection('tracking_links').findOne({ id: path[2] });
    if (!row) return err('Tracking link not found', 404);
    // Bring the click history for the detail view (last 50 clicks).
    const clicks = await db.collection('tracking_visits')
      .find({ linkId: row.id })
      .sort({ createdAt: -1 }).limit(50).toArray();
    return json({
      link: publicLink(row, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL }),
      recentClicks: clicks.map((c) => ({ ...c, _id: undefined })),
    });
  }

  // POST /api/admin/tracking-links
  if (method === 'POST' && !path[2]) {
    const parsed = sanitizeTrackingLink(body, { forCreate: true });
    if (parsed.error) return err(parsed.error, 400);
    const db = await getDb();
    const slugCheck = await validateSlug(db, body?.slug);
    if (slugCheck.error) return err(slugCheck.error, 400);
    const now = new Date();
    const doc = {
      id: uuid(),
      ...parsed.patch,
      slug: slugCheck.slug,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: admin.email,
    };
    await db.collection('tracking_links').insertOne({ ...doc });
    return json({ ok: true, link: publicLink(doc, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL }) });
  }

  // POST /api/admin/tracking-links/:id/duplicate
  if (method === 'POST' && path[2] && path[3] === 'duplicate') {
    if (!isSafeId(path[2])) return err('Invalid tracking link id', 400);
    const db = await getDb();
    const src = await db.collection('tracking_links').findOne({ id: path[2] });
    if (!src) return err('Tracking link not found', 404);
    // Auto-suffix slug until unique.
    let base = `${src.slug}-copy`.slice(0, 55);
    let candidate = base; let n = 1;
    // eslint-disable-next-line no-await-in-loop
    while (await db.collection('tracking_links').findOne({ slug: candidate })) {
      n += 1;
      candidate = `${base}-${n}`;
      if (n > 50) return err('Could not generate a unique slug for the duplicate.', 400);
    }
    const now = new Date();
    const doc = {
      id: uuid(),
      name: `${src.name} (copy)`,
      destinationUrl: src.destinationUrl,
      utmSource: src.utmSource, utmMedium: src.utmMedium, utmCampaign: src.utmCampaign,
      utmContent: src.utmContent || null, utmTerm: src.utmTerm || null,
      slug: candidate,
      status: 'active',
      clickCount: 0,
      createdAt: now, updatedAt: now,
      createdBy: admin.email,
    };
    await db.collection('tracking_links').insertOne({ ...doc });
    return json({ ok: true, link: publicLink(doc, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL }) });
  }

  // POST /api/admin/tracking-links/:id/archive
  if (method === 'POST' && path[2] && path[3] === 'archive') {
    if (!isSafeId(path[2])) return err('Invalid tracking link id', 400);
    const nextStatus = body?.status === 'active' ? 'active' : 'archived';
    const db = await getDb();
    const r = await db.collection('tracking_links').findOneAndUpdate(
      { id: path[2] },
      { $set: { status: nextStatus, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );
    const row = r?.value || r;
    if (!row) return err('Tracking link not found', 404);
    return json({ ok: true, link: publicLink(row, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL }) });
  }

  // PATCH /api/admin/tracking-links/:id
  if (method === 'PATCH' && path[2] && !path[3]) {
    if (!isSafeId(path[2])) return err('Invalid tracking link id', 400);
    const db = await getDb();
    const existing = await db.collection('tracking_links').findOne({ id: path[2] });
    if (!existing) return err('Tracking link not found', 404);
    const parsed = sanitizeTrackingLink({ ...existing, ...body }, { forCreate: false });
    if (parsed.error) return err(parsed.error, 400);
    const patch = { ...parsed.patch, updatedAt: new Date() };
    if (typeof body?.slug === 'string' && body.slug.trim().toLowerCase() !== existing.slug) {
      const slugCheck = await validateSlug(db, body.slug, { excludeId: existing.id });
      if (slugCheck.error) return err(slugCheck.error, 400);
      patch.slug = slugCheck.slug;
    }
    await db.collection('tracking_links').updateOne({ id: existing.id }, { $set: patch });
    const updated = await db.collection('tracking_links').findOne({ id: existing.id });
    return json({ ok: true, link: publicLink(updated, { baseUrl: process.env.NEXT_PUBLIC_BASE_URL }) });
  }

  // DELETE /api/admin/tracking-links/:id
  if (method === 'DELETE' && path[2] && !path[3]) {
    if (!isSafeId(path[2])) return err('Invalid tracking link id', 400);
    const db = await getDb();
    // We keep the historical tracking_visits rows (linkId reference stays) but drop the link itself.
    const res = await db.collection('tracking_links').deleteOne({ id: path[2] });
    return json({ ok: res.deletedCount > 0 });
  }

  return null;
}

// Static export so utils don't need to re-import UTM_KEYS from here.
export { UTM_KEYS };
