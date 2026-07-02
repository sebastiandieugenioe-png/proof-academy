import { allLessonPointers } from '@/lib/content';
import { getDb } from '@/lib/mongo';

const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export const dynamic = 'force-dynamic';

export default async function sitemap() {
  const now = new Date();
  const base = [
    { url: `${site}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
  ];
  const staticLessons = allLessonPointers().map((p) => ({
    url: `${site}/learn/${p.lessonSlug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  let published = [];
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({}).toArray();
    for (const c of pubs) {
      for (const l of (c.lessons || [])) {
        published.push({
          url: `${site}/learn/${l.slug}`,
          lastModified: c.updatedAt || c.publishedAt || now,
          changeFrequency: 'monthly',
          priority: 0.75,
        });
      }
    }
  } catch (_) {}
  return [...base, ...staticLessons, ...published];
}
