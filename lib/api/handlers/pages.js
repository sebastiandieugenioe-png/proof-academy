// Pages CMS — public reads + admin CRUD + seed-legal-pages.
import { v4 as uuid } from 'uuid';
import { getDb } from '@/lib/mongo';
import { isSafeId, isSafeSlug } from '@/lib/validators';
import { sanitizeContentHtml } from '@/lib/sanitize';
import { getLegalPages } from '@/lib/legal-pages';
import { json, err, SLUG_RE, RESERVED_PAGE_SLUGS } from '../utils';
import { allCoursesMerged } from '../data';
import { requireAdmin } from '../admin-guard';

export async function handle(ctx) {
  const { method, seg, path, request, body } = ctx;

  // -------- GET /api/pages (public list) --------
  if (method === 'GET' && seg === 'pages') {
    const db = await getDb();
    const rows = await db.collection('pages').find({ published: true })
      .project({ _id: 0, id: 1, slug: 1, title: 1, seoTitle: 1, seoDescription: 1, updatedAt: 1 })
      .sort({ updatedAt: -1 }).toArray();
    return json(rows);
  }

  // -------- GET /api/pages/:slug (public detail) --------
  if (method === 'GET' && path[0] === 'pages' && path[1]) {
    if (!isSafeSlug(path[1])) return err('Not found', 404);
    const db = await getDb();
    const p = await db.collection('pages').findOne({ slug: path[1], published: true });
    if (!p) return err('Page not found', 404);
    delete p._id;
    return json(p);
  }

  // -------- GET /api/admin/pages (list) --------
  if (method === 'GET' && seg === 'admin/pages') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rows = await db.collection('pages').find({}).sort({ updatedAt: -1 }).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- GET /api/admin/pages/:id (single) --------
  if (method === 'GET' && path[0] === 'admin' && path[1] === 'pages' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Page not found', 404);
    const db = await getDb();
    const p = await db.collection('pages').findOne({ id: path[2] });
    if (!p) return err('Page not found', 404);
    delete p._id;
    return json(p);
  }

  // -------- POST /api/admin/pages (create) --------
  if (method === 'POST' && seg === 'admin/pages') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  // -------- PATCH /api/admin/pages/:id --------
  if (method === 'PATCH' && path[0] === 'admin' && path[1] === 'pages' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid page id', 400);
    const db = await getDb();
    const set = { updatedAt: new Date() };
    if (typeof body.title === 'string') set.title = body.title.trim().slice(0, 200);
    if (typeof body.seoTitle === 'string') set.seoTitle = body.seoTitle.trim().slice(0, 200);
    if (typeof body.seoDescription === 'string') set.seoDescription = body.seoDescription.trim().slice(0, 400);
    if (typeof body.contentHtml === 'string') set.contentHtml = sanitizeContentHtml(body.contentHtml);
    if (typeof body.published === 'boolean') set.published = body.published;
    if (typeof body.slug === 'string') {
      const s = body.slug.trim().toLowerCase();
      if (!SLUG_RE.test(s)) return err('Invalid slug. Lowercase letters, numbers and dashes only.');
      if (RESERVED_PAGE_SLUGS.has(s)) return err(`Slug "${s}" is reserved.`);
      const clash = await db.collection('pages').findOne({ slug: s, id: { $ne: path[2] } });
      if (clash) return err('A page with that slug already exists.');
      const clashCourse = (await allCoursesMerged()).some((c) => c.slug === s);
      if (clashCourse) return err('That slug is already used by a course.');
      set.slug = s;
    }
    await db.collection('pages').updateOne({ id: path[2] }, { $set: set });
    const row = await db.collection('pages').findOne({ id: path[2] });
    if (row) delete row._id;
    return json({ ok: true, page: row });
  }

  // -------- DELETE /api/admin/pages/:id --------
  if (method === 'DELETE' && path[0] === 'admin' && path[1] === 'pages' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    if (!isSafeId(path[2])) return err('Invalid page id', 400);
    const db = await getDb();
    const res = await db.collection('pages').deleteOne({ id: path[2] });
    return json({ ok: res.deletedCount > 0 });
  }

  // -------- POST /api/admin/seed-legal-pages --------
  // Idempotent legal-page seed: creates missing pages, refreshes metadata by default,
  // preserves published state + user-edited content. Pass { force: true } to overwrite.
  if (method === 'POST' && seg === 'admin/seed-legal-pages') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  return null;
}
