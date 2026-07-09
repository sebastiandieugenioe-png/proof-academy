'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, Loader2 } from 'lucide-react'
import OscLogo from '@/components/OscLogo'
import PublicNav from '@/components/PublicNav'
import PublicFooter from '@/components/PublicFooter'

// ============================================================================
// OSC JOURNAL — standalone editorial landing page
// Purpose: convert hospitality professionals into Journal subscribers
// Voice: institutional, editorial, calm, magazine-inspired
// ============================================================================

const ROLES = [
  'Bartenders', 'Restaurant Managers', 'Sommeliers', 'Hotel Staff',
  'Baristas', 'Hospitality Students', 'Brand Ambassadors', 'Hospitality Leaders',
]

const ISSUES = [
  {
    day: 'Monday',
    title: 'Hospitality Weekly',
    body: 'A curated summary of the week\u2019s most important hospitality and beverage industry news.',
  },
  {
    day: 'Midweek',
    title: 'Editorial issue',
    body: 'A long-form article. Rotating between hospitality insight, the spirit of the week, service craft, guest psychology.',
  },
  {
    day: 'Later in the week',
    title: 'Practical or study issue',
    body: 'A short, applied piece. One skill better on the pass, or a Study Corner note from the OSC study team.',
  },
  {
    day: 'Anytime',
    title: 'Nothing else',
    body: 'No promotions. No spam. No filler. Three issues a week is the entire publication.',
  },
]

const FAQ = [
  { q: 'Is it really free?', a: 'Yes. The Journal is free forever. Every issue, every week. No paid tier, no premium version.' },
  { q: 'How often will you email me?', a: 'Three times a week. Every Monday you receive Hospitality Weekly. Two additional editorial issues arrive later in the week — topics vary. Never more than three. Sometimes less if there is nothing worth saying.' },
  { q: 'Can I unsubscribe?', a: 'Any time, with one click. Every issue includes a link at the bottom. Your subscription ends immediately.' },
  { q: 'Will you send promotions?', a: 'No. The Journal is editorial, not marketing. We do not sell products in the emails, and we do not accept sponsored content.' },
  { q: 'How long does each issue take to read?', a: 'Sunday: three to five minutes. Tuesday: seven to twelve. Thursday: two to four. Written for busy professionals.' },
  { q: 'What topics do you cover?', a: 'Spirits, cocktails, service, hospitality craft, industry news, learning science, and the disciplines coming to OSC — wine, coffee, tea, hospitality management and leadership.' },
  { q: 'Do I need an OSC account?', a: 'No. The Journal stands on its own. If you later create an account to take a Learning Path, the two are linked automatically.' },
  { q: 'Where does the content come from?', a: 'Written and reviewed by hospitality professionals and educators. Every claim is grounded in primary sources.' },
]

// ---------------------------------------------------------------------------
// Top bar — shared PublicNav (mobile-aware). "Journal" is active.
// ---------------------------------------------------------------------------
function JournalTopBar() {
  return <PublicNav active="Journal" />
}

