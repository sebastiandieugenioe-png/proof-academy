#!/usr/bin/env node
// OSC Curriculum v2 — pilot dry-run importer.
//
// This is a one-shot adapter against the EXISTING OSC architecture:
//   * Reuses the `courses_published` collection (no parallel CMS).
//   * Maps v2 shape onto the existing lesson model (embedded / flashcards / quiz).
//   * Preserves round-trip metadata (theoryBlocks, v2Modules, sourceRegistry, visuals).
//   * Adds idempotent stable-ID fields via `$set` only. Never drops or renames existing fields.
//
// First run is DRY-RUN ONLY. The script refuses to perform real writes unless BOTH of these
// hold on the CLI:
//   --apply --package-status=ready-for-import
// AND the package itself declares packageStatus === 'ready-for-import'.
//
// Usage:
//   DRY RUN (default):     node scripts/curriculum_v2_importer.mjs /tmp/curriculum_v2/alcohol-fundamentals.json
//   REAL IMPORT (gated):   node scripts/curriculum_v2_importer.mjs /tmp/curriculum_v2/alcohol-fundamentals.json --apply --package-status=ready-for-import

import fs from 'fs';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

// ------------------------------- CLI parsing --------------------------------

const args = process.argv.slice(2);
const packagePath = args.find((a) => !a.startsWith('--'));
const apply = args.includes('--apply');
const requireStatusArg = args.find((a) => a.startsWith('--package-status='));
const requireStatus = requireStatusArg ? requireStatusArg.split('=')[1] : null;

if (!packagePath) {
  console.error('Usage: curriculum_v2_importer.mjs <package.json> [--apply --package-status=ready-for-import]');
  process.exit(2);
}

// ------------------------------- Config --------------------------------------

const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME   = process.env.DB_NAME   || 'osc_db';

// ------------------------------- Package load -------------------------------

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const pkgDigest = crypto.createHash('sha256').update(fs.readFileSync(packagePath)).digest('hex');

// ------------------------------- Schema validation --------------------------

function validatePackage(p) {
  const errors = [];
  if (!p || typeof p !== 'object') errors.push('Package is not an object.');
  if (!p.schemaVersion) errors.push('Missing schemaVersion.');
  if (!p.learningPath) errors.push('Missing learningPath.');
  const lp = p.learningPath || {};
  if (!/^lp-[a-z0-9-]+$/.test(lp.id || '')) errors.push(`learningPath.id invalid: ${lp.id}`);
  if (typeof lp.slug !== 'string' || !lp.slug.length) errors.push('learningPath.slug missing.');
  if (!Number.isInteger(lp.version) || lp.version < 1) errors.push('learningPath.version must be ≥1.');
  if (!Array.isArray(lp.modules) || !lp.modules.length) errors.push('learningPath.modules required.');
  if (!Array.isArray(lp.lessons) || !lp.lessons.length) errors.push('learningPath.lessons required.');

  // Module uniqueness + required fields.
  const modIds = new Set();
  for (const m of (lp.modules || [])) {
    if (!/^mod-[a-z0-9-]+$/.test(m.id || '')) errors.push(`module.id invalid: ${m.id}`);
    if (modIds.has(m.id)) errors.push(`duplicate module.id: ${m.id}`);
    modIds.add(m.id);
    if (!Number.isInteger(m.order) || m.order < 1) errors.push(`module.order invalid for ${m.id}`);
  }

  // Lesson uniqueness + module refs + stable-ID + slug.
  const lessonIds = new Set();
  const lessonSlugs = new Set();
  const seenOrders = new Set();
  for (const l of (lp.lessons || [])) {
    if (!/^les-[a-z0-9-]+$/.test(l.id || '')) errors.push(`lesson.id invalid: ${l.id}`);
    if (lessonIds.has(l.id)) errors.push(`duplicate lesson.id: ${l.id}`);
    lessonIds.add(l.id);
    if (!l.slug || typeof l.slug !== 'string') errors.push(`lesson.slug missing on ${l.id}`);
    else if (lessonSlugs.has(l.slug)) errors.push(`duplicate lesson.slug: ${l.slug}`);
    else lessonSlugs.add(l.slug);
    if (!modIds.has(l.moduleId)) errors.push(`lesson ${l.id} references unknown moduleId: ${l.moduleId}`);
    if (!Number.isInteger(l.order) || l.order < 1) errors.push(`lesson.order invalid on ${l.id}`);
    if (seenOrders.has(l.order)) errors.push(`lesson.order collision: ${l.order}`);
    seenOrders.add(l.order);
    if (!Array.isArray(l.objectives) || l.objectives.length < 3) errors.push(`lesson ${l.id} needs ≥3 objectives`);
    if (!Array.isArray(l.quiz) || l.quiz.length !== 5) errors.push(`lesson ${l.id} must have exactly 5 quiz items`);
    if (!Array.isArray(l.studyCards) || l.studyCards.length < 6 || l.studyCards.length > 10) errors.push(`lesson ${l.id} studyCards out of range`);
    if (!Array.isArray(l.activeRecall) || l.activeRecall.length < 2 || l.activeRecall.length > 3) errors.push(`lesson ${l.id} activeRecall out of range`);

    // Validate the compact 3-option / fixed-correct-index model (quiz + activeRecall).
    for (const q of (l.quiz || [])) {
      if (!Array.isArray(q.options) || q.options.length !== 3) errors.push(`${l.id} quiz ${q.id || '?'} options must be exactly 3`);
      if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 2) errors.push(`${l.id} quiz ${q.id || '?'} correctIndex out of range`);
    }
    for (const r of (l.activeRecall || [])) {
      if (!Array.isArray(r.options) || r.options.length !== 3) errors.push(`${l.id} activeRecall ${r.id || '?'} options must be exactly 3`);
      if (!Number.isInteger(r.correctIndex) || r.correctIndex < 0 || r.correctIndex > 2) errors.push(`${l.id} activeRecall ${r.id || '?'} correctIndex out of range`);
    }

    // Validate every sourceIds reference resolves within the lesson's sources[].
    const lessonSourceIds = new Set((l.sources || []).map((s) => s.id));
    const checkRefs = (collection, path) => {
      for (const item of (l[collection] || [])) {
        for (const sid of (item.sourceIds || [])) {
          if (!lessonSourceIds.has(sid)) errors.push(`${l.id} ${path}.${item.id || '?'} references unknown sourceId: ${sid}`);
        }
      }
    };
    checkRefs('blocks', 'blocks');
    checkRefs('activeRecall', 'activeRecall');
    checkRefs('studyCards', 'studyCards');
    checkRefs('quiz', 'quiz');
  }

  return { ok: errors.length === 0, errors };
}

