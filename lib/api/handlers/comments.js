// Lesson comments (public + admin moderation).
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeSlug, isSafeId } from '@/lib/validators';
import { json, err } from '../utils';
import { requireUser } from '../session';
import { requireAdmin } from '../admin-guard';

export async function handle(ctx) {
  const { method, seg, path, request, body } = ctx;

  // -------- GET /api/comments/:course/:lesson (public) --------
  if (method === 'GET' && path[0] === 'comments' && path[1] && path[2]) {
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

  // -------- GET /api/admin/comments --------
  if (method === 'GET' && seg === 'admin/comments') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rows = await db.collection('comments').find({}).sort({ createdAt: -1 }).limit(500).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- POST /api/comments (user) --------
  if (method === 'POST' && seg === 'comments') {
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
    return json({ ok: true, comment: {
      id: doc.id, userName: doc.userName,
      courseSlug: doc.courseSlug, lessonSlug: doc.lessonSlug,
      text: doc.text, createdAt: doc.createdAt,
    } });
  }

  // -------- PATCH /api/admin/comments/:id --------
  if (method === 'PATCH' && path[0] === 'admin' && path[1] === 'comments' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid comment id', 400);
    const db = await getDb();
    const set = {};
    if (typeof body.approved === 'boolean') set.approved = body.approved;
    if (typeof body.text === 'string') set.text = body.text.slice(0, 800);
    await db.collection('comments').updateOne({ id: path[2] }, { $set: set });
    const row = await db.collection('comments').findOne({ id: path[2] });
    if (row) delete row._id;
    return json({ ok: true, comment: row });
  }

  // -------- DELETE /api/admin/comments/:id --------
  if (method === 'DELETE' && path[0] === 'admin' && path[1] === 'comments' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid comment id', 400);
    const db = await getDb();
    await db.collection('comments').deleteOne({ id: path[2] });
    return json({ ok: true });
  }

  return null;
}
