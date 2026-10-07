# OSC Curriculum v2 → Current OSC Field Mapping

> Pilot adapter mapping used by `/app/scripts/curriculum_v2_importer.mjs`. The importer reuses
> the EXISTING `courses_published` collection (no parallel CMS) and preserves full
> round-trip metadata so the v2 shape can be reproduced later.

## Top-level package fields

| v2 field | OSC storage | Notes |
|---|---|---|
| `schemaVersion` | `courses_published.v2SchemaVersion` | string, e.g. `"2.0.0-pilot"` |
| `packageStatus` | `courses_published.v2PackageStatus` | enum: `draft` / `approved` / `ready-for-import`. **`draft` is NOT publishable to production** — enforced by the importer's publish gate. |
| `packagePurpose` | `courses_published.v2PackagePurpose` | string, informational |
| `contentNote` | `courses_published.v2ContentNote` | string, informational |

## Learning Path ↔ Course

The OSC runtime hierarchy is **Course → Lesson** (no module entity). The Curriculum v2 Learning
Path maps 1:1 to a `courses_published` document.

| v2 field | OSC storage | Notes |
|---|---|---|
| `learningPath.id` (`lp-*`) | `courses_published.learningPathId` | **New stable-ID field.** Canonical import identity. Never used as the public URL. |
| `learningPath.title` | `courses_published.title` | Existing field |
| `learningPath.slug` | `courses_published.slug` | Existing field (public URL identity) |
| `learningPath.version` | `courses_published.contentVersion` | New integer; monotonic |
| `learningPath.modules[]` | `courses_published.v2Modules[]` | Array of `{id, title, order}`. Metadata only. Current renderer continues to show Course→Lesson. |

## Lesson

Each v2 `lesson` object is merged into the matching element of `courses_published.lessons[]`,
matched by **stable id first (`lessonId`), slug second**. On a first import, slug is used to
bootstrap the mapping; after that the stable ID becomes authoritative.

| v2 field | OSC storage | Notes |
|---|---|---|
| `lesson.id` (`les-*`) | `lesson.lessonId` | **New stable-ID field.** Canonical identity. **Not** the slug. |
| `lesson.contentVersion` | `lesson.contentVersion` | New integer, per-lesson |
| `lesson.moduleId` | `lesson.moduleId` | New metadata, references `v2Modules[].id` |
| `lesson.order` | lesson position in `lessons[]` array | Already order-preserving |
| `lesson.title` | `lesson.title` | Existing |
| `lesson.slug` | `lesson.slug` | Existing (mutable; stable-ID remains the key) |
| `lesson.difficulty` | `lesson.difficulty` | New enum: Beginner/Intermediate/Advanced |
| `lesson.estimatedMinutes` | `lesson.minutes` | **Field rename:** v2 `estimatedMinutes` → OSC `minutes` |
| `lesson.prerequisites[]` | `lesson.prerequisites[]` | New metadata, array of lesson IDs |
| `lesson.knowledgeTags[]` | `lesson.knowledgeTags[]` | New metadata |
| `lesson.objectives[]` | `lesson.objectives[]` | Existing field, same shape |
| `lesson.blocks[]` | `lesson.theory` (rendered) + `lesson.theoryBlocks[]` (metadata) | `theory` is concatenated plain text for the current renderer; **`theoryBlocks[]` preserves full round-trip** (`{id, type, content, sourceIds}`). |
| `lesson.activeRecall[]` | `lesson.embedded[]` | **Primary mapping.** Shape: `{id, q, options, correct, explanation, sourceIds, questionType}`. See table below. |
| `lesson.studyCards[]` | `lesson.flashcards[]` | Shape: `{id, front, back, sourceIds}`. Learner progress on study cards is keyed by `cardIndex` currently; migration stashes `cardId` for future lazy mapping. |
| `lesson.quiz[]` | `lesson.quiz[]` | Shape: `{id, q, options, correct, explanation, type, questionType, sourceIds}` |
| `lesson.sources[]` | `lesson.sources[]` + `courses_published.sourceRegistry[]` | Dual-write: per-lesson sources preserved; de-duplicated top-level `sourceRegistry` by `id` makes `sourceIds` references lookup-cheap. |
| `lesson.seo` | `lesson.seo` | Existing. v2 adds `canonicalSlug`, `canonicalPath`, `primaryIntent`, `relatedTopics` — all preserved as-is. |
| `lesson.visuals[]` | `lesson.visuals[]` | New metadata. Not rendered by the current app; kept for future art-direction / briefs. |