// ------------------------------- Shape adapters -----------------------------

// v2 blocks[] (structured) → plain text theory for the current renderer.
// Preserves full round-trip in theoryBlocks[].
function renderTheoryFromBlocks(blocks = []) {
  const parts = [];
  for (const b of blocks) {
    if (!b || !b.content) continue;
    switch (b.type) {
      case 'heading':
        parts.push(`## ${b.content}`);
        break;
      case 'definition':
        parts.push(`**Definition.** ${b.content}`);
        break;
      case 'key_fact':
        parts.push(`**Key fact.** ${b.content}`);
        break;
      case 'comparison':
        parts.push(`**Comparison.** ${b.content}`);
        break;
      case 'process':
        parts.push(`**Process.** ${b.content}`);
        break;
      case 'hospitality_example':
        parts.push(`**Hospitality example.** ${b.content}`);
        break;
      case 'common_misconception':
        parts.push(`**Common misconception.** ${b.content}`);
        break;
      case 'key_takeaway':
        parts.push(`**Key takeaway.** ${b.content}`);
        break;
      default:
        parts.push(b.content);
    }
  }
  return parts.join('\n\n');
}

function mapActiveRecall(items = []) {
  return items.map((r) => ({
    id: r.id,
    q: r.question,
    options: r.options,
    correct: r.correctIndex,
    explanation: r.explanation || '',
    sourceIds: r.sourceIds || [],
  }));
}

function mapStudyCards(items = []) {
  return items.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    sourceIds: c.sourceIds || [],
  }));
}

function mapQuiz(items = []) {
  return items.map((q) => ({
    id: q.id,
    q: q.question || q.prompt || null,  // null → flagged as conflict by caller; never fabricated
    type: q.type || 'single-choice',
    questionType: q.questionType || null,
    options: q.options,
    correct: q.correctIndex,
    explanation: q.explanation || '',
    sourceIds: q.sourceIds || [],
  }));
}

function buildSourceRegistry(lessons = []) {
  const byId = new Map();
  for (const l of lessons) {
    for (const s of (l.sources || [])) {
      if (!byId.has(s.id)) byId.set(s.id, s);
    }
  }
  return [...byId.values()];
}

