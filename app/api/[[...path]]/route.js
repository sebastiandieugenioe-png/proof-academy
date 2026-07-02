import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { COURSES, getCourse, getLesson } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { getMedia } from '@/lib/media';
import { schedule } from '@/lib/sm2';
import { checkPassword, isAdminEmail, makeSessionToken, getAdminSessionFromRequest, ADMIN_COOKIE } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

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
async function findCourseMerged(slug) {
  const staticC = getCourse(slug);
  if (staticC) return staticC;
  const ai = AI_COURSES.find((c) => c.slug === slug);
  if (ai) {
    // DB override wins if present
    try {
      const db = await getDb();
      const p = await db.collection('courses_published').findOne({ slug });
      if (p) { delete p._id; return p; }
    } catch {}
    return ai;
  }
  try {
    const db = await getDb();
    const p = await db.collection('courses_published').findOne({ slug });
    if (p) { delete p._id; return p; }
  } catch (e) { console.error('findCourseMerged DB error', e); }
  return null;
}
async function findLessonMerged(courseSlug, lessonSlug) {
  const staticData = getLesson(courseSlug, lessonSlug);
  if (staticData) return staticData;
  const c = await findCourseMerged(courseSlug);
  if (!c) return null;
  const idx = c.lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return null;
  const lesson = c.lessons[idx];
  const next = c.lessons[idx + 1] || null;
  const prev = c.lessons[idx - 1] || null;
  return { course: { slug: c.slug, title: c.title, accent: c.accent }, lesson, next, prev, index: idx, total: c.lessons.length };
}

