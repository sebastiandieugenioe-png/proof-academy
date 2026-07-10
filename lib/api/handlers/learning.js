// Progress, stats, reviews, study/next — the learning-engine endpoints.
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { getLesson } from '@/lib/content';
import { schedule } from '@/lib/sm2';
import { isSafeSlug, isSafeId } from '@/lib/validators';
import { json, err } from '../utils';
import { requireUser } from '../session';
import { findLessonMerged, findCourseMerged } from '../data';

export async function handle(ctx) {
  const { method, seg, request, body, url } = ctx;

  // -------- GET /api/progress --------
  if (method === 'GET' && seg === 'progress') {
    const userId = requireUser(request);
    const db = await getDb();
    const rows = await db.collection('progress').find({ userId }).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- GET /api/stats --------
  if (method === 'GET' && seg === 'stats') {
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

  // -------- GET /api/reviews/due --------
  if (method === 'GET' && seg === 'reviews/due') {
    const userId = requireUser(request);
    const db = await getDb();
    const now = new Date();
    const rows = await db.collection('reviews').find({ userId, dueAt: { $lte: now } }).sort({ dueAt: 1 }).limit(50).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- GET /api/study/next (Continuous Study) --------
  //   1) due SR cards         -> source='due'
  //   2) weak cards (ease<2)  -> source='weak'
  //   3) recently learned <7d -> source='recent'
  //   4) random learned card  -> source='random'
  //   5) unseeded from progressed lessons -> source='new'  (opt-in via ?includeNew=1)
  if (method === 'GET' && seg === 'study/next') {
    const userId = requireUser(request);
    const db = await getDb();
    const excludeIds = (url.searchParams.get('exclude') || '')
      .split(',').map((s) => s.trim()).filter(Boolean).filter(isSafeId).slice(0, 500);
    const includeNew = url.searchParams.get('includeNew') === '1' || url.searchParams.get('includeNew') === 'true';
    const now = new Date();
    const d7 = new Date(now - 7 * 86400e3);
    const baseFilter = { userId, ...(excludeIds.length ? { id: { $nin: excludeIds } } : {}) };

    const [dueCount, weakCount, totalCount] = await Promise.all([
      db.collection('reviews').countDocuments({ userId, dueAt: { $lte: now } }),
      db.collection('reviews').countDocuments({ userId, ease: { $lt: 2.0 }, reps: { $gt: 0 } }),
      db.collection('reviews').countDocuments({ userId }),
    ]);
    const remainingDue = Math.max(0, dueCount - excludeIds.filter(Boolean).length);
    const stats = { due: dueCount, weak: weakCount, total: totalCount, remainingDue };

    let card = await db.collection('reviews').findOne({ ...baseFilter, dueAt: { $lte: now } }, { sort: { dueAt: 1 } });
    let source = card ? 'due' : null;

    if (!card) {
      card = await db.collection('reviews').findOne({ ...baseFilter, ease: { $lt: 2.0 }, reps: { $gt: 0 } }, { sort: { ease: 1 } });
      if (card) source = 'weak';
    }
    if (!card) {
      card = await db.collection('reviews').findOne({ ...baseFilter, lastReviewedAt: { $gte: d7 } }, { sort: { lastReviewedAt: -1 } });
      if (card) source = 'recent';
    }
    if (!card) {
      const anyCount = await db.collection('reviews').countDocuments(baseFilter);
      if (anyCount > 0) {
        const skip = Math.floor(Math.random() * anyCount);
        const arr = await db.collection('reviews').find(baseFilter).skip(skip).limit(1).toArray();
        card = arr[0] || null;
        if (card) source = 'random';
      }
    }
    if (!card && includeNew) {
      const progressed = await db.collection('progress').find({ userId, completed: true }).toArray();
      for (const p of progressed) {
        const lp = await findLessonMerged(p.courseSlug, p.lessonSlug);
        if (!lp?.lesson?.flashcards) continue;
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
    const courseMerged = await findCourseMerged(card.courseSlug);
    const courseTitle = courseMerged?.title || card.courseSlug;
    const lessonTitle = courseMerged?.lessons?.find((l) => l.slug === card.lessonSlug)?.title || card.lessonSlug;
    return json({ done: false, card: { ...card, courseTitle, lessonTitle }, source, stats });
  }

  // -------- POST /api/progress --------
  if (method === 'POST' && seg === 'progress') {
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

  // -------- POST /api/reviews/answer --------
  if (method === 'POST' && seg === 'reviews/answer') {
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

  return null;
}
