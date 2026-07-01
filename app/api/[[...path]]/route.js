import { NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { COURSES, getCourse, getLesson } from '@/lib/content';
import { schedule } from '@/lib/sm2';

const json = (data, init = {}) => NextResponse.json(data, init);
const err = (msg, code = 400) => NextResponse.json({ error: msg }, { status: code });

export async function GET(request, { params }) {
  const { path = [] } = await params;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId') || request.headers.get('x-user-id');
  const seg = path.join('/');

  try {
    // Public
    if (seg === '' || seg === 'health') return json({ ok: true, service: 'online-spirits-club' });

    if (seg === 'courses') {
      return json(COURSES.map(({ slug, title, tagline, level, accent, icon, lessons }) => ({
        slug, title, tagline, level, accent, icon,
        lessonCount: lessons.length,
        lessons: lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes })),
      })));
    }

    if (path[0] === 'courses' && path[1]) {
      const c = getCourse(path[1]);
      if (!c) return err('Course not found', 404);
      return json({
        slug: c.slug, title: c.title, tagline: c.tagline, level: c.level, accent: c.accent, icon: c.icon,
        lessons: c.lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes, objectives: l.objectives })),
      });
    }

    if (path[0] === 'lessons' && path[1] && path[2]) {
      const data = getLesson(path[1], path[2]);
      if (!data) return err('Lesson not found', 404);
      return json(data);
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