// Deep structural equality for the purpose of detecting "no-op" updates.
// Ignores Mongo _id. Treats {a:1,b:2} == {b:2,a:1} and arrays preserve order.
function deepEqual(a, b) {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (typeof a === 'object') {
    const ka = Object.keys(a).filter((k) => k !== '_id');
    const kb = Object.keys(b).filter((k) => k !== '_id');
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
    return true;
  }
  return false;
}

// ------------------------------- Importer core ------------------------------

async function run() {
  const schemaValidation = validatePackage(pkg);
  const report = {
    tool: 'curriculum_v2_importer',
    version: '1.0',
    runAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'dry-run',
    packagePath,
    packageDigest: pkgDigest,
    packageSchemaVersion: pkg.schemaVersion,
    packageStatus: pkg.packageStatus,
    schemaValidation,
    publishGate: null,
    created: [],
    updated: [],
    unchanged: [],
    skipped: [],
    conflicts: [],
    errors: [],
    migrations: [],
    counts: {},
  };

  if (!schemaValidation.ok) {
    report.errors.push({ severity: 'fatal', message: 'Schema validation failed.', detail: schemaValidation.errors });
    print(report);
    process.exit(1);
  }

  // Publish gate.
  if (apply) {
    if (pkg.packageStatus !== 'ready-for-import') {
      report.publishGate = { ok: false, reason: `apply mode refused: package.packageStatus is "${pkg.packageStatus}", must be "ready-for-import".` };
      report.errors.push({ severity: 'fatal', message: report.publishGate.reason });
      print(report);
      process.exit(1);
    }
    if (requireStatus !== 'ready-for-import') {
      report.publishGate = { ok: false, reason: 'apply mode refused: --package-status=ready-for-import is required explicitly on the CLI.' };
      report.errors.push({ severity: 'fatal', message: report.publishGate.reason });
      print(report);
      process.exit(1);
    }
    report.publishGate = { ok: true };
  } else {
    report.publishGate = { ok: 'n/a', reason: 'dry-run' };
  }

  // ------------------------------- Compare vs DB ----------------------------
  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  try {
    const lp = pkg.learningPath;
    const existing = await db.collection('courses_published').findOne({ slug: lp.slug });

    // ---- Course-level diff ----
    const nextCoursePatch = {
      // existing identity fields unchanged (slug stays as public identity)
      title: lp.title,
      // round-trip metadata on the course document
      learningPathId: lp.id,
      contentVersion: lp.version,
      v2Modules: lp.modules,
      v2SchemaVersion: pkg.schemaVersion,
      v2PackageStatus: pkg.packageStatus,
      v2PackagePurpose: pkg.packagePurpose || null,
      v2ContentNote: pkg.contentNote || null,
      sourceRegistry: buildSourceRegistry(lp.lessons),
    };

    // Build mapped lessons
    const mappedLessons = lp.lessons.map((l) => {
      const quizMapped = mapQuiz(l.quiz);
      // Flag quiz items without a question text (pilot risk #1 — see mapping.md).
      const quizMissingQuestion = quizMapped.filter((q) => !q.q);
      return {
        __source: l,
        __quizMissing: quizMissingQuestion.length,
        normalized: {
          lessonId: l.id,
          slug: l.slug,
          title: l.title,
          moduleId: l.moduleId,
          contentVersion: l.contentVersion,
          difficulty: l.difficulty,
          minutes: l.estimatedMinutes,
          prerequisites: l.prerequisites || [],
          knowledgeTags: l.knowledgeTags || [],
          objectives: l.objectives,
          theory: renderTheoryFromBlocks(l.blocks),
          theoryBlocks: l.blocks,
          embedded: mapActiveRecall(l.activeRecall),
          flashcards: mapStudyCards(l.studyCards),
          quiz: quizMapped,
          sources: l.sources,
          seo: l.seo,
          visuals: l.visuals || [],
        },
      };
    });

    // Match lessons against existing by STABLE ID first, slug second.
    const existingLessons = Array.isArray(existing?.lessons) ? existing.lessons : [];
    const bySlug = new Map(existingLessons.map((e, i) => [e.slug, { lesson: e, idx: i }]));
    const byLessonId = new Map(existingLessons.filter((e) => e.lessonId).map((e, i) => [e.lessonId, { lesson: e, idx: i }]));

    const lessonDiffs = [];
    for (const m of mappedLessons) {
      const n = m.normalized;
      let match = byLessonId.get(n.lessonId);
      let matchedBy = match ? 'lessonId' : null;
      if (!match) {
        match = bySlug.get(n.slug);
        matchedBy = match ? 'slug (bootstrap)' : null;
      }

      if (!match) {
        lessonDiffs.push({ action: 'created', lessonId: n.lessonId, slug: n.slug, title: n.title, matchedBy: null, patch: n });
        continue;
      }

      const prev = match.lesson;
      // Build the "merged" lesson we would write (preserve any pre-existing extras).
      const merged = { ...prev, ...n };
      // If matched by slug but current record has a different lessonId, that's a conflict.
      if (matchedBy === 'slug (bootstrap)' && prev.lessonId && prev.lessonId !== n.lessonId) {
        lessonDiffs.push({
          action: 'conflicts',
          reason: `slug "${n.slug}" already belongs to lessonId=${prev.lessonId}; package tries to assign lessonId=${n.lessonId}`,
          lessonId: n.lessonId,
          slug: n.slug,
          matchedBy,
        });
        continue;
      }
      // Flag slug-change-but-stable-ID-same (acceptable; log for the operator).
      if (matchedBy === 'lessonId' && prev.slug !== n.slug) {
        lessonDiffs.push({
          action: 'slug-change',
          from: prev.slug,
          to: n.slug,
          lessonId: n.lessonId,
          note: 'learner progress continues to be keyed by courseSlug/lessonSlug today; progress migration pass is required to preserve review history.',
        });
      }

      const same = deepEqual(prev, merged);
      if (same) {
        lessonDiffs.push({ action: 'unchanged', lessonId: n.lessonId, slug: n.slug, matchedBy });
      } else {
        // Report flashcard-order drift because learner SRS is keyed by cardIndex today.
        const prevCards = (prev.flashcards || []).map((c) => c.id || null);
        const nextCards = (n.flashcards || []).map((c) => c.id || null);
        const cardIndexDrift = prevCards.length === nextCards.length
          ? prevCards.some((id, i) => id && nextCards[i] && id !== nextCards[i])
          : (prevCards.length > 0 && prevCards.join(',') !== nextCards.join(','));
        if (cardIndexDrift) {
          lessonDiffs.push({
            action: 'conflicts',
            reason: 'flashcard order would change — would affect learners’ cardIndex-keyed SRS progress.',
            lessonId: n.lessonId,
            slug: n.slug,
            matchedBy,
          });
        }
        if (m.__quizMissing > 0) {
          lessonDiffs.push({
            action: 'conflicts',
            reason: `${m.__quizMissing} quiz item(s) in package have no question text (field "question" absent).`,
            lessonId: n.lessonId,
            slug: n.slug,
            matchedBy,
          });
        }
        lessonDiffs.push({ action: 'updated', lessonId: n.lessonId, slug: n.slug, matchedBy, titleBefore: prev.title, titleAfter: n.title });
      }
    }

    // Course-level diff (independent of lesson diffs).
    const courseBefore = existing || null;
    let courseAction;
    if (!courseBefore) {
      courseAction = { action: 'created', slug: lp.slug, learningPathId: lp.id };
    } else {
      const sim = { ...courseBefore };
      Object.assign(sim, nextCoursePatch);
      sim.lessons = existingLessons; // course-level diff ignores lesson changes
      const same = deepEqual(courseBefore, sim);
      courseAction = same
        ? { action: 'unchanged', slug: lp.slug, learningPathId: lp.id }
        : { action: 'updated', slug: lp.slug, learningPathId: lp.id };
    }

    // --------- Migrations (what the real import would write) ---------
    report.migrations.push(
      'ADD FIELDS on courses_published (idempotent $set only): learningPathId, contentVersion, v2Modules[], v2SchemaVersion, v2PackageStatus, v2PackagePurpose, v2ContentNote, sourceRegistry[]',
      'ADD FIELDS on each courses_published.lessons[] element (idempotent $set only): lessonId, contentVersion, moduleId, difficulty, prerequisites[], knowledgeTags[], theoryBlocks[], visuals[], seo.*',
      'ADD FIELDS on each embedded[]/flashcards[]/quiz[] item: id, sourceIds[], questionType',
      'CREATE collection curriculum_id_map (slug ↔ stable-ID history)',
      'CREATE collection curriculum_imports (append-only run log)'
    );

    report.created = lessonDiffs.filter((d) => d.action === 'created');
    report.updated = lessonDiffs.filter((d) => d.action === 'updated');
    report.unchanged = lessonDiffs.filter((d) => d.action === 'unchanged');
    report.conflicts = lessonDiffs.filter((d) => d.action === 'conflicts');
    report.skipped = lessonDiffs.filter((d) => d.action === 'slug-change'); // informational
    report.course = courseAction;
    report.counts = {
      learningPaths: 1,
      modules: lp.modules.length,
      lessons: lp.lessons.length,
      objectives: lp.lessons.reduce((n, l) => n + (l.objectives?.length || 0), 0),
      blocks: lp.lessons.reduce((n, l) => n + (l.blocks?.length || 0), 0),
      activeRecall: lp.lessons.reduce((n, l) => n + (l.activeRecall?.length || 0), 0),
      studyCards: lp.lessons.reduce((n, l) => n + (l.studyCards?.length || 0), 0),
      quizQuestions: lp.lessons.reduce((n, l) => n + (l.quiz?.length || 0), 0),
      quizOptions: lp.lessons.reduce((n, l) => n + l.quiz.reduce((m, q) => m + (q.options?.length || 0), 0), 0),
      sources: lp.lessons.reduce((n, l) => n + (l.sources?.length || 0), 0),
      sourceRegistryUnique: nextCoursePatch.sourceRegistry.length,
      visuals: lp.lessons.reduce((n, l) => n + (l.visuals?.length || 0), 0),
    };

    // --------- Apply (only when gated) ---------
    if (apply && report.publishGate?.ok === true) {
      // (not executed in Phase 1 dry run; left for later. Explicitly gated above.)
      report.errors.push({ severity: 'warn', message: 'apply mode reached but Phase 1 dry-run gate still prevents writes until operator reviews the dry-run report.' });
    }

    // Always record the dry-run itself in a tiny audit log entry (safe to write).
    // This write is to curriculum_imports and does NOT touch any content/user data.
    // It is scoped and non-destructive; counted here as the ONLY write performed.
    const importDoc = {
      id: crypto.randomUUID(),
      runAt: new Date(),
      mode: report.mode,
      packageDigest: pkgDigest,
      packagePath,
      learningPathId: lp.id,
      courseSlug: lp.slug,
      counts: report.counts,
      createdLessons: report.created.length,
      updatedLessons: report.updated.length,
      unchangedLessons: report.unchanged.length,
      conflicts: report.conflicts.length,
      errors: report.errors.length,
      publishGate: report.publishGate,
    };
    await db.collection('curriculum_imports').insertOne(importDoc);
    report.auditLogId = importDoc.id;

  } finally { await client.close(); }

  print(report);
}

