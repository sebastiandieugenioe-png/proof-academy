// Simple Anki-inspired SM-2 lite scheduler
// Grades: 'again' | 'hard' | 'easy'
export function schedule(card, grade) {
  let { interval = 0, ease = 2.5, reps = 0 } = card || {};
  const now = new Date();
  if (grade === 'again') {
    reps = 0;
    interval = 0; // due in ~10 min but we treat as today
    ease = Math.max(1.3, ease - 0.2);
  } else if (grade === 'hard') {
    reps += 1;
    interval = reps === 1 ? 1 : Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(1.3, ease - 0.15);
  } else if (grade === 'easy') {
    reps += 1;
    interval = reps === 1 ? 4 : Math.max(1, Math.round(interval * ease));
    ease = Math.min(3.0, ease + 0.15);
  }
  const dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
  return { interval, ease, reps, dueAt, lastReviewedAt: now };
}
