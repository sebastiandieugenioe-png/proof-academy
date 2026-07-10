// Admin-only endpoints: overview, analytics, users list/detail/export, version, drafts (410).
// Also user-scoped verification support workflows.
import { v4 as uuid } from 'uuid';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongo';
import { isSafeId } from '@/lib/validators';
import { mailerStatus, sendTransactionalEmail, templates as emailTemplates } from '@/lib/mailer';
import { issueToken } from '@/lib/auth-tokens';
import {
  json, err,
  sanitizeProfileField, sanitizeRole, newUnsubToken,
} from '../utils';
import { requireAdmin } from '../admin-guard';
import { eraseUserData } from '../erasure';

export async function handle(ctx) {
  const { method, seg, path, request, body, url } = ctx;

  // -------- GET /api/admin/version --------
  if (method === 'GET' && seg === 'admin/version') {
    const g = requireAdmin(request); if (g.response) return g.response;
    return json({
      version: process.env.APP_VERSION || 'dev',
      builtAt: process.env.BUILT_AT || null,
      env: process.env.NODE_ENV || 'development',
      node: process.version,
    });
  }

  // -------- GET /api/admin/overview --------
  if (method === 'GET' && seg === 'admin/overview') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const now = new Date();
    const d7 = new Date(now - 7 * 86400e3);
    const d30 = new Date(now - 30 * 86400e3);
    const [
      total, last7d, last30d, newsletter, lessonsCompleted, cardsReviewed,
      activeIds, activeIds7d, avgQuizAgg, courseAgg,
      deletionsTotal, deletionsSelf, deletionsAdmin, deletionsLast30d,
    ] = await Promise.all([
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

  // -------- GET /api/admin/analytics --------
  if (method === 'GET' && seg === 'admin/analytics') {
    const g = requireAdmin(request); if (g.response) return g.response;
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
      db.collection('users').aggregate([
        { $match: { country: { $ne: null, $exists: true } } },
        { $group: { _id: '$country', count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 30 },
      ]).toArray(),
      db.collection('users').aggregate([
        { $match: { city: { $ne: null, $exists: true } } },
        { $group: { _id: { city: '$city', country: '$country' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } }, { $limit: 30 },
      ]).toArray(),
      db.collection('users').aggregate([
        { $match: { role: { $ne: null, $exists: true } } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]).toArray(),
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

  // -------- GET /api/admin/users (list) --------
  if (method === 'GET' && seg === 'admin/users') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rawQ = (url.searchParams.get('q') || '').trim().toLowerCase().slice(0, 100);
    const escQ = rawQ.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const filter = escQ ? { $or: [
      { email: { $regex: escQ, $options: 'i' } },
      { name: { $regex: escQ, $options: 'i' } },
    ] } : {};
    const rows = await db.collection('users').find(filter).sort({ createdAt: -1 }).limit(500).toArray();
    const total = await db.collection('users').countDocuments(filter);
    return json({ total, users: rows.map((u) => ({ ...u, _id: undefined, passwordHash: undefined })) });
  }

  // -------- GET /api/admin/users/:id/export --------
  if (method === 'GET' && path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'export') {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('User not found', 404);
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: path[2] });
    if (!user) return err('User not found', 404);
    delete user._id;
    delete user.passwordHash;
    delete user.newsletterUnsubscribeToken;
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
    return new NextResponse(JSON.stringify(bundle, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="gdpr-export-${safeEmailStub}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  }

  // -------- GET /api/admin/users/:id --------
  if (method === 'GET' && path[0] === 'admin' && path[1] === 'users' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  // -------- GET /api/admin/newsletter --------
  if (method === 'GET' && seg === 'admin/newsletter') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rows = await db.collection('newsletter').find({}).sort({ createdAt: -1 }).limit(2000).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- PATCH /api/admin/users/:id --------
  if (method === 'PATCH' && path[0] === 'admin' && path[1] === 'users' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid user id', 400);
    const db = await getDb();
    const set = { updatedAt: new Date() };
    if (typeof body.name === 'string') set.name = body.name.trim().slice(0, 100);
    if (typeof body.email === 'string') set.email = body.email.trim().toLowerCase();
    // GDPR — Rectification (Art. 16): profile fields can be corrected by admin.
    if (typeof body.country === 'string') set.country = sanitizeProfileField(body.country, 60);
    if (typeof body.city === 'string') set.city = sanitizeProfileField(body.city, 80);
    if (typeof body.role === 'string') set.role = sanitizeRole(body.role);
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
    return json({ ok: true, user: u });
  }

  // -------- DELETE /api/admin/users/:id --------
  if (method === 'DELETE' && path[0] === 'admin' && path[1] === 'users' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid user id', 400);
    const db = await getDb();
    await eraseUserData(db, path[2], { method: 'admin', actorEmail: null });
    return json({ ok: true });
  }

  // -------- POST /api/admin/users/:id/mark-verified (support workflow) --------
  if (method === 'POST' && path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'mark-verified') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  // -------- POST /api/admin/users/:id/resend-verification (support workflow) --------
  if (method === 'POST' && path[0] === 'admin' && path[1] === 'users' && path[2] && path[3] === 'resend-verification') {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid user id', 400);
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: path[2] });
    if (!user) return err('User not found', 404);
    if (user.emailVerified) return err('This user is already verified.', 400);
    const { token } = await issueToken(db, { userId: user.id, purpose: 'verify_email' });
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    const urlLink = `${base}/verify-email?token=${encodeURIComponent(token)}`;
    const mail = await sendTransactionalEmail({
      to: user.email,
      ...emailTemplates.verification({ name: user.name, url: urlLink }),
    });
    return json({ ok: true, emailSent: !!mail?.ok, emailSkipped: !!mail?.skipped, error: mail?.message || null });
  }

  // -------- AI generation endpoints: all disabled --------
  const aiSegs = new Set(['admin/drafts', 'admin/generations', 'admin/templates',
    'admin/generate-course', 'admin/generate-lesson', 'admin/generate']);
  if ((method === 'GET' || method === 'PATCH' || method === 'DELETE' || method === 'POST') &&
      (aiSegs.has(seg) || (path[0] === 'admin' && path[1] === 'drafts'))) {
    // NOTE: even for admin/drafts sub-paths (retry/publish/unpublish) we return 410 unconditionally.
    return err('AI generation is disabled', 410);
  }

  return null;
}
