import { allLessonPointers } from '@/lib/content';

const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export default function sitemap() {
  const now = new Date();
  const base = [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ];
  const lessons = allLessonPointers().map((p) => ({
    url: `${site}/learn/${p.lessonSlug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  return [...base, ...lessons];
}
