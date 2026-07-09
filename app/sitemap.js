import { allLessonPointers } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { getDb } from '@/lib/mongo';

const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const now = new Date();
  const base = [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${site}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];
  const staticLessons = allLessonPointers().map((p) => ({
    url: `${site}/learn/${p.lessonSlug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  const aiLessons = AI_COURSES.flatMap((c) =>
    (c.lessons || []).map((l) => ({
      url: `${site}/learn/${l.slug}`,
      lastModified: c.updatedAt || c.publishedAt || now,
      changeFrequency: 'monthly',
      priority: 0.75,
    }))
  );
  let published = [];
  let pages = [];
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({ hidden: { $ne: true } }).toArray();
    const knownSlugs = new Set([
      ...allLessonPointers().map((p) => p.lessonSlug),
      ...AI_COURSES.flatMap((c) => (c.lessons || []).map((l) => l.slug)),
    ]);
    for (const c of pubs) {
      for (const l of (c.lessons || [])) {
        if (knownSlugs.has(l.slug)) continue; // avoid dups
        published.push({
          url: `${site}/learn/${l.slug}`,
          lastModified: c.updatedAt || c.publishedAt || now,
          changeFrequency: 'monthly',
          priority: 0.75,
        });
      }
    }
    // Public pages (only if published).
    const pgs = await db.collection('pages').find({ published: true }).toArray();
    pages = pgs.map((p) => ({
      url: `${site}/${p.slug}`,
      lastModified: p.updatedAt || now,
      changeFrequency: 'monthly',
      priority: 0.5,
    }));
  } catch (_) {}
  return [...base, ...staticLessons, ...aiLessons, ...published, ...pages];
}
