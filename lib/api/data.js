// Course & lesson data-loading helpers.
// Merges three sources of truth (canonical static content, static AI content, DB overrides)
// with the same safety guardrails that the API used to have inline.
import { getDb } from '@/lib/mongo';
import { COURSES, getCourse } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { publicCourseTitle } from './utils';
import { mergeLesson } from '@/lib/lesson-merge';

export async function resolveCourseSlugAlias(slug) {
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
export async function loadPublishedCourses() {
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({}).toArray();
    return pubs.map((p) => ({ ...p, _id: undefined }));
  } catch { return []; }
}

export async function allCoursesMerged() {
  const map = new Map();
  for (const c of COURSES) map.set(c.slug, c);
  for (const c of AI_COURSES) map.set(c.slug, c);
  const pub = await loadPublishedCourses();
  for (const p of pub) {
    if (p.hidden) { map.delete(p.slug); continue; }
    const canonical = map.get(p.slug);
    if (canonical?.lessons && Array.isArray(p.lessons)) {
      p.lessons = p.lessons.map((l) => mergeLesson(canonical.lessons.find((c) => c.slug === l?.slug), l));
    }
    map.set(p.slug, p);
  }
  return Array.from(map.values());
}

// Merge an incoming lesson patch with the canonical source, filling any missing fields.
// Never drops fields on save.
export function hydrateLesson(courseSlug, lessonPatch) {
  if (!lessonPatch?.slug) return lessonPatch;
  const staticC = getCourse(courseSlug);
  const aiC = AI_COURSES.find((c) => c.slug === courseSlug);
  const src = (staticC?.lessons || aiC?.lessons || []).find((l) => l.slug === lessonPatch.slug);
  if (!src) return lessonPatch;
  // Deep-ish merge: incoming values win, but preserve arrays/objects that admin didn't touch.
  return mergeLesson(src, lessonPatch);
}

export async function findCourseMerged(slug) {
  // Try DB override first — that's where admin edits live.
  const staticC = getCourse(slug);
  const aiC = AI_COURSES.find((c) => c.slug === slug);
  const canonical = staticC || aiC || null;
  try {
    const db = await getDb();
    const p = await db.collection('courses_published').findOne({ slug });
    if (p && !p.hidden) {
      delete p._id;
      // Guardrail: if the DB override is malformed (e.g. lessons stored as a
      // non-array), refuse to return it. Fall back to canonical instead of
      // sending broken data to the client. This prevents a single bad admin
      // save from bricking an entire learning path.
      if (!Array.isArray(p.lessons)) {
        console.warn(`[findCourseMerged] override for '${slug}' has non-array lessons — falling back to canonical.`);
        if (canonical) return canonical;
        return null;
      }
      // Rehydrate: any lesson field missing on the DB record falls back to canonical source.
      // Prevents crashes when admin-override accidentally stored a lesson without theory/flashcards/etc.
      if (canonical?.lessons) {
        p.lessons = p.lessons.map((l) => {
          const src = canonical.lessons.find((c) => c.slug === l?.slug);
          return src ? mergeLesson(src, l) : l;
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

export async function findLessonMerged(courseSlug, lessonSlug) {
  // DB override wins over static bundled content (so admin edits are honored).
  const c = await findCourseMerged(courseSlug);
  if (!c) return null;
  const idx = c.lessons.findIndex((l) => l.slug === lessonSlug);
  if (idx === -1) return null;
  const lesson = c.lessons[idx];
  const next = c.lessons[idx + 1] || null;
  const prev = c.lessons[idx - 1] || null;
  return {
    course: { slug: c.slug, title: publicCourseTitle(c), rawTitle: c.title, level: c.level, accent: c.accent },
    lesson, next, prev, index: idx, total: c.lessons.length,
  };
}
