// Public brand reference page — /brand
// Lists every logo variant with a "Download SVG" link. SSR so it can be shared
// with press / partners without any client JS. Not linked from any nav — you
// share the URL manually.

import Link from 'next/link';
import PublicFooter from '@/components/PublicFooter';
import OscLogo from '@/components/OscLogo';

export const metadata = {
  title: 'Brand Kit — Online Spirits Club',
  description: 'Download the official Online Spirits Club logo variants.',
  robots: { index: false }, // internal reference, not for search
};

const VARIANTS = [
  { name: 'Horizontal', file: '/brand/osc-logo-horizontal.svg', bg: 'bg-white', desc: 'Primary lockup — symbol + wordmark. Use on white or very light backgrounds.' },
  { name: 'Compact',    file: '/brand/osc-logo-compact.svg',    bg: 'bg-white', desc: 'Short-form lockup — symbol + OSC. Use in narrow contexts, badges, footers.' },
  { name: 'Icon only',  file: '/brand/osc-logo-icon.svg',       bg: 'bg-white', desc: 'Standalone knowledge-node symbol. Favicon, avatars, app badge.' },
  { name: 'Navy',       file: '/brand/osc-logo-navy.svg',       bg: 'bg-white', desc: 'Single-colour navy — print, embossing, engraving.' },
  { name: 'White',      file: '/brand/osc-logo-white.svg',      bg: 'bg-slate-900', desc: 'For dark or photographic backgrounds. Gold accent preserved.' },
  { name: 'Favicon',    file: '/brand/osc-favicon.svg',         bg: 'bg-white', desc: 'Aggressively simplified for 16-32px rendering. No accent.' },
];

const COLORS = [
  { name: 'Navy',  hex: '#1E3A8A', use: 'Primary. Symbol + wordmark.', text: 'text-white' },
  { name: 'Gold',  hex: '#C8A44D', use: 'Accent only. Center of the mark.', text: 'text-white' },
  { name: 'Ink',   hex: '#0F172A', use: 'Wordmark on light backgrounds.', text: 'text-white' },
  { name: 'White', hex: '#FFFFFF', use: 'Reversed marks + light backgrounds.', text: 'text-slate-900 border' },
];

export default function BrandPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2" aria-label="Online Spirits Club — home">
            <OscLogo variant="full" size={28} />
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">Home</Link>
        </div>
      </header>
      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-10 space-y-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Brand Kit</h1>
          <p className="mt-2 text-slate-600 max-w-2xl">
            Official Online Spirits Club logo variants. Feel free to use them for press coverage, integration UIs and educational partnerships. Please don&apos;t alter the geometry or recolour.
          </p>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Logo variants</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {VARIANTS.map((v) => (
              <div key={v.name} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <div className={`${v.bg} h-40 grid place-items-center p-6`}>
                  <img src={v.file} alt={`${v.name} variant`} className="max-h-16 w-auto" />
                </div>
                <div className="p-4 border-t border-slate-100 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{v.name}</div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{v.desc}</p>
                  </div>
                  <a href={v.file} download className="shrink-0 h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center">Download SVG</a>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Colours</h2>
          <div className="grid gap-3 md:grid-cols-4">
            {COLORS.map((c) => (
              <div key={c.name} className="rounded-xl overflow-hidden border border-slate-200 bg-white">
                <div className={`${c.text} h-20 flex items-end p-3`} style={{ background: c.hex }}>
                  <div>
                    <div className="text-xs uppercase tracking-widest font-semibold">{c.name}</div>
                    <div className="text-sm font-mono">{c.hex}</div>
                  </div>
                </div>
                <p className="p-3 text-xs text-slate-500">{c.use}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Typography</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3" style={{ fontFamily: "var(--font-manrope), Manrope, sans-serif" }}>
            <div className="text-4xl font-extrabold tracking-tight text-slate-900">Online Spirits Club</div>
            <div className="text-sm text-slate-500">Manrope Bold (700) &middot; wordmark</div>
            <div className="text-4xl font-extrabold tracking-widest text-slate-900">OSC</div>
            <div className="text-sm text-slate-500">Manrope ExtraBold (800) &middot; monogram, +6% letter-spacing</div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Social preview</h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <img src="/og-image.png" alt="Open Graph card" className="w-full" />
            <div className="p-4 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs text-slate-500">1200 × 630 &middot; Used for Twitter/X, LinkedIn, Facebook link previews.</div>
              <a href="/og-image.png" download className="h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center">Download PNG</a>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
