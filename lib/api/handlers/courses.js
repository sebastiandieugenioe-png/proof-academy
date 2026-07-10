// Public course, lesson and image endpoints.
import { NextResponse } from 'next/server';
import { getMedia } from '@/lib/media';
import { fetchImageBuffer } from '@/lib/image-storage';
import { isSafeSlug, isSafeId } from '@/lib/validators';
import { json, err, publicCourseTitle } from '../utils';
import {
  allCoursesMerged,
  findCourseMerged,
  findLessonMerged,
  resolveCourseSlugAlias,
} from '../data';

export async function handle(ctx) {
  const { method, seg, path } = ctx;

  if (method !== 'GET') return null;

  // -------- GET /api/courses (list) --------
  if (seg === 'courses') {
    const merged = await allCoursesMerged();
    return json(merged.map(({ slug, title, tagline, level, accent, icon, category, lessons }) => ({
      slug,
      title: publicCourseTitle({ title, level }),
      tagline,
      level,
      accent,
      icon,
      category: category || null,
      lessonCount: lessons.length,
      lessons: lessons.map((l) => ({
        slug: l.slug,
        title: l.title,
        minutes: l.minutes,
        hasImage: !!(l.image && (typeof l.image === 'string' ? l.image : l.image.url)),
      })),
    })));
  }

  // -------- GET /api/courses/:slug --------
  if (path[0] === 'courses' && path[1]) {
    if (!isSafeSlug(path[1])) return err('Course not found', 404);
    const alias = await resolveCourseSlugAlias(path[1]);
    if (alias) return json({ redirect: alias }, { status: 301, headers: { Location: `/api/courses/${alias}` } });
    const c = await findCourseMerged(path[1]);
    if (!c) return err('Course not found', 404);
    return json({
      slug: c.slug,
      title: publicCourseTitle(c),
      tagline: c.tagline,
      level: c.level,
      accent: c.accent,
      icon: c.icon,
      category: c.category || null,
      lessons: c.lessons.map((l) => ({ slug: l.slug, title: l.title, minutes: l.minutes, objectives: l.objectives })),
    });
  }

  // -------- GET /api/lessons/:course/:lesson --------
  if (path[0] === 'lessons' && path[1] && path[2]) {
    if (!isSafeSlug(path[1]) || !isSafeSlug(path[2])) return err('Lesson not found', 404);
    const data = await findLessonMerged(path[1], path[2]);
    if (!data) return err('Lesson not found', 404);
    // Resolve media in priority order:
    //   1) structured lesson.image = { url, alt, caption, credit, id }  (admin-managed)
    //   2) legacy string lesson.image (AI-generated)
    //   3) static media map in /lib/media.js
    //   4) placeholder
    let media = null;
    const li = data.lesson?.image;
    const mappedFallback = getMedia(path[2]);
    const fallbackSources = data.lesson?.sources?.length ? data.lesson.sources : (mappedFallback?.sources || []);
    if (li && typeof li === 'object' && li.url) {
      media = {
        image: li.url,
        imageAlt: li.alt || data.lesson.title,
        imageCaption: li.caption || '',
        imageCredit: li.credit || '',
        imageId: li.id || null,
        sources: fallbackSources,
      };
    } else if (typeof li === 'string' && li) {
      media = {
        image: li,
        imageAlt: data.lesson.imagePrompt || data.lesson.title,
        imageCaption: '',
        imageCredit: data.lesson.imageCredit || 'External',
        sources: fallbackSources,
      };
    } else if (mappedFallback?.image) {
      media = {
        image: mappedFallback.image,
        imageAlt: mappedFallback.imageAlt || data.lesson.title,
        imageCaption: '',
        imageCredit: mappedFallback.imageCredit || '',
        sources: fallbackSources,
      };
    }
    if (!media) {
      media = {
        image: '/placeholder-lesson.svg',
        imageAlt: 'Online Spirits Club — Educational lesson',
        imageCaption: '',
        imageCredit: '',
        sources: fallbackSources,
      };
    }
    return json({ ...data, media });
  }

  // -------- GET /api/images/:id (public image serving) --------
  if (path[0] === 'images' && path[1]) {
    if (!isSafeId(path[1])) return err('Image not found', 404);
    const rec = await fetchImageBuffer(path[1]);
    if (!rec) return err('Image not found', 404);
    return new NextResponse(rec.buffer, {
      status: 200,
      headers: {
        'Content-Type': rec.contentType,
        'Content-Length': String(rec.buffer.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  return null;
}
