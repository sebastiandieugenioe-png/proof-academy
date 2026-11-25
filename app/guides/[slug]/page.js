import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Layers } from 'lucide-react';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import GuideBody, { guideHeadings } from '@/components/GuideBody';
import { GUIDES, AUTHORS, getGuide } from '@/lib/guides';

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: 'Guide not found · Online Spirits Club' };
  const url = `${siteUrl}/guides/${g.slug}`;
  const title = `${g.metaTitle || g.title} · Online Spirits Club`;
  return {
    title,
    description: g.description,
    alternates: { canonical: url },
    authors: [{ name: AUTHORS[g.author]?.name || 'Online Spirits Club' }],
    openGraph: {
      title,
      description: g.description,
      url,
      type: 'article',
      siteName: 'Online Spirits Club',
      publishedTime: g.published,
      modifiedTime: g.updated || g.published,
    },
    twitter: { card: 'summary', title, description: g.description },
  };
}

function fmt(d) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default async function GuidePage({ params }) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const author = AUTHORS[g.author] || { name: 'Online Spirits Club', role: '', bio: '' };
  const url = `${siteUrl}/guides/${g.slug}`;
  const headings = guideHeadings(g.body);
  const firstLesson = g.lessons?.[0];

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    datePublished: g.published,
    dateModified: g.updated || g.published,
    author: { '@type': 'Person', name: author.name, jobTitle: author.role, url: author.linkedin || `${siteUrl}/about`, ...(author.linkedin ? { sameAs: [author.linkedin] } : {}) },
    publisher: { '@type': 'Organization', name: 'Online Spirits Club', url: siteUrl },
    mainEntityOfPage: url,
    url,
    inLanguage: 'en',
  };
  const faqLd = g.faq?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      }
    : null;
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${siteUrl}/guides` },
      { '@type': 'ListItem', position: 3, name: g.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      <PublicNav active="Guides" />

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-4">
          <Link href="/" className="hover:text-blue-700">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/guides" className="hover:text-blue-700">Guides</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-800">{g.title}</span>
        </nav>

        <article>
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700">{g.category} · {g.readMinutes} min read</div>
          <h1 className="mt-2 text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">{g.title}</h1>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">{g.description}</p>

          <div className="mt-6 flex items-center gap-3 border-y border-slate-200 py-4">
            <div className="h-10 w-10 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center font-semibold">
              {author.name.charAt(0)}
            </div>
            <div className="text-sm">
              <div className="font-medium text-slate-900">By {author.name}</div>
              <div className="text-slate-500">
                {author.role} · Updated {fmt(g.updated || g.published)}
              </div>
            </div>
          </div>

          {g.youtubeId && (
            <div className="mt-8 mx-auto max-w-[340px] aspect-[9/16] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${g.youtubeId}`}
                title={g.title}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {headings.length > 2 && (
            <nav aria-label="In this guide" className="mt-8 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">In this guide</div>
              <ol className="mt-3 space-y-1.5 text-sm list-decimal pl-5">
                {headings.map((h) => (
                  <li key={h.id}><a href={`#${h.id}`} className="text-slate-700 hover:text-blue-700">{h.text}</a></li>
                ))}
              </ol>
            </nav>
          )}

          <div className="mt-4">
            <GuideBody body={g.body} />
          </div>

          {g.lessons?.length > 0 && (
            <section aria-label="Free lessons" className="mt-10 rounded-2xl bg-slate-900 text-white p-6 md:p-8">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold uppercase tracking-wide">
                <Layers className="h-4 w-4" /> Free 5-minute lessons + flashcards
              </div>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">Lock it in with flashcards</h2>
              <p className="mt-2 text-slate-300 leading-relaxed">
                Read the lesson in five minutes, then review the flashcards. With a free account, the cards come back for review over the following days, so it sticks without long study sessions.
              </p>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {g.lessons.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/learn/${l.slug}`} className="flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 px-4 py-3 text-sm font-medium">
                      <BookOpen className="h-4 w-4 text-amber-300 shrink-0" /> {l.title}
                    </Link>
                  </li>
                ))}
              </ul>
              {firstLesson && (
                <Link
                  href={`/?course=${firstLesson.course}&lesson=${firstLesson.slug}`}
                  className="mt-6 inline-flex h-11 items-center rounded-lg bg-amber-400 px-5 font-semibold text-slate-900 hover:bg-amber-300"
                >
                  Start the free lesson
                </Link>
              )}
            </section>
          )}

          {g.faq?.length > 0 && (
            <section aria-label="Frequently asked questions" className="mt-12">
              <h2 className="text-2xl md:text-[28px] font-semibold tracking-tight">Frequently asked questions</h2>
              <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                {g.faq.map((f) => (
                  <div key={f.q} className="py-5">
                    <h3 className="font-semibold text-slate-900">{f.q}</h3>
                    <p className="mt-2 text-slate-700 leading-relaxed">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-label="About the author" className="mt-12 rounded-xl border border-slate-200 p-5 flex gap-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-slate-900 text-white grid place-items-center text-lg font-semibold">
              {author.name.charAt(0)}
            </div>
            <div>
              <div className="font-semibold text-slate-900">{author.name}</div>
              <div className="text-sm text-slate-500">{author.role}</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">{author.bio}</p>
              {author.linkedin && (
                <a href={author.linkedin} rel="me noopener" target="_blank" className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline">
                  LinkedIn profile
                </a>
              )}
            </div>
          </section>

          <p className="mt-8 text-xs text-slate-500">
            For people of legal drinking age. Enjoy responsibly.
          </p>
        </article>

        {GUIDES.length > 1 && (
          <section className="mt-12 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold">More guides</h2>
            <ul className="mt-3 space-y-2">
              {GUIDES.filter((x) => x.slug !== g.slug).slice(0, 4).map((x) => (
                <li key={x.slug}><Link href={`/guides/${x.slug}`} className="text-blue-700 hover:underline">{x.title}</Link></li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