### Active Recall shape mapping (v2 → OSC `embedded`)

| v2 | OSC embedded | Notes |
|---|---|---|
| `activeRecall[i].id` | `embedded[i].id` | NEW field (previously absent on embedded items) |
| `activeRecall[i].question` | `embedded[i].q` | **Field rename** |
| `activeRecall[i].options[]` | `embedded[i].options[]` | Same |
| `activeRecall[i].correctIndex` | `embedded[i].correct` | **Field rename**; 0-based index. v2 pilot uses 3 options with fixed correct-index semantics, matching current OSC. |
| `activeRecall[i].explanation` | `embedded[i].explanation` | Same |
| `activeRecall[i].sourceIds[]` | `embedded[i].sourceIds[]` | NEW field |

### Quiz shape mapping (v2 → OSC `quiz`)

| v2 | OSC quiz | Notes |
|---|---|---|
| `quiz[i].id` | `quiz[i].id` | NEW |
| `quiz[i].type` | `quiz[i].type` | NEW (always `single-choice` in this pilot) |
| `quiz[i].questionType` | `quiz[i].questionType` | NEW (`knowledge` / `comparison` / `scenario` / …) |
| `quiz[i].question` **(expected)** / `quiz[i].options[0]` as fallback | `quiz[i].q` | **The pilot package omits a `question` field on quiz items — see Known Risks below.** |
| `quiz[i].options[]` | `quiz[i].options[]` | Same |
| `quiz[i].correctIndex` | `quiz[i].correct` | **Field rename**; 0-based |
| `quiz[i].explanation` | `quiz[i].explanation` | Same |
| `quiz[i].sourceIds[]` | `quiz[i].sourceIds[]` | NEW |

### Source registry

Each lesson carries its own `sources[]`. The importer additionally de-duplicates ALL sources
seen across the learning path into `courses_published.sourceRegistry[]` so that `sourceIds` on
blocks / AR / cards / quiz can be resolved to full source records in O(1).

## New Mongo collections (migration-safe, idempotent)

| Collection | Purpose |
|---|---|
| `curriculum_id_map` | Append-only append of `{learningPathId, lessonId, courseSlug, lessonSlug, firstSeenAt, lastSeenAt}`. **This is how we handle slug changes without breaking learner progress.** |
| `curriculum_imports` | One document per import run (dry-run or real). Contains the full report, actor, timestamp, mode, package snapshot digest. Immutable. |

## Known risks / incompatibilities

1. **Quiz `question` text is absent in the pilot package.** The v2 schema requires `quiz[]`
   items but doesn't yet mandate a `question` field (schema says just `minItems:5`); the pilot
   data file omits `question`. OSC lessons currently require `q` text on each quiz item.
   **Importer behaviour**: records this as a `skipped` conflict per quiz item in the dry-run
   report; publish-gate will refuse any package that doesn't carry a `question` field on
   every quiz entry. We do NOT invent question text.
2. **Block type `theory` is a plain-text concatenation** of blocks in the current renderer.
   The round-trip metadata (`theoryBlocks[]`) preserves the structured shape; if/when a
   block renderer ships, no re-import is needed — the shape is already there.
3. **Learner progress / SRS reviews are keyed by `cardIndex`** (the position in the
   `flashcards[]` array), NOT by stable card ID. Content imports keep this stable **only if
   the import doesn't reorder or remove cards for a lesson**. The importer logs
   `cardIndex` drift per lesson as a `conflicts` entry in the dry-run report. A separate
   progress-migration pass (NOT part of Phase 1) will backfill `cardId` references later.
4. **Course-level renaming via `learningPath.slug`** is treated as a no-op in Phase 1. The
   importer will NOT rename an existing course’s slug on import — slug renames continue to
   go through the existing admin `course-meta` endpoint (which emits a 301 alias and
   migrates progress). Rationale: slug renames have side-effects (aliases, progress docs),
   and lumping them into content imports creates ambiguity. The dry-run will flag any slug
   mismatch as a `conflict`.
5. **Visuals / blocks` sourceIds` have no current renderer.** They are stored as metadata
   only, visible in admin / exports only.
