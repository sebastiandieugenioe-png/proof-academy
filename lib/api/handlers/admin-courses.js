// Admin course-management endpoints (override, meta rename, publish/hide, lesson-image, repair, diagnostic, aliases).
import { getDb } from '@/lib/mongo';
import { getCourse } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { isSafeSlug } from '@/lib/validators';
import { deleteImage } from '@/lib/image-storage';
import { json, err, SLUG_RE, RESERVED_SLUGS } from '../utils';
import {
  findCourseMerged,
  hydrateLesson,
  allCoursesMerged,
} from '../data';
import { requireAdmin } from '../admin-guard';

export async function handle(ctx) {
  const { method, seg, path, request, body } = ctx;

  // -------- GET /api/admin/course-diagnostic/:slug --------
  // Dumps everything about a slug so we can see exactly why a learning path is failing.
  if (method === 'GET' && path[0] === 'admin' && path[1] === 'course-diagnostic' && path[2]) {
    const g = requireAdmin(request); if (g.response) return g.response;
    const slug = path[2];
    const db = await getDb();
    const staticC = getCourse(slug) || null;
    const aiC = AI_COURSES.find((c) => c.slug === slug) || null;
    const published = await db.collection('courses_published').findOne({ slug });
    const alias = await db.collection('course_slug_aliases').findOne({ from: slug });
    const aliasTargets = await db.collection('course_slug_aliases').find({ to: slug }).toArray();
    const summarizeLessons = (arr) => Array.isArray(arr) ? { count: arr.length, sample: arr.slice(0, 3).map((l) => ({ slug: l?.slug, title: l?.title, hasTheory: !!l?.theory, hasFlashcards: Array.isArray(l?.flashcards), hasQuiz: Array.isArray(l?.quiz) })) } : { count: 0, notAnArray: true, actualType: typeof arr };
    return json({
      slug,
      static: staticC ? { title: staticC.title, level: staticC.level, lessons: summarizeLessons(staticC.lessons) } : null,
      ai: aiC ? { title: aiC.title, lessons: summarizeLessons(aiC.lessons) } : null,
      published: published ? {
        _id: undefined,
        title: published.title,
        level: published.level,
        hidden: !!published.hidden,
        hasLessonsField: 'lessons' in published,
        lessons: summarizeLessons(published.lessons),
        updatedAt: published.updatedAt,
      } : null,
      aliasFromThis: alias ? { to: alias.to } : null,
      aliasesPointingHere: aliasTargets.map((a) => a.from),
      wouldResolveVia:
        published && !published.hidden && Array.isArray(published.lessons) ? 'published' :
        staticC ? 'static' :
        aiC ? 'ai' :
        alias?.to ? `alias -> ${alias.to}` :
        'nothing (404)',
    });
  }

  // -------- GET /api/admin/course-aliases --------
  if (method === 'GET' && seg === 'admin/course-aliases') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const db = await getDb();
    const rows = await db.collection('course_slug_aliases').find({}).sort({ createdAt: -1 }).toArray();
    return json(rows.map((r) => ({ ...r, _id: undefined })));
  }

  // -------- POST /api/admin/course-override --------
  if (method === 'POST' && seg === 'admin/course-override') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const { course } = body;
    if (!course || !isSafeSlug(course.slug)) return err('Valid course.slug required');
    // Rehydrate lessons — never save a lesson without theory/embedded/flashcards/quiz.
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

  // -------- POST /api/admin/lesson-image --------
  // Save/replace/remove a lesson image. Body: { courseSlug, lessonSlug, image | null }
  if (method === 'POST' && seg === 'admin/lesson-image') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  // -------- POST /api/admin/course-publish --------
  if (method === 'POST' && seg === 'admin/course-publish') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

  // -------- POST /api/admin/course-meta --------
  // Update course metadata (title, slug, tagline/description, category, level).
  // Slug renames create a 301 alias and migrate all progress/reviews.
  if (method === 'POST' && seg === 'admin/course-meta') {
    const g = requireAdmin(request); if (g.response) return g.response;
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

    let finalSlug = originalSlug;
    if (typeof newSlug === 'string' && newSlug.trim() && newSlug.trim() !== originalSlug) {
      const s = newSlug.trim().toLowerCase();
      if (!SLUG_RE.test(s)) return err('Invalid slug format. Use lowercase letters, numbers and dashes.');
      if (RESERVED_SLUGS.has(s)) return err(`Slug "${s}" is reserved.`);
      const merged = await allCoursesMerged();
      if (merged.some((c) => c.slug === s && c.slug !== originalSlug)) return err('Another course already uses that slug.');
      finalSlug = s;
    }

    const existing = await db.collection('courses_published').findOne({ slug: originalSlug });
    const base = existing ? { ...existing } : { ...current };
    delete base._id;
    Object.assign(base, set);

    if (finalSlug !== originalSlug) {
      base.slug = finalSlug;
      await db.collection('courses_published').deleteOne({ slug: originalSlug });
      await db.collection('courses_published').updateOne(
        { slug: finalSlug },
        { $set: base },
        { upsert: true }
      );
      const priorAliases = await db.collection('course_slug_aliases').find({ to: originalSlug }).toArray();
      const bulk = [{ updateOne: { filter: { from: originalSlug }, update: { $set: { from: originalSlug, to: finalSlug, createdAt: new Date() } }, upsert: true } }];
      for (const pa of priorAliases) bulk.push({ updateOne: { filter: { from: pa.from }, update: { $set: { to: finalSlug, createdAt: new Date() } } } });
      await db.collection('course_slug_aliases').bulkWrite(bulk);
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

  // -------- POST /api/admin/course-repair --------
  // Heals broken overrides for a given slug.
  // Body: { slug, mode?: 'auto'|'delete_override'|'unhide'|'remove_alias' }
  if (method === 'POST' && seg === 'admin/course-repair') {
    const g = requireAdmin(request); if (g.response) return g.response;
    const slug = String(body?.slug || '').trim();
    if (!slug) return err('slug is required', 400);
    const mode = String(body?.mode || 'auto').toLowerCase();
    const db = await getDb();
    const actions = [];

    const published = await db.collection('courses_published').findOne({ slug });
    const staticC = getCourse(slug) || AI_COURSES.find((c) => c.slug === slug) || null;

    if (published) {
      const set = {}; const unset = {};
      if (mode === 'auto' || mode === 'unhide') {
        if (published.hidden) { set.hidden = false; actions.push(`cleared hidden:true on courses_published/${slug}`); }
      }
      if (mode === 'auto') {
        if ('lessons' in published && !Array.isArray(published.lessons)) {
          unset.lessons = ''; actions.push(`removed malformed lessons field (was ${typeof published.lessons}) — will now fall back to canonical bundled content`);
        }
      }
      if (mode === 'delete_override') {
        await db.collection('courses_published').deleteOne({ slug });
        actions.push(`deleted the entire courses_published override for ${slug} — will now serve canonical bundled content`);
      } else if (Object.keys(set).length || Object.keys(unset).length) {
        const update = {};
        if (Object.keys(set).length) update.$set = { ...set, updatedAt: new Date() };
        if (Object.keys(unset).length) update.$unset = unset;
        await db.collection('courses_published').updateOne({ slug }, update);
      }
    } else {
      actions.push(`no courses_published override exists for ${slug}`);
    }

    if (mode === 'auto' || mode === 'remove_alias') {
      const alias = await db.collection('course_slug_aliases').findOne({ from: slug });
      if (alias?.to) {
        const targetExists = !!(getCourse(alias.to) || AI_COURSES.find((c) => c.slug === alias.to) || await db.collection('courses_published').findOne({ slug: alias.to }));
        if (!targetExists) {
          await db.collection('course_slug_aliases').deleteOne({ from: slug });
          actions.push(`removed stale alias ${slug} -> ${alias.to} (target did not exist)`);
        }
      }
    }

    const nowResolves = !!(await findCourseMerged(slug));
    return json({
      ok: true,
      slug,
      canonicalAvailable: !!staticC,
      actionsTaken: actions,
      resolvesNow: nowResolves,
      hint: nowResolves
        ? 'Course now loads — verify on the live site.'
        : (staticC ? 'Canonical exists but not resolving — try mode=delete_override.' : 'No canonical bundled content for this slug — admin must recreate it in the DB.'),
    });
  }

  return null;
}
