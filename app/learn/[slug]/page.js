import { notFound } from 'next/navigation';
import Link from 'next/link';
import { COURSES, allLessonPointers, getLesson } from '@/lib/content';
import { getMedia } from '@/lib/media';
import SeoLessonBody from './seo-body';

export const dynamic = 'force-static';
export const revalidate = 3600;

export async function generateStaticParams() {
  return allLessonPointers().map((p) => ({ slug: p.lessonSlug }));
}

function findByLessonSlug(slug) {
  for (const c of COURSES) {
    const l = c.lessons.find((x) => x.slug === slug);
    if (l) return { course: c, lesson: l };
  }
  return null;
}

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const found = findByLessonSlug(slug);
  if (!found) return { title: 'Lesson not found — Online Spirits Club' };
  const { lesson, course } = found;
  const media = getMedia(slug);
  const description = lesson.theory.split('\n\n')[0].replace(/\*\*/g, '').slice(0, 155) + '…';
  const url = `${siteUrl}/learn/${slug}`;
  const title = `${lesson.title} — ${course.title} · Online Spirits Club`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      siteName: 'Online Spirits Club',
      images: media.image ? [{ url: media.image, width: 1600, height: 900, alt: media.imageAlt }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: media.image ? [media.image] : [],
    },
  };
}

export default async function Page({ params }) {
  const { slug } = await params;
  const found = findByLessonSlug(slug);
  if (!found) notFound();
  const { course, lesson } = found;
  const media = getMedia(slug);
  const description = lesson.theory.split('\n\n')[0].replace(/\*\*/g, '').slice(0, 200);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'EducationalArticle',
    headline: lesson.title,
    description,
    image: media.image ? [media.image] : undefined,
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
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 grid place-items-center text-white text-sm font-bold shadow-sm">OS</div>
            <span className="font-semibold tracking-tight text-slate-900 hidden sm:inline">Online Spirits Club</span>
          </Link>
          <Link href="/" className="text-sm h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm inline-flex items-center">Start learning free</Link>
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
              <img src={media.image} alt={media.imageAlt} className="w-full h-auto object-cover aspect-[16/9]" loading="eager" />
              {media.imageCredit && <figcaption className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-t border-slate-100">Photo: {media.imageCredit}</figcaption>}
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

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-slate-500 flex flex-wrap justify-between gap-4">
          <div>© {new Date().getFullYear()} Online Spirits Club. Drink responsibly.</div>
          <Link href="/" className="text-blue-700 hover:underline">Start learning →</Link>
        </div>
      </footer>
    </div>
  );
}
