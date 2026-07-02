// Public CMS pages (WordPress-style). Rendered SSR for SEO.
// Reserved slugs: 'admin', 'api', 'learn', 'sitemap.xml', etc — those hit their own routes first,
// so Next.js routing precedence protects us. We still guard here for safety.

import { getDb } from '@/lib/mongo';
import { htmlToPlainText } from '@/lib/sanitize';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicFooter from '@/components/PublicFooter';

export const dynamic = 'force-dynamic';

const site = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

const RESERVED = new Set([
  'admin', 'api', 'learn', 'p',
  'manifest.json', 'sitemap.xml', 'robots.txt', 'favicon.ico', 'placeholder-lesson.svg',
  '_next', 'assets', 'static', 'images', 'sitemap',
]);

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
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: 'article', siteName: 'Online Spirits Club' },
    twitter: { card: 'summary_large_image', title, description },
    robots: { index: true, follow: true },
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
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 grid place-items-center text-white text-sm font-bold shadow-sm">OS</div>
            <span className="font-semibold tracking-tight text-slate-900 hidden sm:inline">Online Spirits Club</span>
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
