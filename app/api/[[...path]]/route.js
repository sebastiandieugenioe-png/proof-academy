import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { COURSES, getCourse, getLesson } from '@/lib/content';
import { getMedia } from '@/lib/media';
import { schedule } from '@/lib/sm2';
import { startCourseGeneration, generateLesson, TEMPLATES } from '@/lib/course-generator';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

// Merge static COURSES with published AI-generated courses.
async function loadPublishedCourses() {
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({}).toArray();
    return pubs.map((p) => ({ ...p, _id: undefined }));
  } catch { return []; }
}
async function allCoursesMerged() {
  const pub = await loadPublishedCourses();
  const staticMap = new Map(COURSES.map((c) => [c.slug, c]));
  for (const p of pub) staticMap.set(p.slug, p); // AI-published overrides same slug
  return Array.from(staticMap.values());
}
async function findCourseMerged(slug) {
  const staticC = getCourse(slug);
  if (staticC) return staticC;
  const db = await getDb();
  const p = await db.collection('courses_published').findOne({ slug });
  if (p) { delete p._id; return p; }
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

    if (seg === 'admin/templates') {
      return json(TEMPLATES);
    }

    if (seg === 'admin/drafts') {
      const db = await getDb();
      const rows = await db.collection('drafts').find({}).sort({ createdAt: -1 }).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
    }

    if (path[0] === 'admin' && path[1] === 'drafts' && path[2]) {
      const db = await getDb();
      const row = await db.collection('drafts').findOne({ id: path[2] });
      if (!row) return err('Draft not found', 404);
      delete row._id;
      return json(row);
    }

    if (seg === 'admin/generations') {
      const db = await getDb();
      const rows = await db.collection('generations').find({}).sort({ createdAt: -1 }).limit(50).toArray();
      return json(rows.map((r) => ({ ...r, _id: undefined })));
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
  try {
    if (path[0] === 'admin' && path[1] === 'drafts' && path[2]) {
      const db = await getDb();
      const set = { updatedAt: new Date() };
      if (body.course) set.course = body.course;
      if (body.notes !== undefined) set.notes = body.notes;
      await db.collection('drafts').updateOne({ id: path[2] }, { $set: set });
      const draft = await db.collection('drafts').findOne({ id: path[2] });
      if (draft) delete draft._id;
      // If the draft is already published, sync updates to courses_published
      if (draft && draft.status === 'published' && draft.course) {
        await db.collection('courses_published').updateOne(
          { slug: draft.course.slug },
          { $set: { ...draft.course, sourceDraftId: draft.id, updatedAt: new Date() } },
          { upsert: true }
        );
      }
      return NextResponse.json({ ok: true, draft });
    }
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (e) {
    console.error('PATCH error', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { path = [] } = await params;
  try {
    if (path[0] === 'admin' && path[1] === 'drafts' && path[2]) {
      const db = await getDb();
      const draft = await db.collection('drafts').findOne({ id: path[2] });
      if (draft?.course?.slug) await db.collection('courses_published').deleteOne({ slug: draft.course.slug });
      await db.collection('drafts').deleteOne({ id: path[2] });
      return NextResponse.json({ ok: true });
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

    if (seg === 'admin/generate-course') {
      const { category, level, courseTitle, tagline, accent, icon, lessonTitles, notes } = body;
      if (!courseTitle || !Array.isArray(lessonTitles) || lessonTitles.length === 0) return err('courseTitle and lessonTitles[] required');
      if (!process.env.EMERGENT_LLM_KEY) return err('EMERGENT_LLM_KEY not configured on server', 500);
      const draft = await startCourseGeneration({ category, level, courseTitle, tagline, accent, icon, lessonTitles, notes });
      return json({ ok: true, draft });
    }

    if (seg === 'admin/generate-lesson') {
      const { draftId, lessonTitle, notes } = body;
      if (!draftId || !lessonTitle) return err('draftId and lessonTitle required');
      const db = await getDb();
      const draft = await db.collection('drafts').findOne({ id: draftId });
      if (!draft) return err('Draft not found', 404);
      const lesson = await generateLesson({
        courseTitle: draft.course.title,
        courseCategory: draft.course.category,
        level: draft.course.level,
        lessonTitle,
        lessonNumber: (draft.course.lessons?.length || 0) + 1,
        totalLessons: (draft.course.lessons?.length || 0) + 1,
        notes: notes || draft.notes,
      });
      await db.collection('drafts').updateOne({ id: draftId }, { $push: { 'course.lessons': lesson }, $set: { updatedAt: new Date() } });
      return json({ ok: true, lesson });
    }

    if (path[0] === 'admin' && path[1] === 'drafts' && path[2] && path[3] === 'retry') {
      const db = await getDb();
      const draft = await db.collection('drafts').findOne({ id: path[2] });
      if (!draft) return err('Draft not found', 404);
      // Determine which lessons still need generating
      const doneTitles = new Set((draft.course.lessons || []).map((l) => (l.title || '').toLowerCase()));
      const original = body.lessonTitles || (draft.originalLessonTitles || (draft.course.lessons || []).map((l) => l.title));
      const remaining = original.filter((t) => !doneTitles.has(t.toLowerCase()));
      if (remaining.length === 0) {
        await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'ready', error: null, updatedAt: new Date() } });
        return json({ ok: true, message: 'Nothing to retry', status: 'ready' });
      }
      await db.collection('drafts').updateOne(
        { id: draft.id },
        { $set: { status: 'generating', error: null, 'progress.total': (draft.course.lessons?.length || 0) + remaining.length, updatedAt: new Date() } }
      );
      // Fire and forget
      (async () => {
        try {
          for (const lt of remaining) {
            const lesson = await generateLesson({
              courseTitle: draft.course.title,
              courseCategory: draft.course.category,
              level: draft.course.level,
              lessonTitle: lt,
              lessonNumber: (draft.course.lessons?.length || 0) + 1,
              totalLessons: (draft.course.lessons?.length || 0) + remaining.length,
              notes: draft.notes,
            });
            await db.collection('drafts').updateOne(
              { id: draft.id },
              { $push: { 'course.lessons': lesson }, $inc: { 'progress.done': 1 }, $set: { updatedAt: new Date() } }
            );
          }
          await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'ready', updatedAt: new Date() } });
        } catch (e) {
          await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'error', error: e.message, updatedAt: new Date() } });
        }
      })();
      return json({ ok: true, remaining });
    }

    if (path[0] === 'admin' && path[1] === 'drafts' && path[2] && path[3] === 'publish') {
      const db = await getDb();
      const draft = await db.collection('drafts').findOne({ id: path[2] });
      if (!draft) return err('Draft not found', 404);
      if (draft.status !== 'ready') return err('Draft not ready for publish (status=' + draft.status + ')');
      // Upsert into courses_published
      await db.collection('courses_published').updateOne(
        { slug: draft.course.slug },
        { $set: { ...draft.course, sourceDraftId: draft.id, publishedAt: new Date() } },
        { upsert: true }
      );
      await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'published', publishedAt: new Date() } });
      return json({ ok: true, slug: draft.course.slug });
    }

    if (path[0] === 'admin' && path[1] === 'drafts' && path[2] && path[3] === 'unpublish') {
      const db = await getDb();
      const draft = await db.collection('drafts').findOne({ id: path[2] });
      if (!draft) return err('Draft not found', 404);
      await db.collection('courses_published').deleteOne({ slug: draft.course.slug });
      await db.collection('drafts').updateOne({ id: draft.id }, { $set: { status: 'ready', unpublishedAt: new Date() } });
      return json({ ok: true });
    }

    if (seg === 'admin/generate') {
      // Placeholder workflow \u2014 saves a request record; future: call LLM to produce lesson JSON
      const { category, level, notes } = body;
      if (!category || !level) return err('category and level required');
      const db = await getDb();
      const doc = {
        id: uuid(), category, level, notes: notes || '',
        status: 'queued',
        createdAt: new Date(),
        // future fields: objectives, theory, flashcards, quiz, sources, imagePrompts
      };
      await db.collection('generations').insertOne(doc);
      return json({ ok: true, generation: { ...doc, _id: undefined } });
    }

    return err('Not found', 404);
  } catch (e) {
    console.error('POST error', seg, e);
    return err(e.message || 'Server error', 500);
  }
}
