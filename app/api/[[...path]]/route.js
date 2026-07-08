import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { COURSES, getCourse, getLesson } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { getMedia } from '@/lib/media';
import { schedule } from '@/lib/sm2';
import { checkPassword, isAdminEmail, makeSessionToken, getAdminSessionFromRequest, ADMIN_COOKIE } from '@/lib/admin-auth';
import { uploadImage, uploadImageFromUrl, fetchImageBuffer, deleteImage, MAX_UPLOAD_BYTES, ALLOWED_MIME } from '@/lib/image-storage';
import { sanitizeContentHtml, htmlToPlainText } from '@/lib/sanitize';
import { getLegalPages } from '@/lib/legal-pages';
import { sendTransactionalEmail, templates as emailTemplates, mailerStatus } from '@/lib/mailer';
import { issueToken, verifyAndConsumeToken, hashToken } from '@/lib/auth-tokens';
import { getUserIdFromRequest, makeUserSessionToken, USER_COOKIE, USER_COOKIE_CLEAR } from '@/lib/user-session';
import { isSafeId, assertSafeId, isSafeSlug, assertSafeSlug, isSafeEmail, assertSafeEmail } from '@/lib/validators';
import { rateLimit, ipFromRequest, rateLimitResponse } from '@/lib/rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Generate a URL-safe random token for one-click newsletter unsubscribe links.
// 32 bytes = 43 chars base64url — plenty of entropy, no PII, safe in mailto links.
function newUnsubToken() {
  return crypto.randomBytes(32).toString('base64url');
}

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD = 8;

function validatePassword(pw) {
  if (typeof pw !== 'string' || pw.length < MIN_PASSWORD) return `Password must be at least ${MIN_PASSWORD} characters.`;
  if (pw.length > 200) return 'Password is too long.';
  return null;
}

function sanitizeUserOut(u) {
  if (!u) return u;
  const c = { ...u };
  delete c._id;
  delete c.passwordHash;
  return c;
}

// Require an authenticated regular-user session for the request. Returns userId string or throws.
function requireUser(request) {
  const userId = getUserIdFromRequest(request);
  if (!userId || !isSafeId(userId)) {
    const e = new Error('Not authenticated');
    e.status = 401;
    throw e;
  }
  return userId;
}

// Attach the user session cookie to a NextResponse.
function attachUserSession(res, userId) {
  const token = makeUserSessionToken(userId);
  res.cookies.set({ ...USER_COOKIE.options, name: USER_COOKIE.name, value: token });
  return res;
}

// Clear the user session cookie on a NextResponse (used after self-service account deletion).
function clearUserSession(res) {
  res.cookies.set({ ...USER_COOKIE.options, name: USER_COOKIE.name, value: '', maxAge: 0 });
  return res;
}

// Shared user-erasure routine used by both admin-delete and self-service delete.
// Cascades to all personal-data collections and writes an anonymised audit doc so
// the admin overview can show total-deleted-accounts WITHOUT retaining PII.
//   - Deletion timestamp is stored.
//   - `userHash` is a one-way SHA-256 of the user id salted with USER_SESSION_SECRET —
//     useful only for de-duplication, never reversible to the original id/email.
//   - Method: 'self-service' | 'admin' | 'unsubscribe-cascade'.
async function eraseUserData(db, userId, { method = 'self-service', actorEmail = null } = {}) {
  const salt = process.env.USER_SESSION_SECRET || 'osc-fallback-salt';
  const userHash = crypto.createHash('sha256').update(`${salt}:${userId}`).digest('hex');
  const now = new Date();
  // Also strip the newsletter subscription email — we replace it with the hash so
  // the audit trail keeps its shape without retaining any personal data.
  const user = await db.collection('users').findOne({ id: userId }, { projection: { email: 1 } });
  const email = user?.email || null;
  await Promise.all([
    db.collection('users').deleteOne({ id: userId }),
    db.collection('progress').deleteMany({ userId }),
    db.collection('reviews').deleteMany({ userId }),
    db.collection('comments').deleteMany({ userId }),
  ]);
  if (email) {
    // Newsletter audit doc: anonymise (drop token + email → hash) but keep the
    // consentAt/withdrawnAt row for legal accountability.
    await db.collection('newsletter').updateMany(
      { email },
      {
        $set: { email: `deleted:${userHash.slice(0, 16)}`, withdrawnAt: now, deletedAt: now, unsubscribeToken: null, source: 'account-deleted', updatedAt: now },
        $unset: { userId: '' },
      }
    );
  }
  await db.collection('deletions_audit').insertOne({
    id: uuid(),
    userHash,
    method,
    actorEmail: method === 'admin' ? (actorEmail || null) : null,
    deletedAt: now,
  });
  return { ok: true, userHash };
}

// 429 response helper
function tooMany(retryAfterMs) {
  const r = rateLimitResponse(retryAfterMs);
  return NextResponse.json(r.body, { status: r.status, headers: r.headers });
}

// Diagnose which env var is likely misconfigured, WITHOUT leaking values.
// Returned as a machine-readable object so the ops person can see it in platform logs
// AND in the response body of a 503 (safe — no secret content is exposed).
function diagnoseAuthEnv() {
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

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

// Slug rules for pages/courses: lowercase, alphanumeric + dashes, 1-80 chars.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// Reserved slugs (cannot be used for public pages or renamed courses).
const RESERVED_SLUGS = new Set([
  'admin', 'api', 'learn', 'about', 'privacy', 'terms', 'contact', 'newsletter', 'journal', 'p',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images',
]);
// Reserved slugs specifically for PUBLIC PAGES (pages tab) — courses live under /learn/*,
// so course slugs can be more flexible. But pages sit at site root, so we forbid clashes with the SPA.
const RESERVED_PAGE_SLUGS = new Set([
  'admin', 'api', 'learn', 'p', 'unsubscribe', 'journal',
  'verify-email', 'forgot-password', 'reset-password',
  'brand',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images',
]);

// GDPR audience profiling — role options and sanitization helpers
const ROLE_OPTIONS = new Set(['Bartender','Barback','Waiter/Server','Hospitality student','Cocktail enthusiast','Spirits enthusiast','Beer enthusiast','Wine enthusiast','Bar manager','Other']);

function sanitizeProfileField(v, max = 80) {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t || null;
}

function sanitizeRole(v) {
  const t = sanitizeProfileField(v, 40);
  if (!t) return null;
  return ROLE_OPTIONS.has(t) ? t : 'Other';
}

async function resolveCourseSlugAlias(slug) {
  try {
    const db = await getDb();
    const a = await db.collection('course_slug_aliases').findOne({ from: slug });
    return a?.to || null;
  } catch { return null; }
}

// Merge sources of truth for courses:
//   1) Static content in /lib/content.js (bundled)
//   2) Static AI content in /lib/ai-content.js (bundled, ships with the deploy)
//   3) DB "courses_published" (admin-edited overrides, per-environment)
// Later sources override earlier ones on the same slug.
async function loadPublishedCourses() {
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({}).toArray();
    return pubs.map((p) => ({ ...p, _id: undefined }));
  } catch { return []; }
}
async function allCoursesMerged() {
  const map = new Map();
  for (const c of COURSES) map.set(c.slug, c);
  for (const c of AI_COURSES) map.set(c.slug, c);
  const pub = await loadPublishedCourses();
  for (const p of pub) {
    if (p.hidden) { map.delete(p.slug); continue; }
    map.set(p.slug, p);
  }
  return Array.from(map.values());
}
// Strip "Beginner" suffix from public-facing course titles (level is still "Beginner" for filtering/admin).
function publicCourseTitle(course) {
  if (!course?.title) return course?.title;
  // Only strip when there's a trailing " Beginner" (case-insensitive) — e.g. "Whiskey Beginner" -> "Whiskey"
  return course.title.replace(/\s+Beginner\s*$/i, '').trim();
}

async function findCourseMerged(slug) {
  // Try DB override first — that's where admin edits live.
  const staticC = getCourse(slug);
  const aiC = AI_COURSES.find((c) => c.slug === slug);
  const canonical = staticC || aiC || null;
  try {
    const db = await getDb();
    const p = await db.collection('courses_published').findOne({ slug });
    if (p && !p.hidden) {
      delete p._id;
      // Rehydrate: any lesson field missing on the DB record falls back to canonical source.
      // Prevents crashes when admin-override accidentally stored a lesson without theory/flashcards/etc.
      if (canonical?.lessons) {
        p.lessons = (p.lessons || []).map((l) => {
          const src = canonical.lessons.find((c) => c.slug === l.slug);
          return src ? { ...src, ...l } : l;
        });
      }
      return p;
    }
    if (p?.hidden) return null; // explicitly hidden
  } catch (e) { console.error('findCourseMerged DB error', e); }
  if (canonical) return canonical;
  // Try slug alias — old slug renamed to a new one.
  const target = await resolveCourseSlugAlias(slug);
  if (target && target !== slug) {
    const c = await findCourseMerged(target);
    if (c) return c;
  }
  return null;
}