export async function GET(request, { params }) {
  const { path = [] } = await params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || request.headers.get('x-user-id');
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
      return json(merged.map(({ slug, title, tagline, level, accent, icon, lessons }) => ({
        slug, title, tagline, level, accent, icon,
        lessonCount: lessons.length,
        lessons: lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes })),
      })));
    }

    if (path[0] === 'courses' && path[1]) {
      const c = await findCourseMerged(path[1]);
      if (!c) return err('Course not found', 404);
      return json({
        slug: c.slug, title: c.title, tagline: c.tagline, level: c.level, accent: c.accent, icon: c.icon,
        lessons: c.lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes, objectives: l.objectives })),
      });
    }

    if (path[0] === 'lessons' && path[1] && path[2]) {
      const data = await findLessonMerged(path[1], path[2]);
      if (!data) return err('Lesson not found', 404);
      // media: prefer AI lesson.sources+imageSearch mapped to media shape, else static getMedia
      let media = getMedia(path[2]);
      if ((!media || !media.image) && data.lesson) {
        media = {
          image: data.lesson.image || null,
          imageAlt: data.lesson.imagePrompt || data.lesson.title,
          imageCredit: data.lesson.imageCredit || 'AI-suggested',
          sources: data.lesson.sources || [],
        };
      }
      return json({ ...data, media });
    }

    // User-scoped
    if (seg === 'me') {
      if (!userId) return err('Not authenticated', 401);
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return err('User not found', 404);
      delete user._id;
      user.isAdmin = isAdminEmail(user.email);
      return json(user);
    }

    if (seg === 'progress') {
      if (!userId) return err('Not authenticated', 401);
      const db = await getDb();
      const rows = await db.collection('progress').find({ userId }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (seg === 'stats') {
      if (!userId) return err('Not authenticated', 401);
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
      if (!userId) return err('Not authenticated', 401);
      const db = await getDb();
      const now = new Date();
      const rows = await db.collection('reviews').find({ userId, dueAt: { $lte: now } }).sort({ dueAt: 1 }).limit(50).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (path[0] === 'comments' && path[1] && path[2]) {
      const db = await getDb();
      const rows = await db.collection('comments').find({ courseSlug: path[1], lessonSlug: path[2], approved: { $ne: false } }).sort({ createdAt: -1 }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (seg === 'admin/comments') {
      const db = await getDb();
      const rows = await db.collection('comments').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (seg === 'admin/users') {
      const db = await getDb();
      const all = await db.collection('users').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      const total = await db.collection('users').countDocuments({});
      const newsletter = await db.collection('users').countDocuments({ newsletter: true });
      const weekAgo = new Date(Date.now() - 7 * 86400e3);
      const last7d = await db.collection('users').countDocuments({ createdAt: { $gte: weekAgo } });
      const activeIds = await db.collection('progress').distinct('userId');
      return json({
        total, newsletter, last7d, active: activeIds.length,
        users: all.map((u) => ({ id: u.id, name: u.name, email: u.email, newsletter: !!u.newsletter, createdAt: u.createdAt })),
      });
    }

    if (seg === 'admin/newsletter') {
      const db = await getDb();
      const rows = await db.collection('newsletter').find({}).sort({ createdAt: -1 }).limit(2000).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    // Removed: /admin/drafts, /admin/generations, /admin/templates — AI generation disabled.
    if (seg === 'admin/drafts' || seg === 'admin/generations' || seg === 'admin/templates' || (path[0] === 'admin' && path[1] === 'drafts')) {
      return err('AI generation is disabled', 410);
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('GET error', seg, e);
    return err(e.message || 'Server error', 500);
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
    if (path[0] === 'admin' && path[1] === 'comments' && path[2]) {
      const db = await getDb();
      const set = {};
      if (typeof body.approved === 'boolean') set.approved = body.approved;
      if (typeof body.text === 'string') set.text = body.text.slice(0, 800);
      await db.collection('comments').updateOne({ id: path[2] }, { $set: set });
      const row = await db.collection('comments').findOne({ id: path[2] });
      if (row) delete row._id;
      return NextResponse.json({ ok: true, comment: row });
    }
    // Legacy draft edits (AI) - disabled
    if (path[0] === 'admin' && path[1] === 'drafts') {
      return NextResponse.json({ error: 'AI generation is disabled' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('PATCH error', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;

  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    if (path[0] === 'admin' && path[1] === 'comments' && path[2]) {
      const db = await getDb();
      await db.collection('comments').deleteOne({ id: path[2] });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === 'admin' && path[1] === 'drafts') {
      return NextResponse.json({ error: 'AI generation is disabled' }, { status: 410 });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('DELETE error', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  const { path = [] } = await params;
  const seg = path.join('/');
  const body = await request.json().catch(() => ({}));

  // Public admin-auth endpoints (do not need the cookie yet)
  if (seg === 'admin-auth') {
    const { email, password } = body || {};
    if (!isAdminEmail(email)) {
      // Deliberately generic error to avoid leaking whether an email is on the allowlist
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    if (!checkPassword(password)) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }
    const token = makeSessionToken(email);
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...ADMIN_COOKIE.options, name: ADMIN_COOKIE.name, value: token });
    return res;
  }
  if (seg === 'admin-auth/logout') {
    const res = NextResponse.json({ ok: true });
    res.cookies.set({ ...ADMIN_COOKIE.options, name: ADMIN_COOKIE.name, value: '', maxAge: 0 });
    return res;
  }

  // All other admin POSTs require the cookie
  if (path[0] === 'admin') {
    const s = getAdminSessionFromRequest(request);
    if (!s) return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 });
  }

  try {
    if (seg === 'auth') {
      const email = (body.email || '').trim().toLowerCase();
      const name = (body.name || '').trim() || email.split('@')[0];
      if (!email || !email.includes('@')) return err('Valid email required');
      const db = await getDb();
      let user = await db.collection('users').findOne({ email });
      if (!user) {
        user = {
          id: uuid(), email, name, provider: 'email',
          newsletter: !!body.newsletter,
          createdAt: new Date(), updatedAt: new Date(),
        };
        await db.collection('users').insertOne({ ...user });
        if (user.newsletter) {
          await db.collection('newsletter').insertOne({ id: uuid(), email, source: 'signup', createdAt: new Date() });
        }
      } else if (body.newsletter && !user.newsletter) {
        await db.collection('users').updateOne({ id: user.id }, { $set: { newsletter: true, updatedAt: new Date() } });
        await db.collection('newsletter').insertOne({ id: uuid(), email, source: 'signup', createdAt: new Date() });
        user.newsletter = true;
      }
      delete user._id;
      return json({ user });
    }

    if (seg === 'me/update') {
      const { userId, name, newsletter } = body;
      if (!userId) return err('Not authenticated', 401);
      const db = await getDb();
      const set = { updatedAt: new Date() };
      if (typeof name === 'string') set.name = name;
      if (typeof newsletter === 'boolean') set.newsletter = newsletter;
      await db.collection('users').updateOne({ id: userId }, { $set: set });
      const user = await db.collection('users').findOne({ id: userId });
      delete user._id;
      return json({ user });
    }

    if (seg === 'progress') {
      const { userId, courseSlug, lessonSlug, completed, step, minutesSpent, quizScore } = body;
      if (!userId || !courseSlug || !lessonSlug) return err('Missing fields');
      const db = await getDb();
      const existing = await db.collection('progress').findOne({ userId, courseSlug, lessonSlug });
      const doc = {
        id: existing?.id || uuid(),
        userId, courseSlug, lessonSlug,
        step: step ?? existing?.step ?? 'objectives',
        completed: completed ?? existing?.completed ?? false,
        minutesSpent: (existing?.minutesSpent || 0) + (minutesSpent || 0),
        quizScore: quizScore ?? existing?.quizScore ?? null,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await db.collection('progress').updateOne(
        { userId, courseSlug, lessonSlug },
        { $set: doc },
        { upsert: true }
      );

      // seed reviews when a lesson is completed and reviews don't exist yet
      if (completed) {
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
      const { userId, reviewId, grade } = body;
      if (!userId || !reviewId || !['again', 'hard', 'easy'].includes(grade)) return err('Missing fields');
      const db = await getDb();
      const card = await db.collection('reviews').findOne({ id: reviewId, userId });
      if (!card) return err('Card not found', 404);
      const upd = schedule(card, grade);
      await db.collection('reviews').updateOne({ id: reviewId }, { $set: upd });
      return json({ ok: true, card: { ...card, ...upd, _id: undefined } });
    }

    if (seg === 'comments') {
      const { userId, courseSlug, lessonSlug, text } = body;
      if (!userId || !courseSlug || !lessonSlug || !text?.trim()) return err('Missing fields');
      const db = await getDb();
      const user = await db.collection('users').findOne({ id: userId });
      if (!user) return err('Not authenticated', 401);
      const doc = {
        id: uuid(), userId, userName: user.name, courseSlug, lessonSlug,
        text: text.trim().slice(0, 800),
        approved: true, // manual moderation off by default; toggle in admin later
        createdAt: new Date(),
      };
      await db.collection('comments').insertOne(doc);
      return json({ ok: true, comment: { ...doc, _id: undefined } });
    }

    if (seg === 'newsletter') {
      const email = (body.email || '').trim().toLowerCase();
      if (!email.includes('@')) return err('Valid email required');
      const db = await getDb();
      await db.collection('newsletter').updateOne(
        { email },
        { $setOnInsert: { id: uuid(), email, source: body.source || 'landing', createdAt: new Date() } },
        { upsert: true }
      );
      return json({ ok: true });
    }

    if (seg === 'admin/course-override') {
      const { course } = body;
      if (!course?.slug) return err('course.slug required');
      const db = await getDb();
      await db.collection('courses_published').updateOne(
        { slug: course.slug },
        { $set: { ...course, updatedAt: new Date() } },
        { upsert: true }
      );
      const saved = await db.collection('courses_published').findOne({ slug: course.slug });
      if (saved) delete saved._id;
      return json({ ok: true, course: saved });
    }

    if (seg === 'admin/course-publish') {
      const { slug, published } = body;
      if (!slug) return err('slug required');
      const db = await getDb();
      if (published === false) {
        await db.collection('courses_published').updateOne({ slug }, { $set: { hidden: true, updatedAt: new Date() } });
      } else {
        await db.collection('courses_published').updateOne({ slug }, { $set: { hidden: false, updatedAt: new Date() } });
      }
      return json({ ok: true });
    }

    // AI generation endpoints removed. Kept path to return a clean 410.
    if (seg === 'admin/generate-course' || seg === 'admin/generate-lesson' || seg === 'admin/generate' ||
        (path[0] === 'admin' && path[1] === 'drafts' && (path[3] === 'retry' || path[3] === 'publish' || path[3] === 'unpublish'))) {
      return err('AI generation is disabled', 410);
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('POST error', seg, e);
    return err(e.message || 'Server error', 500);
  }
}
