#!/usr/bin/env node
/**
 * Read-only dump of all OSC lesson content:
 *   - Static bundled COURSES (lib/content.js)
 *   - Static bundled AI_COURSES (lib/ai-content.js)
 *   - DB overrides in courses_published (with hydration of missing lesson fields
 *     from the canonical bundled source, matching findCourseMerged() semantics)
 *   - Slug aliases (course_slug_aliases)
 *
 * Emits one JSON file which the Python export script consumes.
 * Non-destructive: only reads. No writes. No modifications.
 */
import { MongoClient } from 'mongodb';
import { writeFileSync } from 'fs';
import { COURSES } from '../lib/content.js';
import { AI_COURSES } from '../lib/ai-content.js';
import { LESSON_MEDIA } from '../lib/media.js';

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME   = process.env.DB_NAME   || 'osc_db';
const OUT_PATH  = process.argv[2] || '/tmp/osc_content_dump.json';

function hydrateLesson(canonicalLesson, dbLesson) {
  if (!canonicalLesson) return dbLesson;
  if (!dbLesson) return canonicalLesson;
  return { ...canonicalLesson, ...dbLesson };
}

function mergeCourseWithDb(canonical, dbDoc) {
  if (!dbDoc) return { ...canonical, __source: canonical.__source, __status: 'bundled', __dbOverride: false, __hidden: false };
  const merged = { ...canonical, ...dbDoc };
  merged.__dbOverride = true;
  merged.__hidden = !!dbDoc.hidden;
  merged.__status = merged.__hidden ? 'hidden' : 'published';
  // Rehydrate lessons: if DB has lessons array, merge each with canonical by slug.
  if (Array.isArray(dbDoc.lessons)) {
    merged.lessons = dbDoc.lessons.map((dbL) => {
      const canonL = (canonical?.lessons || []).find((c) => c.slug === dbL?.slug);
      return hydrateLesson(canonL, dbL);
    });
  } else {
    // DB override doesn't specify lessons \u2014 keep canonical lessons intact.
    merged.lessons = canonical?.lessons || [];
  }
  return merged;
}

async function main() {
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  const published = await db.collection('courses_published').find({}).toArray();
  const aliases   = await db.collection('course_slug_aliases').find({}).toArray();
  await client.close();

  // Build merged list \u2014 use the same precedence as findCourseMerged:
  //   1) courses_published overrides the source-of-truth static content
  //   2) COURSES beats AI_COURSES when same slug appears in both (matches
  //      allCoursesMerged: COURSES loaded first, AI_COURSES afterwards, so
  //      AI wins on duplicate slug)
  const canonicalBySlug = new Map();
  for (const c of COURSES)    canonicalBySlug.set(c.slug, { ...c, __source: 'static' });
  for (const c of AI_COURSES) canonicalBySlug.set(c.slug, { ...c, __source: 'ai-static' });
  const publishedBySlug = new Map();
  for (const p of published)  publishedBySlug.set(p.slug, p);

  const allSlugs = new Set([...canonicalBySlug.keys(), ...publishedBySlug.keys()]);
  const merged = [];
  for (const slug of allSlugs) {
    const canonical = canonicalBySlug.get(slug) || { slug, title: slug, lessons: [], __source: 'db-only' };
    const dbDoc = publishedBySlug.get(slug) || null;
    const m = mergeCourseWithDb(canonical, dbDoc);
    merged.push(m);
  }

  // Preserve rough presentation order (COURSES first, then AI_COURSES, then DB-only).
  merged.sort((a, b) => {
    const rank = (c) => (c.__source === 'static' ? 0 : c.__source === 'ai-static' ? 1 : 2);
    return rank(a) - rank(b);
  });

  const totals = {
    exportedAt: new Date().toISOString(),
    mongoUrlHost: (() => { try { return new URL(MONGO_URL.replace(/^mongodb\+?srv?:\/\//, 'http://')).host; } catch { return 'redacted'; } })(),
    dbName: DB_NAME,
    counts: {
      courses: merged.length,
      static: [...canonicalBySlug.values()].filter((c) => c.__source === 'static').length,
      aiStatic: [...canonicalBySlug.values()].filter((c) => c.__source === 'ai-static').length,
      dbPublished: published.length,
      dbHidden: published.filter((p) => p.hidden).length,
      aliases: aliases.length,
    },
    aliases,
    lessonMedia: LESSON_MEDIA,   // slug -> { image, imageAlt, imageCredit, sources }
    courses: merged,
  };

  writeFileSync(OUT_PATH, JSON.stringify(totals, null, 2), 'utf8');
  console.log(`\u2713 dumped ${merged.length} courses to ${OUT_PATH}`);
  console.log(`  static bundled:  ${totals.counts.static}`);
  console.log(`  ai bundled:      ${totals.counts.aiStatic}`);
  console.log(`  db published:    ${totals.counts.dbPublished}  (hidden: ${totals.counts.dbHidden})`);
  console.log(`  slug aliases:    ${totals.counts.aliases}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
