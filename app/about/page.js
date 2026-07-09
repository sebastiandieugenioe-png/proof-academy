import Link from 'next/link'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'

export const metadata = {
  title: 'About &mdash; Online Spirits Club',
  description: 'A modern learning platform and editorial publication for hospitality professionals. Free, structured, evidence-based.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About the Online Spirits Club',
    description: 'A modern learning platform and editorial publication for hospitality professionals.',
    url: '/about',
    type: 'website',
  },
}

function AboutTopBar() {
  return <PublicNav active="About" />
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <AboutTopBar />
      <main className="mx-auto max-w-6xl px-4 pb-28 md:pb-24 pt-6 md:pt-10">
        <section className="pt-8 md:pt-24 pb-16 md:pb-24 max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-medium">
            About
          </div>
          <h1 className="mt-8 text-4xl md:text-6xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
            A modern institution for hospitality knowledge.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed">
            Online Spirits Club is a free learning platform and editorial publication for hospitality professionals. We organise the knowledge behind exceptional service &mdash; spirits, cocktails, wine, coffee, hospitality, leadership &mdash; into a structured curriculum you can trust.
          </p>
        </section>

        <section className="border-t border-slate-200 py-20 md:py-28 max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            What we believe
          </div>
          <div className="space-y-6 text-lg text-slate-700 leading-relaxed">
            <p>Great hospitality is built on knowledge, not personality.</p>
            <p>Knowledge is a discipline. It rewards structure, repetition and time.</p>
            <p>Professionals deserve serious educational institutions &mdash; not marketplaces, not video libraries, not sponsored content. That is what we are building.</p>
          </div>
        </section>

        <section className="border-t border-slate-200 py-20 md:py-28 max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            How we operate
          </div>
          <div className="space-y-8">
            {[
              { t: 'Free forever', b: 'Every learning path, every module, every issue of the Journal. No paywall. No premium tier.' },
              { t: 'No advertising', b: 'Your attention is not for sale. No banners, no sponsored posts.' },
              { t: 'Evidence-based', b: 'Curriculum grounded in learning science: active recall, spaced repetition, deliberate structure.' },
              { t: 'European, independent', b: 'Ireland-based. Independent. Continuously updated.' },
            ].map((p) => (
              <div key={p.t} className="border-t border-slate-100 pt-5">
                <h3 className="text-xl font-semibold text-slate-900 tracking-tight">{p.t}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">{p.b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-200 py-24 md:py-32 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Two ways to start.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed">
            Create a free account and start a Learning Path.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/register" className="h-12 px-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center gap-2 transition">
              Create a free account
            </Link>
          </div>
          <p className="mt-16 text-sm italic text-slate-400 tracking-wide">
            Knowledge compounds. Careers follow.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  )
}
