// Public CMS pages (WordPress-style). Rendered SSR for SEO.
// Reserved slugs: 'admin', 'api', 'learn', 'sitemap.xml', etc — those hit their own routes first,
// so Next.js routing precedence protects us. We still guard here for safety.

import { getDb } from '@/lib/mongo';
import { htmlToPlainText } from '@/lib/sanitize';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import OscLogo from '@/components/OscLogo';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

const RESERVED = new Set([
  'admin', 'api', 'learn', 'p',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images', 'sitemap',
]);

// Legal / policy pages — publicly accessible, but excluded from search
// engine indexes. /about is intentionally NOT here so it remains indexable.
const NOINDEX_SLUGS = new Set(['privacy', 'terms', 'cookies', 'contact', 'data-rights']);

async function fetchPage(slug) {
  if (!slug || RESERVED.has(slug)) return null;
  try {
    const db = await getDb();
    const p = await db.collection('pages').findOne({ slug, published: true });
    if (!p) return null;
    delete p._id;
    return p;
  } catch (_) { return null; }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await fetchPage(slug);
  if (!p) return {};
  const title = p.seoTitle || `${p.title} · Online Spirits Club`;
  const description = p.seoDescription || htmlToPlainText(p.contentHtml, 160);
  const url = `${site}/${p.slug}`;
  const isNoindex = NOINDEX_SLUGS.has(p.slug);
  const robots = isNoindex
    ? { index: false, follow: true, googleBot: { index: false, follow: true } }
    : { index: true, follow: true };
  const openGraph = { title, description, url, type: 'article', siteName: 'Online Spirits Club' };
  return {
    title,
    description,
    alternates: { canonical: url },
    // For noindex pages, omit canonical to further signal exclusion but keep OG for social share
    ...(isNoindex ? { openGraph: { ...openGraph, url } } : { openGraph }),
    twitter: { card: 'summary_large_image', title, description },
    robots,
    // Belt-and-braces: emit X-Robots-Tag equivalent via `other` meta so crawlers
    // that ignore Next.js's generated <meta name="robots"> still see it.
    ...(isNoindex ? { other: { 'X-Robots-Tag': 'noindex, follow' } } : {}),
  };
}

export default async function PublicPage({ params }) {
  const { slug } = await params;
  const p = await fetchPage(slug);
  if (!p) notFound();
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Online Spirits Club — home">
            <OscLogo size={28} className="sm:hidden" />
            <OscLogo variant="full" size={28} className="hidden sm:inline-flex" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 md:pt-10">
        <article>
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900">{p.title}</h1>
          <div className="mt-6 prose-cms text-slate-800" dangerouslySetInnerHTML={{ __html: p.contentHtml || '' }} />
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
