// Startup migrations — self-healing operations that run automatically
// on the first API request after a deployment.
//
// Design:
//   • Each migration has a unique name and version. Once completed
//     successfully, its record is written to `system_migrations` so
//     it never runs again unless the version is bumped.
//   • Migrations must be IDEMPOTENT — safe to re-run on a fresh DB
//     that has never seen the bug.
//   • Migrations must NOT touch user-generated data
//     (users, progress, reviews, comments, feedback, newsletter).
//     Only administrative/content collections are safe to heal.
//   • A single in-process promise gate ensures migrations run at
//     most once per Node process, even under concurrent traffic.
//
// Invoked from: app/api/[[...path]]/route.js (top of GET+POST).

import { getDb } from '@/lib/mongo';
import { getCourse } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';

let _migrationsPromise = null;

// Public entrypoint — call from every request handler. Cheap after first run.
export function ensureMigrationsRun() {
  if (!_migrationsPromise) {
    _migrationsPromise = runAllMigrations().catch((e) => {
      // Never crash the app because of a migration failure — log and continue.
      // Reset the gate so the NEXT request retries (transient DB errors etc.).
      console.error('[migrations] fatal error, will retry on next request:', e);
      _migrationsPromise = null;
    });
  }
  return _migrationsPromise;
}

async function runAllMigrations() {
  const db = await getDb();
  await heal_course_overrides_v1(db);
}

/**
 * heal_course_overrides_v1
 *
 * Repairs `courses_published` documents that would cause a course to be
 * unreachable from the client — while preserving all user data on other
 * collections. Then removes stale entries in `course_slug_aliases`.
 *
 * Actions per override doc:
 *   • if hidden:true AND canonical bundled course exists → clear hidden
 *   • if lessons is not an array AND canonical exists → remove the lessons field
 *   • (canonical fallback then serves the intact bundled lessons — user
 *      progress/reviews/comments continue to work because they're keyed
 *      by courseSlug + lessonSlug which never change)
 *
 * Actions on aliases:
 *   • if `from` matches an existing canonical/DB slug → remove (shadowing bug)
 *   • if `to` doesn't resolve to any canonical or DB slug → remove (stale)
 */
async function heal_course_overrides_v1(db) {
  const name = 'heal_course_overrides_v1';
  const done = await db.collection('system_migrations').findOne({ name });
  if (done && done.completed) return; // already ran successfully

  const startedAt = new Date();
  const report = { name, startedAt, actions: [], errors: [] };

  try {
    // ---- Phase 1: repair broken overrides
    const overrides = await db.collection('courses_published').find({}).toArray();
    for (const p of overrides) {
      try {
        const slug = p.slug;
        if (!slug) continue;
        const canonical = getCourse(slug) || AI_COURSES.find((c) => c.slug === slug) || null;
        const set = {}; const unset = {};

        // 1a) Clear hidden:true if the canonical bundled course exists.
        //     If admin genuinely wanted to hide it, they can re-hide via the editor.
        //     But a stuck hidden flag paired with a broken lessons field is the
        //     most common cause of "learning path unavailable" in production.
        if (p.hidden === true && canonical) {
          set.hidden = false;
          report.actions.push({ slug, action: 'cleared_stuck_hidden_flag' });
        }

        // 1b) Remove malformed lessons field (non-array) if canonical exists.
        //     Downstream findCourseMerged then serves canonical.lessons.
        if ('lessons' in p && !Array.isArray(p.lessons) && canonical) {
          unset.lessons = '';
          report.actions.push({ slug, action: 'removed_malformed_lessons_field', typeWas: typeof p.lessons });
        }

        // 1c) Empty-array lessons AND canonical has real lessons: don't touch.
        //     Empty [] is a valid admin choice to blank out a course.

        if (Object.keys(set).length || Object.keys(unset).length) {
          const update = {};
          if (Object.keys(set).length) update.$set = { ...set, updatedAt: new Date(), healedBy: name };
          if (Object.keys(unset).length) update.$unset = unset;
          await db.collection('courses_published').updateOne({ slug }, update);
        }
      } catch (e) {
        report.errors.push({ slug: p?.slug, message: e.message });
      }
    }

    // ---- Phase 2: prune stale slug aliases
    try {
      const aliases = await db.collection('course_slug_aliases').find({}).toArray();
      for (const a of aliases) {
        try {
          if (!a?.from || !a?.to) continue;
          // Shadowing bug — from-slug happens to be a real canonical slug now.
          const fromHasCanonical = !!(getCourse(a.from) || AI_COURSES.find((c) => c.slug === a.from));
          if (fromHasCanonical) {
            await db.collection('course_slug_aliases').deleteOne({ _id: a._id });
            report.actions.push({ from: a.from, to: a.to, action: 'removed_shadowing_alias' });
            continue;
          }
          // Stale target — points to a slug that doesn't exist anywhere.
          const targetHasCanonical = !!(getCourse(a.to) || AI_COURSES.find((c) => c.slug === a.to));
          const targetHasOverride = !!(await db.collection('courses_published').findOne({ slug: a.to }));
          if (!targetHasCanonical && !targetHasOverride) {
            await db.collection('course_slug_aliases').deleteOne({ _id: a._id });
            report.actions.push({ from: a.from, to: a.to, action: 'removed_stale_alias_dead_target' });
          }
        } catch (e) {
          report.errors.push({ alias: `${a?.from}->${a?.to}`, message: e.message });
        }
      }
    } catch (e) {
      report.errors.push({ phase: 'aliases', message: e.message });
    }

    // ---- Mark complete
    report.completedAt = new Date();
    report.completed = true;
    await db.collection('system_migrations').replaceOne({ name }, { name, ...report }, { upsert: true });

    if (report.actions.length > 0 || report.errors.length > 0) {
      console.log(`[migrations] ${name} completed: ${report.actions.length} action(s), ${report.errors.length} error(s)`);
      for (const a of report.actions) console.log(`  [heal]`, JSON.stringify(a));
      for (const e of report.errors) console.warn(`  [heal-err]`, JSON.stringify(e));
    } else {
      console.log(`[migrations] ${name} completed: nothing to heal (already clean).`);
    }
  } catch (e) {
    console.error(`[migrations] ${name} failed:`, e);
    // Record failure so admins can see it in the DB.
    try {
      await db.collection('system_migrations').replaceOne(
        { name },
        { name, startedAt, failedAt: new Date(), completed: false, error: String(e?.message || e) },
        { upsert: true }
      );
    } catch (_) { /* ignore */ }
    throw e; // propagate so the gate resets and next request retries
  }
}
