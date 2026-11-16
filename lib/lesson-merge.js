// How a lesson stored in the code (lib/content.js, lib/ai-content.js) is merged
// with an admin override saved in Mongo (courses_published).
//
// Default: the override wins field by field (admin edits are authoritative) and the
// code fills any gaps.
//
// Exception — content revisions: when a lesson in the code carries a `contentRev`
// that the override does not have, the code's teaching text wins (title, objectives,
// theory, embedded questions, study cards, quiz, sources). Everything else on the
// override (images, etc.) is kept. This lets corrected lesson text shipped in the
// code reach the live site without deleting overrides. Once an admin saves the
// lesson again from /admin, the saved copy carries the same `contentRev`, so later
// admin edits win again as usual.
export const CONTENT_FIELDS = ['title', 'objectives', 'theory', 'embedded', 'flashcards', 'quiz', 'sources'];

export function mergeLesson(canonical, override) {
  if (!override) return canonical;
  if (!canonical) return override;
  const merged = { ...canonical, ...override };
  if (canonical.contentRev && override.contentRev !== canonical.contentRev) {
    for (const f of CONTENT_FIELDS) {
      if (f in canonical) merged[f] = canonical[f];
    }
    merged.contentRev = canonical.contentRev;
  }
  return merged;
}