function print(report) {
  const indent = (s, n = 2) => s.split('\n').map((l) => ' '.repeat(n) + l).join('\n');
  // human-readable summary first
  console.log('OSC Curriculum v2 — Import report');
  console.log('─'.repeat(70));
  console.log(`Mode:              ${report.mode}`);
  console.log(`Package:           ${report.packagePath}`);
  console.log(`Digest (sha256):   ${report.packageDigest}`);
  console.log(`Schema version:    ${report.packageSchemaVersion}`);
  console.log(`Package status:    ${report.packageStatus}`);
  console.log(`Publish gate:      ${JSON.stringify(report.publishGate)}`);
  console.log(`Schema validation: ${report.schemaValidation.ok ? 'PASS' : 'FAIL'}`);
  if (!report.schemaValidation.ok) {
    for (const e of report.schemaValidation.errors) console.log(`    ✗ ${e}`);
  }
  console.log('');
  console.log(`Course:            ${JSON.stringify(report.course)}`);
  console.log(`Counts:\n${indent(JSON.stringify(report.counts, null, 2), 4)}`);
  console.log('');
  for (const key of ['created', 'updated', 'unchanged', 'skipped', 'conflicts', 'errors']) {
    const arr = report[key] || [];
    console.log(`${key.toUpperCase()}: ${arr.length}`);
    for (const row of arr) console.log(`  • ${JSON.stringify(row)}`);
  }
  console.log('');
  console.log('Migrations that would run (idempotent):');
  for (const m of report.migrations) console.log(`  • ${m}`);
  console.log('');
  console.log(`Audit log id:   ${report.auditLogId}`);
  // machine-readable JSON (final line is JSON for easy capture)
  console.log('');
  console.log('=== BEGIN REPORT JSON ===');
  console.log(JSON.stringify(report, null, 2));
  console.log('=== END REPORT JSON ===');
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