// Merge an incoming lesson patch with the canonical source, filling any missing fields.
// Never drops fields on save.
function hydrateLesson(courseSlug, lessonPatch) {
  if (!lessonPatch?.slug) return lessonPatch;
  const staticC = getCourse(courseSlug);
  const aiC = AI_COURSES.find((c) => c.slug === courseSlug);
  const src = (staticC?.lessons || aiC?.lessons || []).find((l) => l.slug === lessonPatch.slug);
  if (!src) return lessonPatch;
  // Deep-ish merge: incoming values win, but preserve arrays/objects that admin didn't touch.
  return { ...src, ...lessonPatch };
}
async function findLessonMerged(courseSlug, lessonSlug) {
  // DB override wins over static bundled content (so admin edits are honored).
  const c = await findCourseMerged(courseSlug);
  if (!c) return null;
  const idx = c.lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return null;
  const lesson = c.lessons[idx];
  const next = c.lessons[idx + 1] || null;
  const prev = c.lessons[idx - 1] || null;
  return { course: { slug: c.slug, title: publicCourseTitle(c), rawTitle: c.title, level: c.level, accent: c.accent }, lesson, next, prev, index: idx, total: c.lessons.length };
}

export async function GET(request, { params }) {
  const { path = [] } = await params;
  const url = new URL(request.url);
  const seg = path.join('/');

  // Guard: all /api/admin/** requires a valid signed admin cookie
  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return err('Admin authentication required', 401);
  }

  try {
    // Public
    if (seg === '' || seg === 'health') return json({ ok: true, service: 'online-spirits-club' });

    if (seg === 'courses') {
      const merged = await allCoursesMerged();
      return json(merged.map(({ slug, title, tagline, level, accent, icon, category, lessons }) => ({
        slug, title: publicCourseTitle({ title, level }), tagline, level, accent, icon, category: category || null,
        lessonCount: lessons.length,
        lessons: lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes, hasImage: !!(l.image && (typeof l.image === 'string' ? l.image : l.image.url)) })),
      })));
    }

    // Build/version endpoint — admin-only. Kept out of the public surface so version
    // strings are never used for fingerprinting by anonymous visitors.
    if (seg === 'admin/version') {
      return json({
        version: process.env.APP_VERSION || 'dev',
        builtAt: process.env.BUILT_AT || null,
        env: process.env.NODE_ENV || 'development',
        node: process.version,
      });
    }

    // Public pages: list all published pages (title + slug only, for navigation/sitemap).
    if (seg === 'pages') {
      const db = await getDb();
      const rows = await db.collection('pages').find({ published: true })
        .project({ _id: 0, id: 1, slug: 1, title: 1, seoTitle: 1, seoDescription: 1, updatedAt: 1 })
        .sort({ updatedAt: -1 }).toArray();
      return json(rows);
    }
    if (path[0] === 'pages' && path[1]) {
      if (!isSafeSlug(path[1])) return err('Not found', 404);
      const db = await getDb();
      const p = await db.collection('pages').findOne({ slug: path[1], published: true });
      if (!p) return err('Page not found', 404);
      delete p._id;
      return json(p);
    }

    if (path[0] === 'courses' && path[1]) {
      if (!isSafeSlug(path[1])) return err('Course not found', 404);
      // Check slug alias first: if this slug was renamed, tell the client to redirect.
      const alias = await resolveCourseSlugAlias(path[1]);
      if (alias) return json({ redirect: alias }, { status: 301, headers: { Location: `/api/courses/${alias}` } });
      const c = await findCourseMerged(path[1]);
      if (!c) return err('Course not found', 404);
      return json({
        slug: c.slug, title: publicCourseTitle(c), tagline: c.tagline, level: c.level, accent: c.accent, icon: c.icon, category: c.category || null,
        lessons: c.lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes, objectives: l.objectives })),
      });
    }

    if (path[0] === 'lessons' && path[1] && path[2]) {
      if (!isSafeSlug(path[1]) || !isSafeSlug(path[2])) return err('Lesson not found', 404);
      const data = await findLessonMerged(path[1], path[2]);
      if (!data) return err('Lesson not found', 404);
      // Resolve media in priority order:
      //   1) structured lesson.image = { url, alt, caption, credit, id }  (admin-managed)
      //   2) legacy string lesson.image (AI-generated)
      //   3) static media map in /lib/media.js
      //   4) placeholder
      let media = null;
      const li = data.lesson?.image;
      const mappedFallback = getMedia(path[2]);
      const fallbackSources = data.lesson?.sources?.length ? data.lesson.sources : (mappedFallback?.sources || []);
      if (li && typeof li === 'object' && li.url) {
        media = {
          image: li.url,
          imageAlt: li.alt || data.lesson.title,
          imageCaption: li.caption || '',
          imageCredit: li.credit || '',
          imageId: li.id || null,
          sources: fallbackSources,
        };
      } else if (typeof li === 'string' && li) {
        media = {
          image: li,
          imageAlt: data.lesson.imagePrompt || data.lesson.title,
          imageCaption: '',
          imageCredit: data.lesson.imageCredit || 'External',
          sources: fallbackSources,
        };
      } else if (mappedFallback?.image) {
        media = {
          image: mappedFallback.image,
          imageAlt: mappedFallback.imageAlt || data.lesson.title,
          imageCaption: '',
          imageCredit: mappedFallback.imageCredit || '',
          sources: fallbackSources,
        };
      }
      if (!media) {
        media = { image: '/placeholder-lesson.svg', imageAlt: 'Online Spirits Club — Educational lesson', imageCaption: '', imageCredit: '', sources: fallbackSources };
      }
      return json({ ...data, media });
    }

    // Public: serve stored lesson image
    if (path[0] === 'images' && path[1]) {
      if (!isSafeId(path[1])) return err('Image not found', 404);
      const rec = await fetchImageBuffer(path[1]);
      if (!rec) return err('Image not found', 404);
      return new NextResponse(rec.buffer, {
        status: 200,
        headers: {
          'Content-Type': rec.contentType,
          'Content-Length': String(rec.buffer.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // User-scoped
    if (seg === 'me') {
      const userId = requireUser(request);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return err('User not found', 404);
      const out = sanitizeUserOut(user);
      out.isAdmin = isAdminEmail(user.email);
      out.hasPassword = !!user.passwordHash;
      return json(out);
    }

    // Public: look up a newsletter subscription by unsubscribe token so the
    // /unsubscribe page can display the (partially-masked) email being unsubscribed
    // BEFORE the user clicks confirm. Returns 404 if the token doesn't match.
    if (seg === 'newsletter/unsubscribe') {
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

    if (seg === 'progress') {
      const userId = requireUser(request);
      const db = await getDb();
      const rows = await db.collection('progress').find({ userId }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (seg === 'stats') {
      const userId = requireUser(request);
      const db = await getDb();
      const completed = await db.collection('progress').countDocuments({ userId, completed: true });
      const cards = await db.collection('reviews').countDocuments({ userId });
      const totalTime = await db.collection('progress').aggregate([
        { $match: { userId } },
        { $group: { _id: null, total: { $sum: '$minutesSpent' } } },
      ]).toArray();
      const now = new Date();
      const dueCount = await db.collection('reviews').countDocuments({ userId, dueAt: { $lte: now } });
      const last = await db.collection('progress').find({ userId }).sort({ updatedAt: -1 }).limit(1).toArray();
      return json({
        lessonsCompleted: completed,
        flashcardsLearned: cards,
        minutesStudied: totalTime[0]?.total || 0,
        reviewsDue: dueCount,
        lastLesson: last[0] ? { courseSlug: last[0].courseSlug, lessonSlug: last[0].lessonSlug, updatedAt: last[0].updatedAt } : null,
      });
    }

    if (seg === 'reviews/due') {
      const userId = requireUser(request);
      const db = await getDb();
      const now = new Date();
      const rows = await db.collection('reviews').find({ userId, dueAt: { $lte: now } }).sort({ dueAt: 1 }).limit(50).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    // Continuous Study mode. Returns ONE next card by priority:
    //   1) due SR cards         -> source='due'
    //   2) weak cards (ease<2)  -> source='weak'
    //   3) recently learned <7d -> source='recent'
    //   4) random learned card  -> source='random'
    //   5) unseeded from progressed lessons -> source='new'  (opt-in via ?includeNew=1)
    // Client passes ?exclude=id1,id2 to avoid re-serving in the same session.
    if (seg === 'study/next') {
      const userId = requireUser(request);
      const db = await getDb();
      const excludeIds = (url.searchParams.get('exclude') || '')
        .split(',').map((s) => s.trim()).filter(Boolean).filter(isSafeId).slice(0, 500);
      const includeNew = url.searchParams.get('includeNew') === '1' || url.searchParams.get('includeNew') === 'true';
      const now = new Date();
      const d7 = new Date(now - 7 * 86400e3);
      const baseFilter = { userId, ...(excludeIds.length ? { id: { $nin: excludeIds } } : {}) };

      // Aggregate stats for the response bar.
      const [dueCount, weakCount, totalCount] = await Promise.all([
        db.collection('reviews').countDocuments({ userId, dueAt: { $lte: now } }),
        db.collection('reviews').countDocuments({ userId, ease: { $lt: 2.0 }, reps: { $gt: 0 } }),
        db.collection('reviews').countDocuments({ userId }),
      ]);
      const remainingDue = Math.max(0, dueCount - excludeIds.filter(Boolean).length);
      const stats = { due: dueCount, weak: weakCount, total: totalCount, remainingDue };

      // 1) Due
      let card = await db.collection('reviews').findOne({ ...baseFilter, dueAt: { $lte: now } }, { sort: { dueAt: 1 } });
      let source = card ? 'due' : null;

      // 2) Weak
      if (!card) {
        card = await db.collection('reviews').findOne({ ...baseFilter, ease: { $lt: 2.0 }, reps: { $gt: 0 } }, { sort: { ease: 1 } });
        if (card) source = 'weak';
      }
      // 3) Recently learned
      if (!card) {
        card = await db.collection('reviews').findOne({ ...baseFilter, lastReviewedAt: { $gte: d7 } }, { sort: { lastReviewedAt: -1 } });
        if (card) source = 'recent';
      }
      // 4) Random learned (any card the user already has)
      if (!card) {
        const anyCount = await db.collection('reviews').countDocuments(baseFilter);
        if (anyCount > 0) {
          const skip = Math.floor(Math.random() * anyCount);
          const arr = await db.collection('reviews').find(baseFilter).skip(skip).limit(1).toArray();
          card = arr[0] || null;
          if (card) source = 'random';
        }
      }
      // 5) New cards from completed lessons (opt-in)
      if (!card && includeNew) {
        const progressed = await db.collection('progress').find({ userId, completed: true }).toArray();
        for (const p of progressed) {
          const lp = await findLessonMerged(p.courseSlug, p.lessonSlug);
          if (!lp?.lesson?.flashcards) continue;
          // Any card index not yet in reviews?
          const existing = await db.collection('reviews').find({ userId, courseSlug: p.courseSlug, lessonSlug: p.lessonSlug }).toArray();
          const existingIdx = new Set(existing.map((c) => c.cardIndex));
          const missing = lp.lesson.flashcards.map((f, i) => ({ f, i })).find(({ i }) => !existingIdx.has(i));
          if (missing) {
            const newCard = {
              id: uuid(), userId, courseSlug: p.courseSlug, lessonSlug: p.lessonSlug,
              cardIndex: missing.i, front: missing.f.front, back: missing.f.back,
              interval: 0, ease: 2.5, reps: 0,
              dueAt: new Date(), createdAt: new Date(), lastReviewedAt: null,
            };
            await db.collection('reviews').insertOne({ ...newCard });
            card = newCard; source = 'new'; break;
          }
        }
      }

      if (!card) return json({ done: true, stats });
      delete card._id;
      // Attach lightweight course/lesson labels
      const courseMerged = await findCourseMerged(card.courseSlug);
      const courseTitle = courseMerged?.title || card.courseSlug;
      const lessonTitle = courseMerged?.lessons?.find((l) => l.slug === card.lessonSlug)?.title || card.lessonSlug;
      return json({ done: false, card: { ...card, courseTitle, lessonTitle }, source, stats });
    }

    if (path[0] === 'comments' && path[1] && path[2]) {
      if (!isSafeSlug(path[1]) || !isSafeSlug(path[2])) return err('Invalid course or lesson', 400);
      const db = await getDb();
      const rows = await db.collection('comments')
        .find({ courseSlug: path[1], lessonSlug: path[2], approved: { $ne: false } })
        .sort({ createdAt: -1 }).limit(200).toArray();
      // Redact internal userId from public responses to prevent BOLA (SEC-001).
      return json(rows.map((r) => ({
        id: r.id,
        userName: r.userName,
        text: r.text,
        courseSlug: r.courseSlug,
        lessonSlug: r.lessonSlug,
        createdAt: r.createdAt,
      })));
    }

    if (seg === 'admin/comments') {
      const db = await getDb();
      const rows = await db.collection('comments').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (seg === 'admin/overview') {
      const db = await getDb();
      const now = new Date();
      const d7 = new Date(now - 7 * 86400e3);
      const d30 = new Date(now - 30 * 86400e3);
      const [total, last7d, last30d, newsletter, lessonsCompleted, cardsReviewed, activeIds, activeIds7d, avgQuizAgg, courseAgg, deletionsTotal, deletionsSelf, deletionsAdmin, deletionsLast30d] = await Promise.all([
        db.collection('users').countDocuments({}),
        db.collection('users').countDocuments({ createdAt: { $gte: d7 } }),
        db.collection('users').countDocuments({ createdAt: { $gte: d30 } }),
        db.collection('users').countDocuments({ newsletter: true }),
        db.collection('progress').countDocuments({ completed: true }),
        db.collection('reviews').countDocuments({ lastReviewedAt: { $ne: null } }),
        db.collection('progress').distinct('userId'),
        db.collection('progress').distinct('userId', { updatedAt: { $gte: d7 } }),
        db.collection('progress').aggregate([
          { $match: { quizScore: { $ne: null } } },
          { $group: { _id: null, avg: { $avg: '$quizScore' }, count: { $sum: 1 } } },
        ]).toArray(),
        db.collection('progress').aggregate([
          { $group: { _id: { u: '$userId', c: '$courseSlug' }, done: { $max: { $cond: ['$completed', 1, 0] } } } },
          { $group: { _id: '$_id.c', started: { $sum: 1 }, completed: { $sum: '$done' } } },
        ]).toArray(),
        db.collection('deletions_audit').countDocuments({}),
        db.collection('deletions_audit').countDocuments({ method: 'self-service' }),
        db.collection('deletions_audit').countDocuments({ method: 'admin' }),
        db.collection('deletions_audit').countDocuments({ deletedAt: { $gte: d30 } }),
      ]);
      const courseStats = new Map();
      for (const c of courseAgg) courseStats.set(c._id, c);
      const totalStarted = courseAgg.reduce((s, c) => s + c.started, 0);
      const totalCourseCompletions = courseAgg.reduce((s, c) => s + c.completed, 0);
      const completionRate = totalStarted ? Math.round((totalCourseCompletions / totalStarted) * 100) : 0;
      return json({
        users: { total, last7d, last30d, newsletter, active: activeIds.length, active7d: activeIds7d.length },
        learning: {
          lessonsCompleted, cardsReviewed,
          courseCompletions: totalCourseCompletions,
          avgQuizScore: avgQuizAgg[0]?.avg ? Math.round(avgQuizAgg[0].avg * 10) / 10 : null,
          quizzesTaken: avgQuizAgg[0]?.count || 0,
          completionRate,
        },
        deletions: {
          total: deletionsTotal,
          selfService: deletionsSelf,
          admin: deletionsAdmin,
          last30d: deletionsLast30d,
        },
        mailer: mailerStatus(),
      });
    }

    if (seg === 'admin/analytics') {
      const db = await getDb();
      const [byCourse, byLesson, dropoff, dailyReviews, byCountry, byCity, byRole, newsletterByRole, totalUsers] = await Promise.all([
        db.collection('progress').aggregate([
          { $group: { _id: { u: '$userId', c: '$courseSlug' }, done: { $max: { $cond: ['$completed', 1, 0] } }, avg: { $avg: '$quizScore' } } },
          { $group: { _id: '$_id.c', started: { $sum: 1 }, completed: { $sum: '$done' }, avgQuiz: { $avg: '$avg' } } },
          { $sort: { started: -1 } }, { $limit: 20 },
        ]).toArray(),
        db.collection('progress').aggregate([
          { $group: { _id: { c: '$courseSlug', l: '$lessonSlug' }, started: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } },
          { $sort: { completed: -1 } }, { $limit: 20 },
        ]).toArray(),
        db.collection('progress').aggregate([
          { $group: { _id: { c: '$courseSlug', l: '$lessonSlug' }, started: { $sum: 1 }, completed: { $sum: { $cond: ['$completed', 1, 0] } } } },
          { $addFields: { dropoff: { $cond: [{ $gt: ['$started', 0] }, { $subtract: [1, { $divide: ['$completed', '$started'] }] }, 0] } } },
          { $match: { started: { $gte: 2 } } },
          { $sort: { dropoff: -1 } }, { $limit: 10 },
        ]).toArray(),
        db.collection('reviews').aggregate([
          { $match: { lastReviewedAt: { $ne: null } } },
          { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastReviewedAt' } }, count: { $sum: 1 } } },
          { $sort: { _id: -1 } }, { $limit: 30 },
        ]).toArray(),
        // Audience: by country
        db.collection('users').aggregate([
          { $match: { country: { $ne: null, $exists: true } } },
          { $group: { _id: '$country', count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 30 },
        ]).toArray(),
        // Audience: by city
        db.collection('users').aggregate([
          { $match: { city: { $ne: null, $exists: true } } },
          { $group: { _id: { city: '$city', country: '$country' }, count: { $sum: 1 } } },
          { $sort: { count: -1 } }, { $limit: 30 },
        ]).toArray(),
        // Audience: by role
        db.collection('users').aggregate([
          { $match: { role: { $ne: null, $exists: true } } },
          { $group: { _id: '$role', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]).toArray(),
        // Newsletter opt-in rate by role
        db.collection('users').aggregate([
          { $match: { role: { $ne: null, $exists: true } } },
          { $group: { _id: '$role', total: { $sum: 1 }, optedIn: { $sum: { $cond: ['$newsletter', 1, 0] } } } },
          { $addFields: { rate: { $cond: [{ $gt: ['$total', 0] }, { $round: [{ $multiply: [{ $divide: ['$optedIn', '$total'] }, 100] }, 1] }, 0] } } },
          { $sort: { total: -1 } },
        ]).toArray(),
        db.collection('users').countDocuments({}),
      ]);
      return json({
        byCourse: byCourse.map((r) => ({ slug: r._id, started: r.started, completed: r.completed, avgQuiz: r.avgQuiz ? Math.round(r.avgQuiz * 10) / 10 : null })),
        byLesson: byLesson.map((r) => ({ courseSlug: r._id.c, lessonSlug: r._id.l, started: r.started, completed: r.completed })),
        dropoff: dropoff.map((r) => ({ courseSlug: r._id.c, lessonSlug: r._id.l, started: r.started, completed: r.completed, dropoff: Math.round(r.dropoff * 100) })),
        dailyReviews: dailyReviews.map((r) => ({ date: r._id, count: r.count })).reverse(),
        audience: {
          totalUsers,
          byCountry: byCountry.map((r) => ({ country: r._id, count: r.count })),
          byCity: byCity.map((r) => ({ city: r._id.city, country: r._id.country, count: r.count })),
          byRole: byRole.map((r) => ({ role: r._id, count: r.count })),
          newsletterByRole: newsletterByRole.map((r) => ({ role: r._id, total: r.total, optedIn: r.optedIn, rate: r.rate })),
        },
      });
    }

    if (seg === 'admin/users') {
      const db = await getDb();
      const rawQ = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
      // Escape regex meta so search stays literal (prevents ReDoS + operator injection).
      const escQ = rawQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const filter = escQ ? { $or: [
        { email: { $regex: escQ, $options: 'i' } },
        { name: { $regex: escQ, $options: 'i' } },
      ] } : {};
      const rows = await db.collection('users').find(filter).sort({ createdAt: -1 }).limit(500).toArray();
      const total = await db.collection('users').countDocuments(filter);
      return json({ total, users: rows.map((u) => ({ ...u, _id: undefined, passwordHash: undefined })) });
    }

    if (path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'export') {
      if (!isSafeId(path[2])) return err('User not found', 404);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: path[2] });
      if (!user) return err('User not found', 404);
      delete user._id;
      delete user.passwordHash;
      delete user.newsletterUnsubscribeToken; // internal token — not part of the portability bundle
      const [progress, reviews, comments, newsletterAudit] = await Promise.all([
        db.collection('progress').find({ userId: user.id }).sort({ updatedAt: -1 }).toArray(),
        db.collection('reviews').find({ userId: user.id }).sort({ updatedAt: -1 }).toArray(),
        db.collection('comments').find({ userId: user.id }).sort({ createdAt: -1 }).toArray(),
        db.collection('newsletter').find({ email: user.email || '' }).toArray(),
      ]);
      const strip = (arr) => arr.map((r) => { const c = { ...r }; delete c._id; return c; });
      const bundle = {
        exportedAt: new Date().toISOString(),
        exportedBy: 'admin',
        format: 'gdpr-portability-v1',
        gdprNote: 'This export contains all personal data we hold about the user (GDPR Art. 15 access / Art. 20 portability). Internal security tokens are intentionally omitted.',
        user,
        progress: strip(progress),
        flashcardReviews: strip(reviews),
        comments: strip(comments),
        newsletterAudit: strip(newsletterAudit),
      };
      const format = (url.searchParams.get('format') || 'json').toLowerCase();
      const safeEmailStub = (user.email || 'user').replace(/[^a-z0-9._@-]+/gi, '_').slice(0, 60);
      if (format === 'csv') {
        // Portability CSV — flat table with a "section" column so it round-trips into a spreadsheet.
        const rows = [];
        rows.push(['section', 'field', 'value']);
        const flat = (section, obj) => {
          for (const [k, v] of Object.entries(obj || {})) {
            const val = v instanceof Date ? v.toISOString() : (typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? ''));
            rows.push([section, k, val]);
          }
        };
        flat('user', user);
        bundle.progress.forEach((p, i) => flat(`progress[${i}]`, p));
        bundle.flashcardReviews.forEach((r, i) => flat(`flashcardReviews[${i}]`, r));
        bundle.comments.forEach((c, i) => flat(`comments[${i}]`, c));
        bundle.newsletterAudit.forEach((n, i) => flat(`newsletterAudit[${i}]`, n));
        const csv = rows.map((r) => r.map((cell) => {
          const s = String(cell);
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(',')).join('\n');
        return new NextResponse(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="gdpr-export-${safeEmailStub}.csv"`,
            'Cache-Control': 'no-store',
          },
        });
      }
      // Default: JSON — the recommended portability format under GDPR Art. 20.
      return new NextResponse(JSON.stringify(bundle, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="gdpr-export-${safeEmailStub}.json"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    if (path[0] === 'admin' && path[1] === 'users' && path[2]) {
      if (!isSafeId(path[2])) return err('User not found', 404);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: path[2] });
      if (!user) return err('User not found', 404);
      delete user._id;
      delete user.passwordHash;
      const [progress, reviewsCount, reviewsDone, totalTime, comments, newsletterAudit] = await Promise.all([
        db.collection('progress').find({ userId: user.id }).sort({ updatedAt: -1 }).toArray(),
        db.collection('reviews').countDocuments({ userId: user.id }),
        db.collection('reviews').countDocuments({ userId: user.id, lastReviewedAt: { $ne: null } }),
        db.collection('progress').aggregate([
          { $match: { userId: user.id } }, { $group: { _id: null, total: { $sum: '$minutesSpent' } } },
        ]).toArray(),
        db.collection('comments').find({ userId: user.id }).sort({ createdAt: -1 }).limit(500).toArray(),
        db.collection('newsletter').find({ email: user.email || '' }).toArray(),
      ]);
      const coursesStarted = new Set(progress.map((p) => p.courseSlug)).size;
      const lessonsCompleted = progress.filter((p) => p.completed).length;
      return json({
        user,
        stats: {
          coursesStarted,
          lessonsCompleted,
          minutesStudied: totalTime[0]?.total || 0,
          flashcardsInQueue: reviewsCount,
          flashcardsReviewed: reviewsDone,
          commentsPosted: comments.length,
        },
        progress: progress.map((p) => ({ ...p, _id: undefined })),
        comments: comments.map((c) => ({ ...c, _id: undefined })),
        newsletterAudit: newsletterAudit.map((n) => ({ ...n, _id: undefined })),
      });
    }

    if (seg === 'admin/newsletter') {
      const db = await getDb();
      const rows = await db.collection('newsletter').find({}).sort({ createdAt: -1 }).limit(2000).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    // Admin: pages CMS
    if (seg === 'admin/pages') {
      const db = await getDb();
      const rows = await db.collection('pages').find({}).sort({ updatedAt: -1 }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }
    if (path[0] === 'admin' && path[1] === 'pages' && path[2]) {
      if (!isSafeId(path[2])) return err('Page not found', 404);
      const db = await getDb();
      const p = await db.collection('pages').findOne({ id: path[2] });
      if (!p) return err('Page not found', 404);
      delete p._id;
      return json(p);
    }

    // Admin: slug alias list (for course editor UI)
    if (seg === 'admin/course-aliases') {
      const db = await getDb();
      const rows = await db.collection('course_slug_aliases').find({}).sort({ createdAt: -1 }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    // Removed: /admin/drafts, /admin/generations, /admin/templates — AI generation disabled.
    if (seg === 'admin/drafts' || seg === 'admin/generations' || seg === 'admin/templates' || (path[0] === 'admin' && path[1] === 'drafts')) {
      return err('AI generation is disabled', 410);
    }

    return err('Not found', 404);
  } catch (e) {
    if (e && e.status && e.status >= 400 && e.status < 500) {
      return err(e.message || 'Bad request', e.status);
    }
    console.error('GET error', seg, e);
    return err('Server error', 500);
  }
}

export async function PATCH(request, { params }) {
  const { path = [] } = await params;
  const body = await request.json().catch(() => ({}));

  // Admin guard
  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    if (path[0] === 'admin' && path[1] === 'users' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid user id', 400);
      const db = await getDb();
      const set = { updatedAt: new Date() };
      if (typeof body.name === 'string') set.name = body.name.trim().slice(0, 100);
      if (typeof body.email === 'string') set.email = body.email.trim().toLowerCase();
      // GDPR — Rectification (Art. 16): profile fields can be corrected by admin.
      if (typeof body.country === 'string') set.country = sanitizeProfileField(body.country, 60);
      if (typeof body.city === 'string') set.city = sanitizeProfileField(body.city, 80);
      if (typeof body.role === 'string') set.role = sanitizeRole(body.role);
      // Newsletter toggle by admin — record the correct audit trail so we don't
      // silently lose consent metadata when an admin flips the box.
      if (typeof body.newsletter === 'boolean') {
        const now = new Date();
        const current = await db.collection('users').findOne({ id: path[2] }, { projection: { newsletter: 1, email: 1, newsletterUnsubscribeToken: 1 } });
        set.newsletter = body.newsletter;
        if (current && current.newsletter !== body.newsletter) {
          if (body.newsletter) {
            const token = current.newsletterUnsubscribeToken || newUnsubToken();
            set.newsletterConsentAt = now;
            set.newsletterWithdrawnAt = null;
            set.newsletterUnsubscribeToken = token;
            set.newsletterSource = 'admin';
            if (current.email) {
              await db.collection('newsletter').updateOne(
                { email: current.email },
                { $set: { email: current.email, source: 'admin', consentAt: now, withdrawnAt: null, unsubscribeToken: token, userId: path[2], updatedAt: now }, $setOnInsert: { id: uuid(), createdAt: now } },
                { upsert: true }
              );
            }
          } else {
            set.newsletterWithdrawnAt = now;
            if (current.email) {
              await db.collection('newsletter').updateOne({ email: current.email }, { $set: { withdrawnAt: now, updatedAt: now } });
            }
          }
        }
      }
      await db.collection('users').updateOne({ id: path[2] }, { $set: set });
      const u = await db.collection('users').findOne({ id: path[2] });
      if (u) { delete u._id; delete u.passwordHash; }
      return NextResponse.json({ ok: true, user: u });
    }
    if (path[0] === 'admin' && path[1] === 'comments' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid comment id', 400);
      const db = await getDb();
      const set = {};
      if (typeof body.approved === 'boolean') set.approved = body.approved;
      if (typeof body.text === 'string') set.text = body.text.slice(0, 800);
      await db.collection('comments').updateOne({ id: path[2] }, { $set: set });
      const row = await db.collection('comments').findOne({ id: path[2] });
      if (row) delete row._id;
      return NextResponse.json({ ok: true, comment: row });
    }

    // Pages CMS — update
    if (path[0] === 'admin' && path[1] === 'pages' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid page id', 400);
      const db = await getDb();
      const set = { updatedAt: new Date() };
      if (typeof body.title === 'string') set.title = body.title.trim().slice(0, 200);
      if (typeof body.seoTitle === 'string') set.seoTitle = body.seoTitle.trim().slice(0, 200);
      if (typeof body.seoDescription === 'string') set.seoDescription = body.seoDescription.trim().slice(0, 400);
      if (typeof body.contentHtml === 'string') set.contentHtml = sanitizeContentHtml(body.contentHtml);
      if (typeof body.published === 'boolean') set.published = body.published;
      // slug change with reserved-word + clash guard
      if (typeof body.slug === 'string') {
        const s = body.slug.trim().toLowerCase();
        if (!SLUG_RE.test(s)) return NextResponse.json({ error: 'Invalid slug. Lowercase letters, numbers and dashes only.' }, { status: 400 });
        if (RESERVED_PAGE_SLUGS.has(s)) return NextResponse.json({ error: `Slug "${s}" is reserved.` }, { status: 400 });
        const clash = await db.collection('pages').findOne({ slug: s, id: { $ne: path[2] } });
        if (clash) return NextResponse.json({ error: 'A page with that slug already exists.' }, { status: 400 });
        const clashCourse = (await allCoursesMerged()).some((c) => c.slug === s);
        if (clashCourse) return NextResponse.json({ error: 'That slug is already used by a course.' }, { status: 400 });
        set.slug = s;
      }
      await db.collection('pages').updateOne({ id: path[2] }, { $set: set });
      const row = await db.collection('pages').findOne({ id: path[2] });
      if (row) delete row._id;
      return NextResponse.json({ ok: true, page: row });
    }
    // Legacy draft edits (AI) - disabled
    if (path[0] === 'admin' && path[1] === 'drafts') {
      return NextResponse.json({ error: 'AI generation is disabled' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    if (e && e.status && e.status >= 400 && e.status < 500) {
      return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status });
    }
    console.error('PATCH error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;

  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    if (path[0] === 'admin' && path[1] === 'users' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid user id', 400);
      const db = await getDb();
      await eraseUserData(db, path[2], { method: 'admin', actorEmail: null });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'admin' && path[1] === 'comments' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid comment id', 400);
      const db = await getDb();
      await db.collection('comments').deleteOne({ id: path[2] });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'admin' && path[1] === 'images' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid image id', 400);
      const ok = await deleteImage(path[2]);
      return NextResponse.json({ ok });
    }
    if (path[0] === 'admin' && path[1] === 'pages' && path[2]) {
      if (!isSafeId(path[2])) return err('Invalid page id', 400);
      const db = await getDb();
      const res = await db.collection('pages').deleteOne({ id: path[2] });
      return NextResponse.json({ ok: res.deletedCount > 0 });
    }
    if (path[0] === 'admin' && path[1] === 'drafts') {
      return NextResponse.json({ error: 'AI generation is disabled' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    if (e && e.status && e.status >= 400 && e.status < 500) {
      return NextResponse.json({ error: e.message || 'Bad request' }, { status: e.status });
    }
    console.error('DELETE error', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { path = [] } = await params;
  const seg = path.join('/');

  // Special-case: admin image upload accepts multipart/form-data OR JSON.
  // We must NOT call request.json() before handling multipart.
  if (seg === 'admin/images') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    try {
      if (ct.includes('multipart/form-data')) {
        const form = await request.formData();
        const file = form.get('file');
        if (!file || typeof file === 'string') return err('No file provided');
        if (!ALLOWED_MIME.has(file.type)) return err(`Unsupported type: ${file.type || 'unknown'}. Use JPG, PNG or WebP.`);
        if (file.size > MAX_UPLOAD_BYTES) return err('Image is too large (max 8MB).');
        const buffer = Buffer.from(await file.arrayBuffer());
        const info = await uploadImage({ buffer, contentType: file.type, filename: file.name || 'upload', uploadedBy: s.email });
        return json({ ok: true, image: info });
      }
      const body = await request.json().catch(() => ({}));
      if (body?.url) {
        const info = await uploadImageFromUrl(body.url, { uploadedBy: s.email });
        return json({ ok: true, image: info });
      }
      return err('Provide a file (multipart) or a JSON body with { url }');
    } catch (e) {
      console.error('admin/images upload error', e);
      return err(e.message || 'Upload failed', 400);
    }
  }

  const body = await request.json().catch(() => ({}));

  // Public admin-auth endpoints (do not need the cookie yet)
  if (seg === 'admin-auth') {
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
  if (seg === 'admin-auth/logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...ADMIN_COOKIE.options, name: ADMIN_COOKIE.name, value: '', maxAge: 0 });
    return res;
  }

  // Regular-user logout (clears the osc_user cookie).
  if (seg === 'logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...USER_COOKIE_CLEAR.options, name: USER_COOKIE_CLEAR.name, value: '' });
    return res;
  }

  // ------------------------------------------------------------------
  // Public: OSC Journal — email-only subscription
  // No account needed. Sends a welcome email (best-effort via Resend).
  // Idempotent upserts into the shared `newsletter` collection so the
  // existing /unsubscribe flow works out of the box.
  // ------------------------------------------------------------------
  if (seg === 'journal/subscribe') {
    try {
      const ip = ipFromRequest(request);
      // 5 subs per 10 min per IP — prevents automated abuse.
      const rl = rateLimit(`journal:${ip}`, { max: 5, windowMs: 10 * 60 * 1000 });
      if (!rl.allowed) return tooMany(rl.retryAfterMs);

      const raw = String(body?.email || '').trim().toLowerCase().slice(0, 254);
      if (!isSafeEmail(raw)) return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 });

      const db = await getDb();
      const now = new Date();
      const unsubToken = newUnsubToken();

      // If this email already has an active subscription, treat as success (idempotent).
      const existing = await db.collection('newsletter').findOne({ email: raw });
      const existingUser = await db.collection('users').findOne({ email: raw }, { projection: { newsletter: 1, newsletterWithdrawnAt: 1, newsletterUnsubscribeToken: 1 } });

      const alreadyActive = (existing && !existing.withdrawnAt) || (existingUser && existingUser.newsletter && !existingUser.newsletterWithdrawnAt);

      await db.collection('newsletter').updateOne(
        { email: raw },
        {
          $set: {
            email: raw,
            source: existing?.source || 'journal',
            consentAt: now,
            withdrawnAt: null,
            unsubscribeToken: existing?.unsubscribeToken || unsubToken,
            updatedAt: now,
          },
          $setOnInsert: { id: uuid(), createdAt: now },
        },
        { upsert: true }
      );

      // If the email belongs to a registered user, also flip their user-level
      // newsletter flag back on so both surfaces stay in sync.
      if (existingUser) {
        await db.collection('users').updateOne(
          { email: raw },
          {
            $set: {
              newsletter: true,
              newsletterConsentAt: now,
              newsletterWithdrawnAt: null,
              newsletterUnsubscribeToken: existingUser.newsletterUnsubscribeToken || unsubToken,
              updatedAt: now,
            },
          }
        );
      }

      // Fire-and-forget welcome email. Never block the subscribe on Resend.
      if (!alreadyActive) {
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const token = existing?.unsubscribeToken || unsubToken;
        const unsubUrl = `${base}/unsubscribe?token=${encodeURIComponent(token)}`;
        sendTransactionalEmail({
          to: raw,
          ...emailTemplates.journalWelcome({ unsubUrl }),
        }).catch((e) => console.warn('[journal] welcome email failed:', e?.message || e));
      }

      return NextResponse.json({ ok: true, alreadySubscribed: !!alreadyActive });
    } catch (e) {
      console.error('[journal/subscribe] error:', e);
      return NextResponse.json({ error: 'Could not subscribe. Please try again.' }, { status: 500 });
    }
  }

  // All other admin POSTs require the cookie
  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    if (seg === 'register') {
      // Rate limit
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
      // Legacy accounts (no passwordHash) must go through a supported claim flow (email token),
      // which is not enabled for the MVP.
      if (existing) {
        return err('This email is already registered. Please log in or contact support.', 409);
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const now = new Date();
      // Newsletter consent metadata — GDPR/ePrivacy audit trail.
      // Consent is granular: users can register without opting in. `newsletter`
      // reflects the current subscription state; the three *At timestamps + token
      // give us the audit trail + a one-click unsubscribe link for future Beehiiv sync.
      const unsubToken = newsletter ? newUnsubToken() : null;
      const user = {
        id: uuid(), email, name, provider: 'email',
        authMethod: 'password',
        // NEW: email verification is required before the user can log in.
        // Legacy accounts already in the DB stay untouched — the migration path
        // is: users without emailVerified === false are treated as verified.
        emailVerified: false,
        emailVerifiedAt: null,
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
      // Issue a verification token + send the email. Both are fire-and-forget from
      // the API's perspective — if Resend is unconfigured the mailer returns
      // { skipped:true } and registration still succeeds.
      const { token: verifyRawToken } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const verifyUrl = `${base}/verify-email?token=${encodeURIComponent(verifyRawToken)}`;
      const mailRes = await sendTransactionalEmail({
        to: email,
        ...emailTemplates.verification({ name, url: verifyUrl }),
      });
      // Return success WITHOUT logging the user in. They must verify first.
      // The client-side register page interprets emailVerified:false and shows
      // a "check your email" screen.
      return json({
        ok: true,
        emailVerified: false,
        emailSent: !!mailRes?.ok,
        emailSkipped: !!mailRes?.skipped,
        user: sanitizeUserOut(user),
      });
    }

    // ===================================================================
    // EMAIL VERIFICATION / PASSWORD RESET / CHANGE PASSWORD
    // ===================================================================

    // Consume a verification link (raw token in body). Logs the user in on success.
    if (seg === 'auth/verify-email') {
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
      // Log the user in — the verification link itself is proof of email possession,
      // so we can safely mint a session. (Same UX as most SaaS: click link, land in app.)
      const res = json({ ok: true, user: sanitizeUserOut(user) });
      attachUserSession(res, user.id);
      return res;
    }

    // Public: send a fresh verification email. Rate-limited per email + per IP.
    // Response is intentionally generic so it can't be used to probe accounts.
    if (seg === 'auth/resend-verification') {
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
      // Only re-send if the user actually exists AND is still unverified.
      if (user && user.emailVerified === false && user.passwordHash) {
        const { token } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
        const base = process.env.NEXT_PUBLIC_BASE_URL || '';
        const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
        await sendTransactionalEmail({ to: email, ...emailTemplates.verification({ name: user.name, url }) });
      }
      return json({ ok: true });
    }

    // Public: request a password reset email. Always returns generic { ok:true } to
    // prevent email enumeration — the client can't tell whether an account exists.
    if (seg === 'auth/forgot-password') {
      const ip = ipFromRequest(request);
      const rlIp = rateLimit(`fp:${ip}`, { max: 5, windowMs: 60 * 60 * 1000 });
      if (!rlIp.allowed) return tooMany(rlIp.retryAfterMs);
      const email = (body.email || '').trim().toLowerCase();
      if (!isSafeEmail(email)) return json({ ok: true });
      const rlEmail = rateLimit(`fp:e:${email}`, { max: 3, windowMs: 60 * 60 * 1000 });
      if (!rlEmail.allowed) return json({ ok: true }); // still generic (don't leak rate-limit status)
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

    // Public: consume a password-reset token + set a new password. Kills the current
    // session cookie so the user is forced to sign in fresh with the new password
    // (which also proves possession of both email + new password).
    if (seg === 'auth/reset-password') {
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
        // Fire a "your password was changed" notice so we surface unauthorised resets.
        sendTransactionalEmail({ to: user.email, ...emailTemplates.passwordChanged({ name: user.name }) }).catch(() => {});
      }
      const res = json({ ok: true });
      clearUserSession(res); // force re-login
      return res;
    }

    // Authenticated: change password from within the profile.
    // Requires knowledge of the current password. On success we rotate the session
    // cookie (mint a fresh token) so the current tab keeps working, but any OTHER
    // sessions the user has open will keep the OLD token — those are handled by
    // the `me` GET endpoint which invalidates when passwordLastChangedAt is set.
    if (seg === 'me/change-password') {
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

    if (seg === 'login') {
      // Rate limit — per (ip+email) + per ip
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
      // SEC-002: legacy accounts without a password MUST NOT reveal their existence and
      // must not be claimable via /set-password. Treat as invalid credentials.
      if (!user || !user.passwordHash) return err('Invalid email or password', 401);
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return err('Invalid email or password', 401);
      // Block unverified accounts (registered AFTER we shipped email verification).
      // Legacy accounts pre-dating verification never had `emailVerified` set — treat
      // those as verified (they've been signing in successfully for weeks).
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

    if (seg === 'set-password') {
      // SEC-002: legacy-user claim flow disabled. Requires a verified email-token
      // delivery mechanism which is not yet available in the MVP.
      return err('Legacy account claim is not available. Please contact support.', 410);
    }

    if (seg === 'auth') {
      // Legacy email-only auth has been deprecated. All new users must register with a password
      // via /api/register, and existing users must log in via /api/login (which auto-prompts legacy
      // email-only accounts to set a password on first login).
      return err('This endpoint has been deprecated. Please use /api/register or /api/login.', 410);
    }

    if (seg === 'auth-legacy-disabled') {
      return err('Deprecated', 410);
    }

    // GDPR Art. 17 — Right to erasure. Self-service account deletion.
    // Requires the user's session AND an explicit type-to-confirm value of exactly
    // "DELETE" in the body to prevent accidental / CSRF-style deletion. Idempotent
    // on repeat calls (session is cleared, so the second call returns 401 anyway).
    if (seg === 'me/delete') {
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

    if (seg === 'me/update') {
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
            // Opting in — fresh consent timestamp + issue a token if we don't have one yet.
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
            // Opting out — record withdrawal, keep the token so unsubscribe links keep working.
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

    if (seg === 'progress') {
      const userId = requireUser(request);
      const { courseSlug, lessonSlug, completed, step, minutesSpent, quizScore } = body;
      if (!isSafeSlug(courseSlug) || !isSafeSlug(lessonSlug)) return err('Invalid course or lesson', 400);
      const stepStr = typeof step === 'string' && step.length <= 40 ? step : undefined;
      const completedBool = typeof completed === 'boolean' ? completed : undefined;
      const mins = typeof minutesSpent === 'number' && minutesSpent >= 0 && minutesSpent < 24 * 60 ? minutesSpent : 0;
      const quiz = typeof quizScore === 'number' && quizScore >= 0 && quizScore <= 100 ? quizScore : null;
      const db = await getDb();
      const existing = await db.collection('progress').findOne({ userId, courseSlug, lessonSlug });
      const doc = {
        id: existing?.id || uuid(),
        userId, courseSlug, lessonSlug,
        step: stepStr ?? existing?.step ?? 'objectives',
        completed: completedBool ?? existing?.completed ?? false,
        minutesSpent: (existing?.minutesSpent || 0) + mins,
        quizScore: quiz ?? existing?.quizScore ?? null,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await db.collection('progress').updateOne(
        { userId, courseSlug, lessonSlug },
        { $set: doc },
        { upsert: true }
      );

      // seed reviews when a lesson is completed and reviews don't exist yet
      if (completedBool) {
        const has = await db.collection('reviews').countDocuments({ userId, courseSlug, lessonSlug });
        if (has === 0) {
          const lp = getLesson(courseSlug, lessonSlug);
          if (lp?.lesson?.flashcards) {
            const cards = lp.lesson.flashcards.map((f, i) => ({
              id: uuid(), userId, courseSlug, lessonSlug,
              cardIndex: i, front: f.front, back: f.back,
              interval: 0, ease: 2.5, reps: 0,
              dueAt: new Date(), createdAt: new Date(), lastReviewedAt: null,
            }));
            await db.collection('reviews').insertMany(cards);
          }
        }
      }

      return json({ ok: true, progress: doc });
    }

    if (seg === 'reviews/answer') {
      const userId = requireUser(request);
      const { reviewId, grade } = body;
      if (!isSafeId(reviewId) || !['again', 'hard', 'easy'].includes(grade)) return err('Missing fields');
      const db = await getDb();
      const card = await db.collection('reviews').findOne({ id: reviewId, userId });
      if (!card) return err('Card not found', 404);
      const upd = schedule(card, grade);
      await db.collection('reviews').updateOne({ id: reviewId, userId }, { $set: upd });
      return json({ ok: true, card: { ...card, ...upd, _id: undefined } });
    }

    if (seg === 'comments') {
      const userId = requireUser(request);
      const { courseSlug, lessonSlug, text } = body;
      if (!isSafeSlug(courseSlug) || !isSafeSlug(lessonSlug)) return err('Invalid course or lesson', 400);
      if (typeof text !== 'string' || !text.trim()) return err('Missing fields');
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return err('Not authenticated', 401);
      const doc = {
        id: uuid(), userId, userName: user.name, courseSlug, lessonSlug,
        text: text.trim().slice(0, 800),
        approved: true,
        createdAt: new Date(),
      };
      await db.collection('comments').insertOne(doc);
      // Do NOT return userId to the client — mirror the redacted public shape.
      return json({ ok: true, comment: {
        id: doc.id, userName: doc.userName,
        courseSlug: doc.courseSlug, lessonSlug: doc.lessonSlug,
        text: doc.text, createdAt: doc.createdAt,
      } });
    }

    if (seg === 'newsletter') {
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

    // Public: one-click newsletter unsubscribe. Works without login.
    // Accepts either a signed-in user's session OR a token OR (as a last resort)
    // an email that we can match to a subscriber. Idempotent — always returns ok.
    if (seg === 'newsletter/unsubscribe') {
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

    if (seg === 'admin/course-override') {
      const { course } = body;
      if (!course || !isSafeSlug(course.slug)) return err('Valid course.slug required');
      // Rehydrate lessons — never save a lesson without theory/embedded/flashcards/quiz.
      // The client's course.lessons may be a truncated projection (from GET /api/courses/:slug),
      // so we must merge with the canonical source before persisting.
      const hydrated = {
        ...course,
        lessons: (course.lessons || []).map((l) => hydrateLesson(course.slug, l)),
      };
      const db = await getDb();
      await db.collection('courses_published').updateOne(
        { slug: course.slug },
        { $set: { ...hydrated, updatedAt: new Date() } },
        { upsert: true }
      );
      const saved = await db.collection('courses_published').findOne({ slug: course.slug });
      if (saved) delete saved._id;
      return json({ ok: true, course: saved });
    }

    // Save/replace/remove a lesson image. Body: { courseSlug, lessonSlug, image: {url, alt, caption, credit, id} | null }
    if (seg === 'admin/lesson-image') {
      const { courseSlug, lessonSlug, image } = body || {};
      if (!isSafeSlug(courseSlug) || !isSafeSlug(lessonSlug)) return err('Invalid courseSlug or lessonSlug');
      const course = await findCourseMerged(courseSlug);
      if (!course) return err('Course not found', 404);
      const idx = (course.lessons || []).findIndex((l) => l.slug === lessonSlug);
      if (idx === -1) return err('Lesson not found', 404);
      const db = await getDb();
      const existing = await db.collection('courses_published').findOne({ slug: courseSlug });
      const base = existing ? { ...existing } : { ...course };
      delete base._id;
      // Always hydrate lessons from canonical source — never persist a lesson stripped of theory/quiz/etc.
      base.lessons = (course.lessons).map((canonicalLesson) => {
        const existingLesson = (existing?.lessons || []).find((l) => l.slug === canonicalLesson.slug);
        return { ...canonicalLesson, ...(existingLesson || {}) };
      });
      const previousImage = base.lessons[idx].image;
      if (image === null || image === undefined) {
        delete base.lessons[idx].image;
      } else {
        // Sanitize
        base.lessons[idx].image = {
          url: String(image.url || '').slice(0, 2048),
          alt: String(image.alt || '').slice(0, 300),
          caption: String(image.caption || '').slice(0, 300),
          credit: String(image.credit || '').slice(0, 200),
          id: image.id ? String(image.id) : null,
          updatedAt: new Date(),
        };
        if (!base.lessons[idx].image.url) return err('Image URL required');
      }
      base.updatedAt = new Date();
      await db.collection('courses_published').updateOne(
        { slug: courseSlug },
        { $set: base },
        { upsert: true }
      );
      // Optional cleanup: if the previous image had an internal GridFS id and it's being replaced/removed, delete the blob.
      try {
        const prevId = previousImage && typeof previousImage === 'object' ? previousImage.id : null;
        const newId = base.lessons[idx].image?.id || null;
        if (prevId && prevId !== newId) await deleteImage(prevId);
      } catch (e) { console.warn('previous image cleanup failed', e); }
      return json({ ok: true, image: base.lessons[idx].image || null });
    }

    if (seg === 'admin/course-publish') {
      const { slug, published } = body;
      if (!isSafeSlug(slug)) return err('Invalid slug');
      const db = await getDb();
      if (published === false) {
        await db.collection('courses_published').updateOne({ slug }, { $set: { hidden: true, updatedAt: new Date() } });
      } else {
        await db.collection('courses_published').updateOne({ slug }, { $set: { hidden: false, updatedAt: new Date() } });
      }
      return json({ ok: true });
    }

    // Update course metadata (title, slug, tagline/description, category, level).
    // Slug renames create a 301 alias and migrate all progress/reviews.
    // Admin: manually mark a user as email-verified (support workflow).
    if (path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'mark-verified') {
      if (!isSafeId(path[2])) return err('Invalid user id', 400);
      const db = await getDb();
      const now = new Date();
      const r = await db.collection('users').updateOne(
        { id: path[2] },
        { $set: { emailVerified: true, emailVerifiedAt: now, updatedAt: now } }
      );
      if (!r.matchedCount) return err('User not found', 404);
      return json({ ok: true, emailVerifiedAt: now });
    }

    // Admin: trigger a fresh verification email for a user (support workflow).
    // Bypasses the per-email/IP rate limits that the public resend endpoint has,
    // since only authenticated admins can call this.
    if (path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'resend-verification') {
      if (!isSafeId(path[2])) return err('Invalid user id', 400);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: path[2] });
      if (!user) return err('User not found', 404);
      if (user.emailVerified) return err('This user is already verified.', 400);
      const { token } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
      const mail = await sendTransactionalEmail({
        to: user.email,
        ...emailTemplates.verification({ name: user.name, url }),
      });
      return json({ ok: true, emailSent: !!mail?.ok, emailSkipped: !!mail?.skipped, error: mail?.message || null });
    }

    if (seg === 'admin/course-meta') {
      const { originalSlug, title, slug: newSlug, tagline, category, level } = body || {};
      if (!isSafeSlug(originalSlug)) return err('Invalid originalSlug');
      if (typeof newSlug === 'string' && newSlug !== originalSlug && !isSafeSlug(newSlug)) return err('Invalid new slug');
      const current = await findCourseMerged(originalSlug);
      if (!current) return err('Course not found', 404);
      const db = await getDb();
      const set = { updatedAt: new Date() };
      if (typeof title === 'string' && title.trim()) set.title = title.trim().slice(0, 120);
      if (typeof tagline === 'string') set.tagline = tagline.trim().slice(0, 400);
      if (typeof category === 'string') set.category = category.trim().slice(0, 60);
      if (typeof level === 'string') set.level = level.trim().slice(0, 40);

      // Handle slug rename
      let finalSlug = originalSlug;
      if (typeof newSlug === 'string' && newSlug.trim() && newSlug.trim() !== originalSlug) {
        const s = newSlug.trim().toLowerCase();
        if (!SLUG_RE.test(s)) return err('Invalid slug format. Use lowercase letters, numbers and dashes.');
        if (RESERVED_SLUGS.has(s)) return err(`Slug "${s}" is reserved.`);
        // Check clash with existing courses (other than the original)
        const merged = await allCoursesMerged();
        if (merged.some((c) => c.slug === s && c.slug !== originalSlug)) return err('Another course already uses that slug.');
        finalSlug = s;
      }

      // Ensure a courses_published record exists (materialize static/AI to DB first).
      const existing = await db.collection('courses_published').findOne({ slug: originalSlug });
      const base = existing ? { ...existing } : { ...current };
      delete base._id;
      Object.assign(base, set);

      if (finalSlug !== originalSlug) {
        base.slug = finalSlug;
        // Remove old, insert new
        await db.collection('courses_published').deleteOne({ slug: originalSlug });
        await db.collection('courses_published').updateOne(
          { slug: finalSlug },
          { $set: base },
          { upsert: true }
        );
        // Alias: originalSlug -> finalSlug (transitively fold any prior aliases too)
        const priorAliases = await db.collection('course_slug_aliases').find({ to: originalSlug }).toArray();
        const bulk = [{ updateOne: { filter: { from: originalSlug }, update: { $set: { from: originalSlug, to: finalSlug, createdAt: new Date() } }, upsert: true } }];
        for (const pa of priorAliases) bulk.push({ updateOne: { filter: { from: pa.from }, update: { $set: { to: finalSlug, createdAt: new Date() } } } });
        await db.collection('course_slug_aliases').bulkWrite(bulk);
        // Migrate progress + reviews
        await Promise.all([
          db.collection('progress').updateMany({ courseSlug: originalSlug }, { $set: { courseSlug: finalSlug } }),
          db.collection('reviews').updateMany({ courseSlug: originalSlug }, { $set: { courseSlug: finalSlug } }),
          db.collection('comments').updateMany({ courseSlug: originalSlug }, { $set: { courseSlug: finalSlug } }),
        ]);
      } else {
        await db.collection('courses_published').updateOne(
          { slug: originalSlug },
          { $set: base },
          { upsert: true }
        );
      }

      const saved = await db.collection('courses_published').findOne({ slug: finalSlug });
      if (saved) delete saved._id;
      return json({ ok: true, course: saved, renamed: finalSlug !== originalSlug ? { from: originalSlug, to: finalSlug } : null });
    }

    // Pages CMS — one-click seed of legal/info pages.
    // Idempotent: creates missing pages, updates metadata by default, preserves
    // published state + user-edited content. Pass { force: true } to overwrite content.
    // Pass { slug: '<one-of-the-6>' } to restrict the operation to a single page.
    if (seg === 'admin/seed-legal-pages') {
      const force = !!(body && body.force);
      const onlySlug = typeof body?.slug === 'string' ? body.slug.trim().toLowerCase() : '';
      const db = await getDb();
      const now = new Date();
      const results = [];
      const summary = { created: 0, updatedMetadata: 0, updatedContent: 0, preserved: 0 };
      const legal = getLegalPages();
      const scoped = onlySlug ? legal.filter((p) => p.slug === onlySlug) : legal;
      if (onlySlug && scoped.length === 0) {
        return err(`Unknown built-in slug: ${onlySlug}. Valid: ${legal.map((p) => p.slug).join(', ')}`, 400);
      }
      for (const p of scoped) {
        try {
          const existing = await db.collection('pages').findOne({ slug: p.slug });
          if (!existing) {
            const doc = {
              id: uuid(),
              title: p.title,
              slug: p.slug,
              seoTitle: p.seoTitle || '',
              seoDescription: p.seoDescription || '',
              contentHtml: sanitizeContentHtml(p.contentHtml),
              published: true,
              createdAt: now,
              updatedAt: now,
            };
            await db.collection('pages').insertOne({ ...doc });
            summary.created += 1;
            results.push({ slug: p.slug, action: 'created', published: true });
            continue;
          }
          if (force) {
            // Overwrite content + metadata. Preserve published state + id.
            await db.collection('pages').updateOne(
              { slug: p.slug },
              {
                $set: {
                  title: p.title,
                  seoTitle: p.seoTitle || '',
                  seoDescription: p.seoDescription || '',
                  contentHtml: sanitizeContentHtml(p.contentHtml),
                  updatedAt: now,
                },
              }
            );
            summary.updatedContent += 1;
            results.push({ slug: p.slug, action: 'updated-content', published: !!existing.published });
            continue;
          }
          // Default (non-force): only refresh metadata (title + SEO) if changed. Preserve content + published.
          const metaSet = {};
          if (existing.title !== p.title) metaSet.title = p.title;
          if ((existing.seoTitle || '') !== (p.seoTitle || '')) metaSet.seoTitle = p.seoTitle || '';
          if ((existing.seoDescription || '') !== (p.seoDescription || '')) metaSet.seoDescription = p.seoDescription || '';
          if (Object.keys(metaSet).length > 0) {
            metaSet.updatedAt = now;
            await db.collection('pages').updateOne({ slug: p.slug }, { $set: metaSet });
            summary.updatedMetadata += 1;
            results.push({ slug: p.slug, action: 'updated-metadata', published: !!existing.published });
          } else {
            summary.preserved += 1;
            results.push({ slug: p.slug, action: 'preserved', published: !!existing.published });
          }
        } catch (e) {
          console.error('seed-legal-pages error for slug', p.slug, e);
          results.push({ slug: p.slug, action: 'error', error: e.message || 'failed' });
        }
      }
      return json({ ok: true, force, summary, results });
    }

    // Pages CMS — create
    if (seg === 'admin/pages') {
      const { title, slug: rawSlug, seoTitle, seoDescription, contentHtml, published } = body || {};
      if (!title?.trim() || !rawSlug?.trim()) return err('title and slug are required');
      const slug = String(rawSlug).trim().toLowerCase();
      if (!SLUG_RE.test(slug)) return err('Invalid slug. Use lowercase letters, numbers and dashes.');
      if (RESERVED_PAGE_SLUGS.has(slug)) return err(`Slug "${slug}" is reserved.`);
      const db = await getDb();
      const clash = await db.collection('pages').findOne({ slug });
      if (clash) return err('A page with that slug already exists.');
      const clashesCourse = (await allCoursesMerged()).some((c) => c.slug === slug);
      if (clashesCourse) return err('That slug is already used by a course.');
      const doc = {
        id: uuid(),
        title: title.trim().slice(0, 200),
        slug,
        seoTitle: (seoTitle || '').trim().slice(0, 200),
        seoDescription: (seoDescription || '').trim().slice(0, 400),
        contentHtml: sanitizeContentHtml(contentHtml || ''),
        published: !!published,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await db.collection('pages').insertOne({ ...doc });
      return json({ ok: true, page: doc });
    }

    // AI generation endpoints removed. Kept path to return a clean 410.
    if (seg === 'admin/generate-course' || seg === 'admin/generate-lesson' || seg === 'admin/generate' ||
        (path[0] === 'admin' && path[1] === 'drafts' && (path[3] === 'retry' || path[3] === 'publish' || path[3] === 'unpublish'))) {
      return err('AI generation is disabled', 410);
    }

    return err('Not found', 404);
  } catch (e) {
    if (e && e.status && e.status >= 400 && e.status < 500) {
      return err(e.message || 'Bad request', e.status);
    }
    // Env-misconfig errors from makeUserSessionToken / makeSessionToken
    if (e && typeof e.message === 'string' && /must be a strong/i.test(e.message)) {
      console.error('[POST] Session-secret misconfiguration:', e.message);
      console.error('[POST] Env check:', diagnoseAuthEnv());
      return NextResponse.json({
        error: 'Server is not configured. Contact the site owner.',
        hint: diagnoseAuthEnv(),
      }, { status: 503 });
    }
    console.error('POST error', seg, e);
    return err('Server error', 500);
  }
}