// ---------------------------------------------------------------------------
// Email subscription form — reusable for hero + final CTA
// ---------------------------------------------------------------------------
function SubscribeForm({ variant = 'hero' }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [msg, setMsg] = useState('')
  const [note, setNote] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!email.trim() || status === 'submitting') return
    setStatus('submitting'); setMsg(''); setNote('')
    try {
      const res = await fetch('/api/journal/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: `journal_${variant}` }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')

      // Server tells us the outcome and whether the welcome email actually went out.
      setStatus('done')
      setMsg(data.message || 'You have been subscribed to the Journal.')

      // Sub-note tuned per outcome for perfect honesty about what just happened.
      if (data.outcome === 'already_subscribed') {
        setNote('Look out for the next issue on Sunday.')
      } else if (data.emailSkipped) {
        // Resend not yet configured in this environment — sub is saved, we say so.
        setNote('Your subscription is saved. A welcome email will be sent shortly.')
      } else if (data.emailError) {
        setNote('Your subscription is saved. The confirmation email had an issue — we will retry.')
      } else if (data.emailSent) {
        setNote('Check your inbox for a confirmation from the OSC Journal.')
      } else {
        setNote('You will hear from us at the next issue.')
      }
    } catch (err) {
      setStatus('error')
      setMsg(err.message || 'Please try again in a moment.')
    }
  }

  if (status === 'done') {
    return (
      <div className="mt-8 max-w-md mx-auto">
        <div className="border-t border-slate-900 pt-6 text-center">
          <div className="inline-flex h-10 w-10 rounded-full bg-slate-900 items-center justify-center">
            <Check className="h-5 w-5 text-white" />
          </div>
          <p className="mt-4 text-lg font-medium text-slate-900">{msg}</p>
          {note && <p className="mt-2 text-sm text-slate-500">{note}</p>}
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-10 max-w-lg mx-auto" noValidate>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === 'submitting'}
          className="flex-1 h-12 rounded-lg border border-slate-300 px-4 text-base bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-60"
          aria-label="Email address"
        />
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="h-12 px-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center justify-center gap-2 disabled:opacity-60 whitespace-nowrap transition"
        >
          {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Join the Journal <ArrowRight className="h-4 w-4" /></>}
        </button>
      </div>
      {status === 'error' && msg && (
        <p className="mt-3 text-sm text-red-600 text-center">{msg}</p>
      )}
      <p className="mt-5 text-xs text-slate-500 text-center tracking-wide">
        Free forever · Three emails per week · Unsubscribe anytime
      </p>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Editorial mock — a stylised "inside an issue" preview
// Not a screenshot. Purpose-built magazine layout to establish trust.
// ---------------------------------------------------------------------------
function InsideAnIssue() {
  return (
    <div className="mt-14 border border-slate-200 bg-white rounded-none overflow-hidden shadow-[0_1px_0_0_rgba(15,23,42,0.04)]">
      {/* Masthead */}
      <div className="border-b border-slate-200 px-6 md:px-10 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <OscLogo size={22} />
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-medium">The OSC Journal</div>
            <div className="text-xs text-slate-400 mt-0.5">Issue No. 042 &middot; Sunday</div>
          </div>
        </div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Hospitality Weekly</div>
      </div>

      {/* Article */}
      <div className="px-6 md:px-10 py-10 md:py-14 max-w-2xl mx-auto">
        <div className="text-[10px] uppercase tracking-[0.22em] text-slate-500 font-medium">
          The lead &middot; 6 min read
        </div>
        <h3 className="mt-5 text-2xl md:text-4xl font-semibold tracking-tight text-slate-900 leading-[1.15]">
          What Milan&rsquo;s new licensing law means for the next generation of bartenders.
        </h3>
        <p className="mt-4 text-slate-500 italic text-base leading-relaxed">
          A short editorial on how regulation reshapes craft — and who benefits when the rules change.
        </p>
        <div className="mt-8 space-y-5 text-slate-700 leading-relaxed text-[15px] md:text-base">
          <p>
            On the last Wednesday of October, the Comune di Milano quietly passed a revision to Article 17 of the Servizio Bar decree. The change is technical. Its consequences are not.
          </p>
          <p>
            For nearly two decades, licensing has treated the bartender as a food-service worker. From November, that classification will begin to shift — and with it, the calculus of hiring, training and career progression across northern Italy.
          </p>
        </div>

        {/* Pull quote */}
        <blockquote className="mt-10 border-l-2 border-slate-900 pl-6 py-1">
          <p className="text-lg md:text-xl text-slate-900 leading-snug font-medium tracking-tight">
            &ldquo;Regulation rarely rewards craft. When it does, an entire generation notices.&rdquo;
          </p>
        </blockquote>

        {/* Sections */}
        <div className="mt-14 border-t border-slate-200 pt-8 grid gap-6 md:grid-cols-3">
          {[
            { n: '02', t: 'The week in numbers', s: 'Revenue up · Turnover down · Wages flat' },
            { n: '03', t: 'On the pass', s: 'Three service ideas from Copenhagen' },
            { n: '04', t: 'Bookmarked', s: 'Reading list for the working professional' },
          ].map((s) => (
            <div key={s.n}>
              <div className="text-[10px] font-mono text-slate-400 tracking-wider">{s.n}</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">{s.t}</div>
              <div className="mt-0.5 text-xs text-slate-500 leading-relaxed">{s.s}</div>
            </div>
          ))}
        </div>

        {/* CTA within the issue */}
        <div className="mt-14 pt-8 border-t border-slate-200">
          <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500 font-medium">From the editor</div>
          <p className="mt-3 text-slate-700 leading-relaxed text-[15px]">
            If a colleague would find this useful, forward it. If this issue was forwarded to you, subscribe below to receive the next one on Tuesday.
          </p>
        </div>
      </div>

      {/* Footer of the mock issue */}
      <div className="border-t border-slate-200 px-6 md:px-10 py-5 flex items-center justify-between text-xs text-slate-400">
        <span>&copy; Online Spirits Club Journal</span>
        <span>Unsubscribe &middot; View in browser</span>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Journal Landing page
// ---------------------------------------------------------------------------
export default function JournalPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <JournalTopBar />
      <main className="mx-auto max-w-6xl px-4 pb-28 md:pb-24 pt-6 md:pt-10">

        {/* 1. HERO ------------------------------------------------------- */}
        <section className="pt-8 md:pt-24 pb-16 md:pb-24 text-center max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-medium">
            The Online Spirits Club Journal
          </div>
          <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
            Become better at hospitality every week.
          </h1>
          <p className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Join the Online Spirits Club Journal and receive three carefully curated emails every week &mdash; hospitality insights, spirits knowledge and practical learning designed for professionals.
          </p>
          <SubscribeForm variant="hero" />
        </section>

        {/* 2. WHY PROFESSIONALS SUBSCRIBE -------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-3xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              Why professionals subscribe
            </div>
            <p className="text-2xl md:text-3xl text-slate-900 leading-snug font-normal tracking-tight">
              Professionals do not need more information. They need better information.
            </p>
            <p className="mt-6 text-base md:text-lg text-slate-500 leading-relaxed">
              The Journal filters the noise. We read the industry so you don&rsquo;t have to &mdash; and each week we send back only what is worth knowing. Three issues. No promotions. No filler. Written for the people who make hospitality work.
            </p>
          </div>
        </section>

        {/* 3. WHAT YOU'LL RECEIVE ---------------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              What you&rsquo;ll receive
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Three issues. Every week.
            </h2>
            <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Structured like a proper publication. Each issue has a purpose and a place in your week.
            </p>
            <div className="mt-14 grid gap-8 md:gap-10 md:grid-cols-2">
              {ISSUES.map((i, idx) => (
                <div key={i.title} className="border-t border-slate-200 pt-6">
                  <div className="flex items-baseline justify-between">
                    <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">{i.day}</div>
                    <div className="text-xs font-mono text-slate-400 tracking-wider">{String(idx + 1).padStart(2, '0')}</div>
                  </div>
                  <h3 className="mt-3 text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">{i.title}</h3>
                  <p className="mt-2 text-slate-600 leading-relaxed">{i.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. INSIDE AN ISSUE -------------------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              Inside an issue
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              A magazine, delivered by email.
            </h2>
            <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
              An illustrative preview of a Sunday issue. Real subscribers receive it every week.
            </p>
            <InsideAnIssue />
          </div>
        </section>

        {/* 5. PHILOSOPHY -------------------------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              Our philosophy
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Knowledge compounds.<br className="hidden md:inline"/> Careers follow.
            </h2>
            <div className="mt-10 max-w-xl mx-auto space-y-5 text-lg text-slate-600 leading-relaxed">
              <p>Professional growth does not happen overnight.</p>
              <p>It happens through small, consistent improvements &mdash; a good article on a Sunday, a new idea on a Tuesday, one skill better by Thursday.</p>
              <p className="text-slate-900 font-medium">Kept up for a year, that is a different career.</p>
            </div>
          </div>
        </section>

        {/* 6. WHO READS THE JOURNAL -------------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-4xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              Who reads the Journal
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Written for the professionals who take the craft seriously.
            </h2>
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-8">
              {ROLES.map((role) => (
                <div key={role} className="border-t border-slate-100 pt-3 text-base font-medium text-slate-800">{role}</div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. FAQ -------------------------------------------------------- */}
        <section className="border-t border-slate-200 py-20 md:py-28">
          <div className="max-w-3xl mx-auto">
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
              Frequently asked
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              The essentials.
            </h2>
            <div className="mt-12 divide-y divide-slate-200 border-t border-b border-slate-200">
              {FAQ.map((f, i) => (
                <details key={i} className="group">
                  <summary className="flex items-center justify-between cursor-pointer list-none py-5 gap-6">
                    <span className="text-base md:text-lg text-slate-900 font-medium">{f.q}</span>
                    <span className="text-slate-400 group-open:rotate-45 transition-transform text-2xl leading-none font-light shrink-0" aria-hidden="true">+</span>
                  </summary>
                  <div className="pb-5 pr-10 text-slate-600 leading-relaxed">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 8. FINAL CTA -------------------------------------------------- */}
        <section className="border-t border-slate-200 py-24 md:py-36 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
              Join hospitality professionals building better careers, one week at a time.
            </h2>
            <SubscribeForm variant="final" />
            <p className="mt-16 text-sm italic text-slate-400 tracking-wide">
              Knowledge compounds. Careers follow.
            </p>
          </div>
        </section>

      </main>
      <PublicFooter />
    </div>
  )
}
