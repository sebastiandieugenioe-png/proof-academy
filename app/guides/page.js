import Link from 'next/link';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import { GUIDES } from '@/lib/guides';

const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://onlinespiritsclub.com';

export const metadata = {
  title: 'Guides for Bartenders · Online Spirits Club',
  description:
    'Practical guides for bartenders and hospitality staff: what to say, what to recommend and how to sound sure of it. Written from behind the bar.',
  alternates: { canonical: `${siteUrl}/guides` },
  openGraph: {
    title: 'Guides for Bartenders · Online Spirits Club',
    description: 'Practical guides for bartenders and hospitality staff, written from behind the bar.',
    url: `${siteUrl}/guides`,
    type: 'website',
    siteName: 'Online Spirits Club',
  },
};

function fmt(d) {
  return new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function GuidesIndex() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicNav active="Guides" />
      <main className="mx-auto max-w-3xl px-4 pb-20 pt-10 md:pt-16">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-medium">Guides</div>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tight">Straight answers for behind the bar.</h1>
        <p className="mt-4 text-lg text-slate-600 leading-relaxed">
          What to say, what to recommend and how to sound sure of it. Each guide links to the free 5-minute lessons and flashcards behind it.
        </p>

        <ul className="mt-12 divide-y divide-slate-200 border-y border-slate-200">
          {GUIDES.map((g) => (
            <li key={g.slug}>
              <Link href={`/guides/${g.slug}`} className="block py-6 group">
                <div className="text-xs font-medium uppercase tracking-wide text-blue-700">
                  {g.category} · {g.readMinutes} min read
                </div>
                <h2 className="mt-2 text-xl md:text-2xl font-semibold tracking-tight group-hover:text-blue-700">{g.title}</h2>
                <p className="mt-2 text-slate-600 leading-relaxed">{g.description}</p>
                <div className="mt-2 text-xs text-slate-500">{fmt(g.updated || g.published)}</div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <PublicFooter />
    </div>
  );
}
