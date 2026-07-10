// Feedback: public submission + admin management (list, stats, patch, delete, bulk-delete).
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import { getDb } from '@/lib/mongo';
import { isSafeId } from '@/lib/validators';
import { rateLimit, ipFromRequest } from '@/lib/rate-limit';
import { getUserIdFromRequest } from '@/lib/user-session';
import { NextResponse } from 'next/server';
import { json, err, tooMany } from '../utils';
import { requireAdmin } from '../admin-guard';

export async function handle(ctx) {
  const { method, seg, path, request, body } = ctx;

  // -------- POST /api/feedback (public/authenticated) --------
  if (method === 'POST' && seg === 'feedback') {
    try {
      const ip = ipFromRequest(request);
      const rl = rateLimit(`feedback:${ip}`, { max: 10, windowMs: 10 * 60 * 1000 });
      if (!rl.allowed) return tooMany(rl.retryAfterMs);

      const ALLOWED_TYPES = ['suggestion', 'content_correction', 'bug', 'ux_issue', 'opinion', 'other'];
      const ALLOWED_PAGE_TYPES = ['dashboard', 'learning_path', 'module', 'lesson', 'study', 'profile', 'journal', 'other'];

      const type = String(body?.type || '').toLowerCase();
      if (!ALLOWED_TYPES.includes(type)) return NextResponse.json({ error: 'Invalid feedback type.' }, { status: 400 });

      const rawMessage = String(body?.message || '').replace(/<[^>]*>/g, '').trim();
      if (rawMessage.length < 10) return NextResponse.json({ error: 'Please tell us a bit more (at least 10 characters).' }, { status: 400 });
      if (rawMessage.length > 2000) return NextResponse.json({ error: 'Please keep it under 2000 characters.' }, { status: 400 });

      // Auth-optional. Session is best-effort.
      let userId = null, userEmail = null;
      try {
        const uid = await getUserIdFromRequest(request);
        if (uid) {
          userId = uid;
          const db2 = await getDb();
          const u = await db2.collection('users').findOne({ id: uid }, { projection: { email: 1 } });
          userEmail = u?.email || null;
        }
      } catch (_) { /* anonymous */ }

      const pageType = ALLOWED_PAGE_TYPES.includes(String(body?.pageType || '').toLowerCase())
        ? String(body.pageType).toLowerCase()
        : 'other';

      const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

      const doc = {
        id: uuid(),
        userId,
        userEmail,
        type,
        message: rawMessage,
        status: 'new',
        priority: type === 'bug' ? 'medium' : 'low',
        pageType,
        url: clip(body?.url, 500),
        courseId: clip(body?.courseId, 100) || null,
        courseTitle: clip(body?.courseTitle, 200) || null,
        moduleId: clip(body?.moduleId, 100) || null,
        moduleTitle: clip(body?.moduleTitle, 200) || null,
        lessonId: clip(body?.lessonId, 100) || null,
        lessonTitle: clip(body?.lessonTitle, 200) || null,
        screenshotUrl: (typeof body?.screenshotUrl === 'string' && /^https?:\/\//.test(body.screenshotUrl)) ? body.screenshotUrl.slice(0, 500) : null,
        userAgent: clip(request.headers.get('user-agent') || '', 500),
        viewport: clip(body?.viewport, 30),
        ipHash: ip ? crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16) : null,
        adminNotes: '',
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const db = await getDb();
      await db.collection('feedback').insertOne(doc);

      console.log(`[feedback] created id=${doc.id} type=${type} pageType=${pageType} userId=${userId || 'anon'}`);

      return NextResponse.json({ ok: true, id: doc.id });
    } catch (e) {
      console.error('[feedback] error:', e);
      return NextResponse.json({ error: 'Could not send feedback. Please try again.' }, { status: 500 });
    }
  }

  // -------- GET /api/admin/feedback --------
  if (method === 'GET' && seg === 'admin/feedback') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rows = await db.collection('feedback').find({}).sort({ createdAt: -1 }).limit(2000).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- GET /api/admin/feedback/stats --------
  if (method === 'GET' && seg === 'admin/feedback/stats') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const all = await db.collection('feedback').find({}, {
      projection: { type: 1, status: 1, priority: 1, courseTitle: 1, lessonTitle: 1, createdAt: 1 }
    }).toArray();
    const by = (arr, key) => arr.reduce((m, r) => { const k = r[key] || 'unknown'; m[k] = (m[k] || 0) + 1; return m; }, {});
    const topN = (arr, key, n = 5) => Object.entries(by(arr.filter((r) => r[key]), key)).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ label: k, count: v }));
    const stats = {
      total: all.length,
      new: all.filter((r) => r.status === 'new').length,
      bugs: all.filter((r) => r.type === 'bug').length,
      contentCorrections: all.filter((r) => r.type === 'content_correction').length,
      critical: all.filter((r) => r.priority === 'critical').length,
      resolved: all.filter((r) => r.status === 'resolved').length,
      byType: by(all, 'type'),
      byStatus: by(all, 'status'),
      byPriority: by(all, 'priority'),
      topLessons: topN(all, 'lessonTitle', 5),
      topCourses: topN(all, 'courseTitle', 5),
    };
    return json(stats);
  }

  // -------- PATCH /api/admin/feedback/:id --------
  if (method === 'PATCH' && path[0] === 'admin' && path[1] === 'feedback' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid feedback id', 400);
    const db = await getDb();
    const set = { updatedAt: new Date() };
    const STATUSES = ['new', 'reviewed', 'in_progress', 'resolved', 'ignored'];
    const PRIORITIES = ['low', 'medium', 'high', 'critical'];
    if (typeof body.status === 'string' && STATUSES.includes(body.status)) {
      set.status = body.status;
      set.resolvedAt = (body.status === 'resolved') ? new Date() : null;
    }
    if (typeof body.priority === 'string' && PRIORITIES.includes(body.priority)) {
      set.priority = body.priority;
    }
    if (typeof body.adminNotes === 'string') {
      set.adminNotes = body.adminNotes.slice(0, 2000);
    }
    await db.collection('feedback').updateOne({ id: path[2] }, { $set: set });
    const row = await db.collection('feedback').findOne({ id: path[2] });
    if (row) delete row._id;
    return json({ ok: true, feedback: row });
  }

  // -------- DELETE /api/admin/feedback/:id --------
  if (method === 'DELETE' && path[0] === 'admin' && path[1] === 'feedback' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid feedback id', 400);
    const db = await getDb();
    const res = await db.collection('feedback').deleteOne({ id: path[2] });
    return json({ ok: res.deletedCount > 0 });
  }

  // -------- POST /api/admin/feedback/bulk-delete --------
  if (method === 'POST' && seg === 'admin/feedback/bulk-delete') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    let filter = {};
    const mode = String(body?.mode || '').toLowerCase();
    if (mode === 'status') {
      const st = String(body?.status || '').toLowerCase();
      if (!['resolved', 'ignored'].includes(st)) return NextResponse.json({ error: 'Only resolved or ignored can be bulk-deleted.' }, { status: 400 });
      filter = { status: st };
    } else if (mode === 'older_than_90_days') {
      const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      filter = { status: { $in: ['resolved', 'ignored'] }, updatedAt: { $lt: cutoff } };
    } else {
      return NextResponse.json({ error: 'Unknown bulk-delete mode.' }, { status: 400 });
    }
    const res = await db.collection('feedback').deleteMany(filter);
    console.log(`[feedback] bulk-delete mode=${mode} deleted=${res.deletedCount}`);
    return NextResponse.json({ ok: true, deleted: res.deletedCount });
  }

  return null;
}
