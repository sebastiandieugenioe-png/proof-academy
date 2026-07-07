import { notFound } from 'next/navigation';
import Link from 'next/link';
import { COURSES, allLessonPointers } from '@/lib/content';
import { AI_COURSES } from '@/lib/ai-content';
import { getMedia } from '@/lib/media';
import { getDb } from '@/lib/mongo';
import SeoLessonBody from './seo-body';
import PublicFooter from '@/components/PublicFooter';
import OscLogo from '@/components/OscLogo';

export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  const staticSlugs = allLessonPointers().map((p) => ({ slug: p.lessonSlug }));
  const aiSlugs = AI_COURSES.flatMap((c) => (c.lessons || []).map((l) => ({ slug: l.slug })));
  return [...staticSlugs, ...aiSlugs];
}

// Strip trailing " Beginner" for public-facing displays (level field still stores it for filtering/admin).
function publicCourseTitle(t) { return typeof t === 'string' ? t.replace(/\s+Beginner\s*$/i, '').trim() : t; }
// Broader helper: strip inline "Beginner" from SEO strings (e.g. "Vodka Beginner Lesson 1" → "Vodka Lesson 1")
function stripBeginnerText(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\bBeginner Lesson\b/gi, 'Lesson')
    .replace(/\bBeginner('s)? Guide\b/gi, 'Guide')
    .replace(/\bBeginner Vodka Course\b/gi, 'Vodka Course')
    .replace(/\|\s*[A-Z][a-z]+\s+Beginner\s*(?=[|·—-]|$)/g, '')
    .replace(/\s+Beginner\s*(?=[|·—-]|$)/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/[|·—-]\s*$/g, '')
    .trim();
}

async function findByLessonSlug(slug) {
  // Priority: DB override → static → AI content.
  // This ensures admin edits (images, theory, etc.) always win.
  // We ALSO hydrate DB records from canonical sources to guard against corrupted overrides
  // (e.g. saved without theory/quiz/flashcards).
  const hydrateWithCanonical = (courseSlug, lessonSlug, dbLesson) => {
    const canonicalCourse = COURSES.find((c) => c.slug === courseSlug) || AI_COURSES.find((c) => c.slug === courseSlug);
    const canonicalLesson = canonicalCourse?.lessons?.find((x) => x.slug === lessonSlug);
    if (!canonicalLesson) return dbLesson;
    // Canonical fills gaps; DB fields win over canonical (admin edits are authoritative).
    return { ...canonicalLesson, ...dbLesson };
  };
  try {
    const db = await getDb();
    const pubs = await db.collection('courses_published').find({ hidden: { $ne: true } }).toArray();
    for (const c of pubs) {
      const l = (c.lessons || []).find((x) => x.slug === slug);
      if (l) {
        const hydrated = hydrateWithCanonical(c.slug, slug, l);
        return { course: { ...c, title: publicCourseTitle(c.title) }, lesson: hydrated, media: resolveMedia(hydrated, slug) };
      }
    }
  } catch (e) { console.error('findByLessonSlug DB error', e); }
  for (const c of COURSES) {
    const l = c.lessons.find((x) => x.slug === slug);
    if (l) return { course: { ...c, title: publicCourseTitle(c.title) }, lesson: l, media: resolveMedia(l, slug) };
  }
  for (const c of AI_COURSES) {
    const l = (c.lessons || []).find((x) => x.slug === slug);
    if (l) return { course: { ...c, title: publicCourseTitle(c.title) }, lesson: l, media: resolveMedia(l, slug) };
  }
  return null;
}

// Same resolution rules as /api/lessons: structured image → legacy string → media.js → placeholder
function resolveMedia(lesson, slug) {
  const li = lesson?.image;
  const mapped = getMedia(slug);
  const fallbackSources = lesson?.sources?.length ? lesson.sources : (mapped?.sources || []);
  if (li && typeof li === 'object' && li.url) {
    return { image: li.url, imageAlt: li.alt || lesson.title, imageCaption: li.caption || '', imageCredit: li.credit || '', imageId: li.id || null, sources: fallbackSources };
  }
  if (typeof li === 'string' && li) {
    return { image: li, imageAlt: lesson.imagePrompt || lesson.title, imageCaption: '', imageCredit: lesson.imageCredit || 'External', sources: fallbackSources };
  }
  if (mapped?.image) {
    return { image: mapped.image, imageAlt: mapped.imageAlt || lesson.title, imageCaption: '', imageCredit: mapped.imageCredit || '', sources: fallbackSources };
  }
  return { image: '/placeholder-lesson.svg', imageAlt: 'Online Spirits Club — Educational lesson', imageCaption: '', imageCredit: '', sources: fallbackSources };
}

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';
// Turn /api/images/... into a fully-qualified URL for OG/Twitter cards.
function absoluteUrl(u) {
  if (!u) return null;
  if (/^https?:\/\//i.test(u)) return u;
  return `${siteUrl}${u.startsWith('/') ? '' : '/'}${u}`;
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const found = await findByLessonSlug(slug);
  if (!found) return { title: 'Module not found — Online Spirits Club' };
  const { lesson, course, media } = found;
  const seoDesc = stripBeginnerText(lesson.seo?.description || (lesson.theory.split('\n\n')[0].replace(/\*\*/g, '').slice(0, 155) + '…'));
  const seoTitle = stripBeginnerText(lesson.seo?.title || `${lesson.title} — ${course.title}`);
  const url = `${siteUrl}/learn/${slug}`;
  const title = `${seoTitle} · Online Spirits Club`;
  const ogImage = absoluteUrl(media?.image);
  return {
    title,
    description: seoDesc,
    alternates: { canonical: url },
    openGraph: {
      title,
      description: seoDesc,
      url,
      type: 'article',
      siteName: 'Online Spirits Club',
      images: ogImage ? [{ url: ogImage, width: 1600, height: 900, alt: media.imageAlt }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: seoDesc,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const found = await findByLessonSlug(slug);
  if (!found) notFound();
  const { course, lesson, media } = found;
  const description = lesson.theory.split('\n\n')[0].replace(/\*\*/g, '').slice(0, 200);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalArticle',
    headline: lesson.title,
    description,
    image: media.image ? [absoluteUrl(media.image)] : undefined,
    author: { '@type': 'Organization', name: 'Online Spirits Club' },
    publisher: {
      '@type': 'Organization',
      name: 'Online Spirits Club',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/manifest.json` },
    },
    inLanguage: 'en',
    isPartOf: { '@type': 'Course', name: course.title },
    educationalLevel: course.level,
    learningResourceType: 'Lesson',
    teaches: lesson.objectives,
    timeRequired: `PT${lesson.minutes}M`,
    url: `${siteUrl}/learn/${slug}`,
    mainEntityOfPage: `${siteUrl}/learn/${slug}`,
    citation: (media.sources || []).map((s) => ({ '@type': 'CreativeWork', name: s.label, url: s.url })),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: course.title, item: `${siteUrl}/learn/${slug}` },
      { '@type': 'ListItem', position: 3, name: lesson.title, item: `${siteUrl}/learn/${slug}` },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Online Spirits Club — home">
            <OscLogo size={28} className="sm:hidden" />
            <OscLogo variant="full" size={28} className="hidden sm:inline-flex" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-blue-700">Home</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">{course.title}</span>
          <span className="mx-1.5">/</span>
          <span className="text-slate-800">{lesson.title}</span>
        </nav>

        <article>
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700">{course.title} · {course.level} · {lesson.minutes} min read</div>
          <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">{lesson.title}</h1>
          <p className="mt-3 text-slate-600 text-base md:text-lg leading-relaxed">{description}</p>

          {media.image && (
            <figure className="mt-6 rounded-2xl overflow-hidden border border-slate-200">
              <img src={media.image} alt={media.imageAlt || ''} className="w-full h-auto object-cover aspect-[16/9] bg-slate-100" loading="eager" />
              {(media.imageCaption || media.imageCredit) && (
                <figcaption className="px-4 py-2.5 text-xs text-slate-500 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-x-3 gap-y-1 items-baseline">
                  {media.imageCaption && <span className="text-slate-600">{media.imageCaption}</span>}
                  {media.imageCredit && <span className="text-slate-400">Photo: {media.imageCredit}</span>}
                </figcaption>
              )}
            </figure>
          )}

          <SeoLessonBody lesson={lesson} />

          <section className="mt-10 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl font-semibold text-slate-900">Ready to remember all of this?</h2>
            <p className="mt-2 text-slate-600 max-w-md mx-auto">Free members unlock the interactive quiz, {lesson.flashcards.length} flashcards, and spaced-repetition reviews so knowledge actually sticks.</p>
            <Link href="/" className="mt-5 inline-flex h-11 px-6 items-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Create your free account</Link>
            <p className="mt-3 text-xs text-slate-500">No card, no ads. Newsletter is optional.</p>
          </section>

          {media.sources?.length > 0 && (
            <section className="mt-10">
              <h2 className="text-lg font-semibold text-slate-900">Sources &amp; further reading</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {media.sources.map((s, i) => (
                  <li key={i}>
                    <a href={s.url} rel="noopener noreferrer nofollow" target="_blank" className="text-blue-700 hover:underline break-words">{s.label} ↗</a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10 pt-8 border-t border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Continue in {course.title}</h2>
            <ul className="mt-3 grid gap-2">
              {course.lessons.filter((l) => l.slug !== lesson.slug).slice(0, 4).map((l) => (
                <li key={l.slug}>
                  <Link href={`/learn/${l.slug}`} className="block rounded-lg border border-slate-200 hover:border-blue-400 bg-white p-3 text-slate-800">
                    <div className="font-medium">{l.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{l.minutes} min · free lesson</div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </article>
      </main>

      <PublicFooter />
    </div>
  );
}
