'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  GlassWater, Flame, Sparkles, ChevronRight, ChevronLeft, Check, X,
  BookOpen, Brain, Layers, Target, Loader2, LogOut, User as UserIcon,
  Home, Wrench, ArrowRight, PartyPopper, Repeat, TrendingUp,
  Zap, StopCircle, Timer, Award, Smartphone, Trash2, AlertTriangle,
  Menu as MenuIcon,
} from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import OscLogo from '@/components/OscLogo'
import FeedbackButton from '@/components/FeedbackButton'

const ICONS = { Flame, GlassWater, Sparkles }

const SLUG_OK = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

// Every "Start Learning" button opens this learning path directly (the "Start here" path).
const START_PATH = 'alcohol-fundamentals'
const START_HREF = `/?course=${START_PATH}`

// Read ?course=&lesson= from the current URL and turn it into an in-app route.
function routeFromUrl() {
  if (typeof window === 'undefined') return null
  const qs = new URLSearchParams(window.location.search)
  const course = qs.get('course')
  const lesson = qs.get('lesson')
  if (!course || !SLUG_OK.test(course)) return null
  if (lesson && SLUG_OK.test(lesson)) return { name: 'lesson', courseSlug: course, lessonSlug: lesson }
  return { name: 'course', slug: course }
}

// Inverse of routeFromUrl — returns the URL that represents an in-app route.
function urlForRoute(r) {
  if (!r) return null
  if (r.name === 'course' && r.slug) return `/?course=${r.slug}`
  if (r.name === 'lesson' && r.courseSlug && r.lessonSlug) return `/?course=${r.courseSlug}&lesson=${r.lessonSlug}`
  if (r.name === 'landing' || r.name === 'dashboard') return '/'
  return null // study / profile: leave the URL as it is
}

// Small banner shown to visitors without an account. Accounts are optional:
// they only add saved progress, daily review cards (Study) and posting comments.
const SaveProgressBanner = ({ text = 'Save your progress and get daily review cards — free account.' }) => (
  <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 md:p-5 flex flex-wrap items-center justify-between gap-3">
    <p className="text-sm text-slate-700">{text}</p>
    <div className="flex items-center gap-2">
      <a href="/login" className="h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium inline-flex items-center">Log in</a>
      <a href="/register" className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-1.5">Create free account <ArrowRight className="h-4 w-4" /></a>
    </div>
  </div>
)

const api = async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    credentials: 'include', // include the osc_user HTTP-only cookie
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

function App() {
  const [user, setUser] = useState(null)
  const [route, setRoute] = useState({ name: 'landing' })
  const [courses, setCourses] = useState([])
  const [booting, setBooting] = useState(true)

  useEffect(() => {
    (async () => {
      try { setCourses(await api('/courses')) } catch (e) { console.error(e) }
      // Server-verified session via HTTP-only cookie — no localStorage identifier.
      try {
        const u = await api('/me')
        setUser(u); setRoute({ name: 'dashboard' })
      } catch { /* not logged in — that's fine, accounts are optional */ }
      // Deep links: /?course=<slug> and /?course=<slug>&lesson=<slug> open the
      // course or the interactive module directly — no account required.
      // Used by the /learn/<slug> pages and by links shared from social media.
      const deep = routeFromUrl()
      if (deep) setRoute(deep)
      setBooting(false)
    })()
  }, [])

  // Keep the address bar in sync so course/module URLs can be shared and bookmarked.
  useEffect(() => {
    if (booting || typeof window === 'undefined') return
    const target = urlForRoute(route)
    if (target && target !== window.location.pathname + window.location.search) {
      window.history.pushState(null, '', target)
    }
  }, [route, booting])

  // Browser back/forward: follow the URL back into the matching in-app route.
  useEffect(() => {
    const onPop = () => setRoute(routeFromUrl() || { name: user ? 'dashboard' : 'landing' })
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [user])

  const login = useCallback((u) => {
    setUser(u)
    setRoute({ name: 'dashboard' })
  }, [])
  const logout = useCallback(async () => {
    try { await api('/logout', { method: 'POST' }) } catch { /* ignore */ }
    setUser(null); setRoute({ name: 'landing' })
    if (typeof window !== 'undefined') {
      // Clean up legacy client-side id from any pre-cookie install.
      try { window.localStorage.removeItem('osc.userId') } catch {}
    }
  }, [])
  const go = useCallback((r) => setRoute(r), [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <TopBar user={user} onNav={go} onLogout={logout} />
      <main className="mx-auto max-w-6xl px-4 pb-28 md:pb-24 pt-6 md:pt-10">
        {booting ? (
          <div className="min-h-[60vh] grid place-items-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <div className="fade-in">
            {route.name === 'landing' && <Landing courses={courses} onNav={go} />}
            {route.name === 'dashboard' && <Dashboard user={user} courses={courses} onNav={go} />}
            {route.name === 'course' && <CourseView slug={route.slug} onNav={go} user={user} />}
            {route.name === 'lesson' && <LessonView courseSlug={route.courseSlug} lessonSlug={route.lessonSlug} user={user} onNav={go} />}
            {route.name === 'study' && <StudyView user={user} onNav={go} />}
            {route.name === 'profile' && <ProfileView user={user} setUser={setUser} onNav={go} />}
          </div>
        )}
      </main>
      <PublicFooter />
      <BottomNav user={user} route={route} onNav={go} />
    </div>
  )
}

const FullPageLoader = () => (
  <div className="min-h-screen grid place-items-center text-slate-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
)

const Logo = ({ onClick }) => (
  <button onClick={onClick} className="flex items-center gap-2 group" aria-label="Online Spirits Club — home">
    <OscLogo size={28} className="sm:hidden" />
    <OscLogo variant="full" size={28} className="hidden sm:inline-flex" />
  </button>
)

const TopBar = ({ user, onNav, onLogout }) => {
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    if (!mobileOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [mobileOpen])
  const closeAnd = (fn) => () => { setMobileOpen(false); if (typeof fn === 'function') fn() }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
        <Logo onClick={() => onNav(user ? { name: 'dashboard' } : { name: 'landing' })} />

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {!user && (
            <>
              <a href="/#paths"  className="text-sm px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700">Learning Paths</a>
              <a href="/about"   className="text-sm px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700">About</a>
              <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/login' }} className="ml-1 text-sm h-9 px-3 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700 font-medium">Log in</button>
            </>
          )}
          {user && (
            <>
              <button onClick={() => onNav({ name: 'study' })} className="text-sm px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700">Study</button>
              <button onClick={() => onNav({ name: 'profile' })} className="text-sm px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700">Profile</button>
              <button onClick={onLogout} className="text-sm px-3 h-9 inline-flex items-center gap-1.5 rounded-md hover:bg-slate-100 text-slate-600"><LogOut className="h-4 w-4" /> Log out</button>
            </>
          )}
        </nav>

        {/* Mobile controls */}
        <div className="flex items-center gap-1 md:hidden">
          {!user && (
            <>
              <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/login' }} className="text-sm h-9 px-3 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700 font-medium">Log in</button>
              <button
                type="button"
                aria-expanded={mobileOpen}
                aria-controls="app-mobile-nav"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen((v) => !v)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            </>
          )}
          {user && (
            <>
              <button onClick={onLogout} className="text-sm h-9 px-3 inline-flex items-center gap-1.5 rounded-md hover:bg-slate-100 text-slate-600"><LogOut className="h-4 w-4" /></button>
              <button
                type="button"
                aria-expanded={mobileOpen}
                aria-controls="app-mobile-nav"
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMobileOpen((v) => !v)}
                className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile sheet */}
      <div
        id="app-mobile-nav"
        className={`md:hidden overflow-hidden border-t border-slate-200 transition-[max-height,opacity] duration-200 ${mobileOpen ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <nav className="mx-auto max-w-6xl px-4 py-4 flex flex-col">
          {!user && (
            <>
              <a href="/#paths"  onClick={closeAnd()} className="h-12 flex items-center border-b border-slate-100 text-slate-900 text-base font-medium">Learning Paths</a>
              <a href="/about"   onClick={closeAnd()} className="h-12 flex items-center border-b border-slate-100 text-slate-900 text-base font-medium">About</a>
              <a href={START_HREF} onClick={(e) => { e.preventDefault(); setMobileOpen(false); onNav({ name: 'course', slug: START_PATH }) }} className="mt-4 h-12 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center justify-center gap-2">Start Learning</a>
            </>
          )}
          {user && (
            <>
              <button onClick={closeAnd(() => onNav({ name: 'study' }))} className="h-12 flex items-center border-b border-slate-100 text-slate-900 text-base font-medium text-left">Study</button>
              <button onClick={closeAnd(() => onNav({ name: 'profile' }))} className="h-12 flex items-center border-b border-slate-100 text-slate-900 text-base font-medium text-left">Profile</button>
              <button onClick={closeAnd(onLogout)} className="h-12 flex items-center text-slate-600 text-base font-medium text-left"><LogOut className="h-4 w-4 mr-2" /> Log out</button>
            </>
          )}
        </nav>
      </div>
    </header>
  )
}

const BottomNav = ({ user, route, onNav }) => {
  if (!user) return null
  const items = [
    { key: 'dashboard', icon: Home, label: 'Home' },
    { key: 'study', icon: Brain, label: 'Study' },
    { key: 'profile', icon: UserIcon, label: 'Profile' },
  ]
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 safe-bottom">
      <div className="mx-auto max-w-6xl grid grid-cols-3">
        {items.map((it) => {
          const active = route.name === it.key
          const Icon = it.icon
          return (
            <button key={it.key} onClick={() => onNav({ name: it.key })} className={`min-h-[56px] py-2.5 flex flex-col items-center gap-0.5 text-[11px] tap ${active ? 'text-blue-700' : 'text-slate-500'}`}>
              <Icon className={`h-5 w-5 ${active ? 'scale-110' : ''} transition-transform`} />{it.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// =====================================================================
// Landing — repositioned homepage (institutional, typography-first, calm)
// Sections: Hero · Premise · For Professionals · Method · Curriculum ·
//           Structured vs Scattered · Science · Career · Certifications ·
//           Promise · FAQ · Closing CTA
// =====================================================================
const Landing = ({ courses, onNav }) => {
  const publishedCount = courses?.length || 0
  // Start Learning → straight into the starter learning path.
  const startFirst = (e) => {
    e.preventDefault(); onNav({ name: 'course', slug: START_PATH })
  }
  return (
    <div className="pb-8">

      {/* 1. HERO ------------------------------------------------------- */}
      <section className="pt-8 md:pt-24 pb-20 md:pb-32 text-center max-w-4xl mx-auto">
        <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500 font-medium">
          Online Spirits Club — Est. 2025
        </div>
        <h1 className="mt-8 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight text-slate-900 leading-[1.05]">
          The modern learning platform for hospitality professionals.
        </h1>
        <p className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Free. Structured. Evidence-based. Built for your career.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a href={START_HREF} onClick={startFirst} className="h-12 px-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center gap-2 transition">
            Start Learning <ArrowRight className="h-4 w-4" />
          </a>
          <a href="#paths" className="h-12 px-5 text-slate-700 hover:text-slate-900 font-medium inline-flex items-center gap-1 transition">
            Explore Learning Paths <ChevronRight className="h-4 w-4" />
          </a>
        </div>
        <p className="mt-8 text-xs text-slate-400 tracking-wide">
          Free forever · No account needed
        </p>
      </section>

      {/* 2. PREMISE ---------------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            Why OSC exists
          </div>
          <p className="text-2xl md:text-3xl text-slate-900 leading-snug font-normal tracking-tight">
            Great hospitality is built on knowledge. OSC organizes that knowledge into a modern curriculum you can trust.
          </p>
          <p className="mt-6 text-base md:text-lg text-slate-500 leading-relaxed">
            We are not a marketplace. We are not a video library. We are building a serious educational institution for the people who make hospitality work — starting with spirits and cocktails, and expanding into wine, coffee, service, management and leadership.
          </p>
        </div>
      </section>

      {/* 3. FOR PROFESSIONALS ----------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            Who this is for
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Built for the people who make hospitality work.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Whether you are behind the bar tonight or leading a team next year, OSC meets you where you are.
          </p>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-8">
            {[
              'Bartenders', 'Sommeliers', 'Baristas',
              'Waiters', 'Restaurant Managers', 'Hotel Staff',
              'Hotel Managers', 'Brand Ambassadors', 'Hospitality Students',
            ].map((role) => (
              <div key={role} className="border-t border-slate-100 pt-3 text-base font-medium text-slate-800">{role}</div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. HOW LEARNING WORKS ---------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            The method
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Four steps, deliberately structured.
          </h2>
          <div className="mt-14 grid gap-10 md:gap-14 md:grid-cols-2">
            {[
              { n: '01', t: 'Learning Paths', b: 'Choose a discipline — spirits and cocktails today; wine, coffee, service and leadership soon.' },
              { n: '02', t: 'Modules', b: 'Short lessons of 3–5 minutes, designed to be studied between shifts or over coffee.' },
              { n: '03', t: 'Study Cards', b: 'Memorize what matters through active recall — the most effective form of learning.' },
              { n: '04', t: 'Knowledge Checks', b: 'Prove what you know before moving forward. Retention over speed.' },
            ].map((s) => (
              <div key={s.n} className="border-t border-slate-200 pt-6">
                <div className="text-xs font-mono text-slate-400 tracking-wider">{s.n}</div>
                <h3 className="mt-3 text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">{s.t}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. CURRICULUM ------------------------------------------------ */}
      <section id="paths" className="border-t border-slate-200 py-20 md:py-28 scroll-mt-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            The curriculum
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            A growing library of professional disciplines.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Everything on OSC is free. New paths are added regularly, following the same evidence-based method.
          </p>

          {/* Available now */}
          <div className="mt-14">
            <div className="flex items-baseline justify-between border-b border-slate-300 pb-3">
              <div className="text-sm font-medium text-slate-900">Available now</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">{publishedCount} {publishedCount === 1 ? 'path' : 'paths'}</div>
            </div>
            <div className="divide-y divide-slate-100">
              {(courses || []).length === 0 && (
                <div className="py-6 text-sm text-slate-400 italic">Learning paths loading…</div>
              )}
              {(courses || []).map((c) => (
                <a
                  key={c.slug}
                  href={`/?course=${c.slug}`}
                  onClick={(e) => { e.preventDefault(); onNav({ name: 'course', slug: c.slug }) }}
                  className="flex items-baseline justify-between py-5 group hover:bg-slate-50 -mx-4 px-4 rounded-md transition"
                >
                  <div className="min-w-0 pr-4">
                    <div className="text-base md:text-lg font-semibold text-slate-900 tracking-tight">{c.title}</div>
                    <div className="mt-1 text-sm text-slate-500 line-clamp-1">{c.tagline}</div>
                  </div>
                  <div className="flex items-baseline gap-4 md:gap-6 text-xs text-slate-500 shrink-0">
                    <span className="hidden sm:inline uppercase tracking-wider">{c.level}</span>
                    <span className="uppercase tracking-wider">{c.lessonCount} modules</span>
                    <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition" />
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* In development */}
          <div className="mt-16">
            <div className="flex items-baseline justify-between border-b border-slate-300 pb-3">
              <div className="text-sm font-medium text-slate-900">In development</div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Coming</div>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-y-3 gap-x-8">
              {['Wine', 'Beer', 'Coffee', 'Tea', 'Luxury Service', 'Restaurant Management', 'Hotel Management', 'Leadership', 'Career Development'].map((d) => (
                <div key={d} className="border-t border-slate-100 pt-3 text-base font-medium text-slate-500">{d}</div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6. STRUCTURED vs SCATTERED ----------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            The difference
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Structured learning is not the same as scrolling.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Watching videos feels like learning. Real learning is what remains a month later.
          </p>
          <div className="mt-14 grid md:grid-cols-2 gap-10 md:gap-16">
            <div className="border-t-2 border-slate-200 pt-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400 font-medium">Scattered</div>
              <ul className="mt-5 space-y-3 text-slate-500 text-base leading-relaxed">
                <li>Random YouTube videos</li>
                <li>Forgetting what you learned</li>
                <li>No path forward</li>
                <li>Advice from strangers</li>
              </ul>
            </div>
            <div className="border-t-2 border-slate-900 pt-6">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-900 font-medium">Structured</div>
              <ul className="mt-5 space-y-3 text-slate-900 text-base leading-relaxed">
                <li>A curriculum built by educators</li>
                <li>Retention by design</li>
                <li>A clear path from beginner to mastery</li>
                <li>Sources you can trust</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 7. THE SCIENCE ----------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            The science behind it
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Learning that stays with you.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Every part of OSC is grounded in decades of research on how memory actually works.
          </p>
          <div className="mt-14 space-y-8">
            {[
              { t: 'Active recall', b: 'You remember what you retrieve, not what you re-read. Every module ends with retrieval — not review.' },
              { t: 'Spaced repetition', b: 'Study cards return exactly when memory is about to fade, following the algorithm proven by Ebbinghaus and refined by modern cognitive science.' },
              { t: 'Structured curriculum', b: 'Concepts build on each other in a deliberate order. Learning is planned, not left to chance.' },
              { t: 'Short modules', b: 'Three to five minutes each. Small enough to fit into a real professional life, long enough to be substantial.' },
              { t: 'Long-term retention', b: 'Knowledge compounds. What you study today serves you for years, not just for the next shift.' },
            ].map((s) => (
              <div key={s.t} className="grid md:grid-cols-[220px_1fr] gap-2 md:gap-10 border-t border-slate-100 pt-5 md:pt-6">
                <div className="text-slate-900 font-semibold tracking-tight">{s.t}</div>
                <div className="text-slate-600 leading-relaxed">{s.b}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CAREER ---------------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            Why this matters
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Knowledge is career capital.
          </h2>
          <div className="mt-12 space-y-8 text-lg md:text-xl text-slate-600 leading-relaxed">
            <p>The best jobs go to the people who understand what they serve.</p>
            <p>Confidence comes from knowing, not guessing.</p>
            <p>Every path completed is one more thing you can build on for the rest of your career.</p>
          </div>
        </div>
      </section>

      {/* 9. CERTIFICATIONS -------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-900" aria-hidden="true"></span>
            In development
          </div>
          <h2 className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Professional certifications, coming soon.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed">
            OSC is building free, verifiable credentials that reflect real knowledge. Certificates will be issued upon completion of specific learning paths and knowledge checks — designed to be respected by employers and meaningful to learners.
          </p>
        </div>
      </section>

      {/* 10. PROMISE -------------------------------------------------- */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-4xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            What OSC promises
          </div>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-10 mt-4">
            {[
              { t: 'Free forever', b: 'Every path, every module, every study card. No paywalls, no upsells, no premium tier.' },
              { t: 'No account needed', b: 'Open any module and start learning. A free account only adds saved progress and daily review cards.' },
              { t: 'Evidence-based', b: 'Every method we use is grounded in learning science, not entertainment.' },
              { t: 'Continuously updated', b: 'Modules are revised as knowledge evolves. This is a living curriculum.' },
            ].map((p) => (
              <div key={p.t} className="border-t border-slate-200 pt-6">
                <h3 className="text-xl md:text-2xl font-semibold text-slate-900 tracking-tight">{p.t}</h3>
                <p className="mt-2 text-slate-600 leading-relaxed">{p.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 11. FAQ ------------------------------------------------------ */}
      <section className="border-t border-slate-200 py-20 md:py-28">
        <div className="max-w-3xl mx-auto">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium mb-6">
            Frequently asked
          </div>
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            The essentials.
          </h2>
          <div className="mt-12 divide-y divide-slate-200 border-t border-b border-slate-200">
            {[
              { q: 'Is it really free?', a: 'Yes. Every learning path, every module, every study card. Free forever. There is no premium tier and no paid version.' },
              { q: 'Who is OSC for?', a: 'Ambitious hospitality professionals — bartenders, sommeliers, baristas, waiters, restaurant and hotel staff, brand ambassadors, and hospitality students. Anyone whose career depends on hospitality knowledge.' },
              { q: 'How is this different from watching YouTube?', a: 'YouTube gives you videos. OSC gives you a curriculum: structured paths, short modules, active recall, spaced repetition and knowledge checks. Videos entertain. Structured learning stays with you.' },
              { q: 'Do I need a background in hospitality?', a: 'No. Paths start from the fundamentals and build up. Whether you started last week or ten years ago, there is a place to begin.' },
              { q: 'How long does a module take?', a: 'Three to five minutes on average. Short enough to fit between shifts or during a break. Long enough to actually teach something.' },
              { q: 'Will there be certifications?', a: 'Yes. Free, verifiable certifications are in development, issued upon completion of learning paths and knowledge checks.' },
              { q: 'Is there a mobile app?', a: 'OSC is a Progressive Web App. Add it to your home screen and it behaves like a native app — offline-friendly, fast, no store required.' },
              { q: 'Where does the content come from?', a: 'Content is written and reviewed by educators and hospitality professionals, grounded in primary sources. The curriculum is continuously updated as the field evolves.' },
            ].map((f, i) => (
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

      {/* 12. CLOSING CTA --------------------------------------------- */}
      <section className="border-t border-slate-200 py-24 md:py-36 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-slate-900 leading-[1.1]">
            Start when you are ready.
          </h2>
          <p className="mt-6 text-base md:text-lg text-slate-600 leading-relaxed">
            No account needed. Open a module and start. No games. Just learning.
          </p>
          <div className="mt-10">
            <a href={START_HREF} onClick={startFirst} className="h-12 px-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center gap-2 transition">
              Begin <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-16 text-sm italic text-slate-400 tracking-wide">
            Knowledge compounds. Careers follow.
          </p>
        </div>
      </section>

    </div>
  )
}

const CourseCard = ({ course, onClick, progressMap }) => {
  const Icon = ICONS[course.icon] || BookOpen
  const done = progressMap ? course.lessons.filter((l) => progressMap[`${course.slug}/${l.slug}`]?.completed).length : 0
  const pct = Math.round((done / course.lessons.length) * 100)
  return (
    <button onClick={onClick} className="text-left rounded-xl border border-slate-200 bg-white p-5 card-hover overflow-hidden">
      <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${course.accent} grid place-items-center text-white shadow-sm`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{course.level} · {course.lessonCount} modules</div>
        <h3 className="mt-1 text-lg font-semibold text-slate-900">{course.title}</h3>
        <p className="mt-1 text-sm text-slate-600 leading-relaxed">{course.tagline}</p>
      </div>
      {progressMap && (
        <div className="mt-4">
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-blue-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 text-xs text-slate-500">{done}/{course.lessonCount} complete</div>
        </div>
      )}
    </button>
  )
}

const ROLE_OPTIONS = ['Bartender','Barback','Waiter/Server','Hospitality student','Cocktail enthusiast','Spirits enthusiast','Beer enthusiast','Wine enthusiast','Bar manager','Other']


const Dashboard = ({ user, courses, onNav }) => {
  const [stats, setStats] = useState(null)
  const [progress, setProgress] = useState([])
  useEffect(() => {
    if (!user) return
    api('/stats').then(setStats).catch(() => {})
    api('/progress').then(setProgress).catch(() => {})
  }, [user])
  const progressMap = useMemo(() => {
    const m = {}; for (const p of progress) m[`${p.courseSlug}/${p.lessonSlug}`] = p; return m
  }, [progress])
  const continueLesson = stats?.lastLesson
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">Welcome back{user?.name ? `, ${user.name}` : ''}</p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">Learn something new today.</h1>
      </div>
      <InstallAppBanner />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Modules completed" value={stats?.lessonsCompleted ?? 0} icon={BookOpen} />
        <StatCard label="Study Cards learned" value={stats?.flashcardsLearned ?? 0} icon={Layers} />
        <StatCard label="Study Cards due" value={stats?.reviewsDue ?? 0} icon={Brain} highlight={stats?.reviewsDue > 0} onClick={() => onNav({ name: 'study' })} />
      </div>
      {continueLesson && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 md:p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-blue-700">Continue learning</div>
            <div className="mt-1 font-semibold text-slate-900">
              {courses.find((c) => c.slug === continueLesson.courseSlug)?.title} · {courses.find((c) => c.slug === continueLesson.courseSlug)?.lessons.find((l) => l.slug === continueLesson.lessonSlug)?.title}
            </div>
          </div>
          <button onClick={() => onNav({ name: 'lesson', courseSlug: continueLesson.courseSlug, lessonSlug: continueLesson.lessonSlug })} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Resume <ArrowRight className="h-4 w-4" /></button>
        </div>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Learning paths</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {courses.map((c) => <CourseCard key={c.slug} course={c} onClick={() => onNav({ name: 'course', slug: c.slug })} progressMap={progressMap} />)}
        </div>
      </section>
      <div className="pt-2 flex justify-end">
        <FeedbackButton pageType="dashboard" label="Send feedback" />
      </div>
    </div>
  )
}

/* ============ PWA INSTALL — STATIC INFO CARD ============ */
// Purely instructional. No beforeinstallprompt, no dismiss state, no browser APIs.
// Shown on mobile viewports only (Tailwind md:hidden) — desktop users don't need install hints.
const InstallAppBanner = () => (
  <div className="md:hidden rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 flex items-start gap-3">
    <div className="h-10 w-10 shrink-0 rounded-xl bg-blue-600 text-white grid place-items-center shadow-sm">
      <Smartphone className="h-5 w-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-slate-900">Install Online Spirits Club</div>
      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
        <span className="font-medium text-slate-700">On iPhone:</span> Tap Share → Add to Home Screen.
        <br />
        <span className="font-medium text-slate-700">On Android:</span> Open the browser menu → Install App.
      </p>
    </div>
  </div>
)

const StatCard = ({ label, value, icon: Icon, highlight, onClick }) => (
  <button onClick={onClick} disabled={!onClick} className={`text-left rounded-xl border p-5 w-full ${highlight ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} ${onClick ? 'hover:shadow-sm cursor-pointer' : 'cursor-default'}`}>
    <div className="flex items-center justify-between">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <Icon className={`h-4 w-4 ${highlight ? 'text-blue-700' : 'text-slate-400'}`} />
    </div>
    <div className={`mt-2 text-3xl font-semibold ${highlight ? 'text-blue-700' : 'text-slate-900'}`}>{value}</div>
  </button>
)

const CourseView = ({ slug, onNav, user }) => {
  const [course, setCourse] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState([])
  useEffect(() => {
    let cancelled = false
    setCourse(null); setError(null)
    api(`/courses/${slug}`)
      .then((c) => {
        if (cancelled) return
        // Defensive shape check — the DB must return an object with a lessons array
        if (!c || typeof c !== 'object' || !Array.isArray(c.lessons)) {
          setError('This learning path could not be loaded. It may have been moved or is temporarily unavailable.')
          return
        }
        setCourse(c)
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[CourseView] load failed:', e)
        const msg = /404|not found/i.test(String(e?.message || ''))
          ? 'This learning path is no longer available.'
          : 'We could not load this learning path. Please check your connection and try again.'
        setError(msg)
      })
    if (user) {
      api('/progress').then((p) => { if (!cancelled) setProgress(Array.isArray(p) ? p : []) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [slug, user])

  // Error state — never leaves the user stuck on an infinite spinner.
  if (error) return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-4">
      <div className="inline-flex h-10 w-10 rounded-full bg-slate-100 items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-slate-500" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Learning path unavailable</h1>
      <p className="text-sm text-slate-600">{error}</p>
      <div className="flex items-center justify-center gap-2 pt-2">
        <button onClick={() => onNav({ name: user ? 'dashboard' : 'landing' })} className="h-10 px-5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium">{user ? 'Back to dashboard' : 'All learning paths'}</button>
        <button onClick={() => { setError(null); setCourse(null); api(`/courses/${slug}`).then(setCourse).catch(() => setError('Still not available. Please try again in a moment.')) }} className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">Try again</button>
      </div>
    </div>
  )
  if (!course) return <FullPageLoader />

  const Icon = ICONS[course.icon] || BookOpen
  const lessons = Array.isArray(course.lessons) ? course.lessons : []
  const doneSet = new Set(progress.filter((p) => p.completed && p.courseSlug === slug).map((p) => p.lessonSlug))
  const accent = course.accent || 'from-slate-700 to-slate-900'

  return (
    <div className="space-y-8">
      <button onClick={() => onNav({ name: user ? 'dashboard' : 'landing' })} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {user ? 'Dashboard' : 'All learning paths'}</button>
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${accent} grid place-items-center text-white shadow-sm`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{course.level || ''} · {lessons.length} modules</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">{course.title || 'Learning path'}</h1>
          {course.tagline && <p className="mt-1.5 text-slate-600 max-w-2xl">{course.tagline}</p>}
        </div>
      </div>
      {lessons.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500 italic">No modules published yet. Check back soon.</div>
      ) : (
        <ol className="space-y-2.5">
          {lessons.map((l, i) => {
            if (!l || !l.slug) return null
            const done = doneSet.has(l.slug)
            return (
              <li key={l.slug}>
                <button onClick={() => onNav({ name: 'lesson', courseSlug: slug, lessonSlug: l.slug })} className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 md:p-5 flex items-center gap-4 card-hover">
                  <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{l.title || 'Untitled module'}</div>
                    <div className="text-xs text-slate-500">{l.minutes || 5} min · Theory · Study Cards · Knowledge Check</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </li>
            )
          })}
        </ol>
      )}
      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <FeedbackButton pageType="learning_path" context={{ courseId: course.slug || slug, courseTitle: course.title || slug }} label="Suggest an improvement" />
      </div>
    </div>
  )
}

const STEPS = ['objectives', 'theory', 'flashcards', 'quiz', 'done']
const STEP_LABELS = { objectives: 'Objectives', theory: 'Theory', flashcards: 'Study Cards', quiz: 'Knowledge Check', done: 'Complete' }
const LessonView = ({ courseSlug, lessonSlug, user, onNav }) => {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [step, setStep] = useState(0)
  const startedAt = useMemo(() => Date.now(), [courseSlug, lessonSlug])
  useEffect(() => {
    let cancelled = false
    setData(null); setError(null); setStep(0)
    api(`/lessons/${courseSlug}/${lessonSlug}`)
      .then((d) => {
        if (cancelled) return
        if (!d || typeof d !== 'object') { setError('This module could not be loaded.'); return }
        setData(d)
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[LessonView] load failed:', e)
        setError(/404|not found/i.test(String(e?.message || '')) ? 'This module is no longer available.' : 'We could not load this module. Please try again.')
      })
    if (user) api('/progress', { method: 'POST', body: { courseSlug, lessonSlug, step: 'objectives' } }).catch(() => {})
    return () => { cancelled = true }
  }, [courseSlug, lessonSlug, user])
  const complete = async (quizScore) => {
    if (!user) return
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    try { await api('/progress', { method: 'POST', body: { courseSlug, lessonSlug, step: 'done', completed: true, minutesSpent: minutes, quizScore } }) }
    catch (e) { console.error(e) }
  }
  if (error) return (
    <div className="max-w-lg mx-auto text-center py-16 space-y-4">
      <div className="inline-flex h-10 w-10 rounded-full bg-slate-100 items-center justify-center">
        <AlertTriangle className="h-5 w-5 text-slate-500" />
      </div>
      <h1 className="text-xl font-semibold text-slate-900">Module unavailable</h1>
      <p className="text-sm text-slate-600">{error}</p>
      <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="h-10 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium">Back to path</button>
    </div>
  )
  if (!data) return <FullPageLoader />
  const { course, lesson, next, index, total } = data
  if (!lesson || !course) return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Module unavailable</h1>
      <p className="text-sm text-slate-600">This module could not be loaded. Please try again or go back.</p>
      <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Back to path</button>
    </div>
  )
  const pct = Math.round(((step) / (STEPS.length - 1)) * 100)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {course.title}</button>
        <div className="text-xs text-slate-500">Module {index + 1} of {total}</div>
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">{lesson.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{lesson.minutes} minute module · {STEP_LABELS[STEPS[step]] || STEPS[step]}</p>
        </div>
      </div>
      {STEPS[step] === 'objectives' && <StepObjectives lesson={lesson} media={data.media} onNext={() => setStep(1)} />}
      {STEPS[step] === 'theory' && <StepTheory lesson={lesson} onNext={() => setStep(2)} />}
      {STEPS[step] === 'flashcards' && <StepFlashcards lesson={lesson} user={user} onNext={() => setStep(3)} />}
      {STEPS[step] === 'quiz' && <StepQuiz lesson={lesson} onNext={(score) => { setStep(4); complete(score) }} />}
      {STEPS[step] === 'done' && <StepDone lesson={lesson} next={next} courseSlug={courseSlug} onNav={onNav} user={user} />}
      <div className="pt-4 border-t border-slate-100 flex justify-end">
        <FeedbackButton
          pageType="lesson"
          context={{ courseId: courseSlug, courseTitle: course.title, lessonId: lessonSlug, lessonTitle: lesson.title }}
          label="Report an issue with this module"
        />
      </div>
    </div>
  )
}

const StepObjectives = ({ lesson, media, onNext }) => {
  const objectives = Array.isArray(lesson?.objectives) ? lesson.objectives : []
  return (
  <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
    {media?.image && (
      <div>
        <div className="relative">
          <img src={media.image} alt={media.imageAlt || lesson?.title || ''} className="w-full aspect-[16/9] object-cover bg-slate-100" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        </div>
        {(media.imageCaption || media.imageCredit) && (
          <div className="px-4 md:px-6 py-2.5 border-b border-slate-100 bg-slate-50/60 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
            {media.imageCaption && <span className="text-slate-600">{media.imageCaption}</span>}
            {media.imageCredit && <span className="text-slate-400">Photo: {media.imageCredit}</span>}
          </div>
        )}
      </div>
    )}
    <div className="p-6 md:p-8">
      <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Target className="h-3.5 w-3.5" /> Learning objectives</div>
      {objectives.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 italic">No objectives listed for this module.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {objectives.map((o, i) => (
            <li key={i} className="flex gap-3 text-slate-800">
              <div className="h-6 w-6 shrink-0 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">{i + 1}</div>
              <span className="leading-relaxed">{o}</span>
            </li>
          ))}
        </ul>
      )}
      <button onClick={onNext} className="mt-8 w-full sm:w-auto h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center justify-center gap-2 tap">Start module <ArrowRight className="h-4 w-4" /></button>
    </div>
  </section>
)}

const formatInline = (t) => {
  const parts = t.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    return <span key={i}>{p}</span>
  })
}
const MarkdownParagraph = ({ text }) => {
  if (text.trim().startsWith('- ')) {
    const items = text.split('\n').map((l) => l.replace(/^- /, ''))
    return <ul>{items.map((it, i) => <li key={i}>{formatInline(it)}</li>)}</ul>
  }
  return <p>{formatInline(text)}</p>
}

const StepTheory = ({ lesson, onNext }) => {
  const theory = typeof lesson?.theory === 'string' ? lesson.theory : ''
  const paragraphs = theory ? theory.split('\n\n') : []
  const [answers, setAnswers] = useState({})
  const embeds = Array.isArray(lesson?.embedded) ? lesson.embedded : []
  const positions = embeds.length && paragraphs.length ? embeds.map((_, i) => Math.min(paragraphs.length - 1, Math.floor(((i + 1) * paragraphs.length) / (embeds.length + 1)))) : []
  const allEmbedsAnswered = embeds.length === 0 || embeds.every((_, i) => answers[i] !== undefined)
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 prose-lesson">
      <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5 mb-4"><BookOpen className="h-3.5 w-3.5" /> Theory</div>
      {paragraphs.length === 0 ? (
        <p className="text-sm text-slate-500 italic">No theory content available for this module.</p>
      ) : paragraphs.map((p, idx) => {
        const embedIdx = positions.indexOf(idx)
        return (
          <div key={idx}>
            <MarkdownParagraph text={p} />
            {embedIdx !== -1 && embeds[embedIdx] && (
              <EmbeddedQuestion q={embeds[embedIdx]} value={answers[embedIdx]} onAnswer={(v) => setAnswers((a) => ({ ...a, [embedIdx]: v }))} />
            )}
          </div>
        )
      })}
      <button disabled={!allEmbedsAnswered} onClick={onNext} className="mt-4 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
        Continue to study cards <ArrowRight className="h-4 w-4" />
      </button>
      {!allEmbedsAnswered && <p className="mt-2 text-xs text-slate-500">Answer the embedded question to continue.</p>}
    </section>
  )
}

const EmbeddedQuestion = ({ q, value, onAnswer }) => {
  const answered = value !== undefined
  return (
    <div className="not-prose my-6 rounded-xl border border-blue-200 bg-blue-50/40 p-4 md:p-5">
      <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5 mb-2"><Brain className="h-3.5 w-3.5" /> Check your understanding</div>
      <div className="font-medium text-slate-900">{q.q}</div>
      <div className="mt-3 grid gap-2">
        {q.options.map((opt, i) => {
          const chosen = value === i
          const isRight = i === q.correct
          const state = !answered ? 'idle' : chosen && isRight ? 'right' : chosen && !isRight ? 'wrong' : isRight ? 'showRight' : 'muted'
          const cls = {
            idle: 'border-slate-200 bg-white hover:border-blue-400',
            right: 'border-emerald-400 bg-emerald-50 text-emerald-900',
            wrong: 'border-red-400 bg-red-50 text-red-900',
            showRight: 'border-emerald-300 bg-emerald-50/50 text-emerald-900',
            muted: 'border-slate-200 bg-white text-slate-500',
          }[state]
          return (
            <button key={i} disabled={answered} onClick={() => onAnswer(i)} className={`text-left px-4 py-2.5 rounded-lg border ${cls} transition`}>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {opt}
                {answered && isRight && <Check className="h-4 w-4 ml-auto text-emerald-600" />}
                {answered && chosen && !isRight && <X className="h-4 w-4 ml-auto text-red-500" />}
              </div>
            </button>
          )
        })}
      </div>
      {answered && (<div className="mt-3 text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3">{q.explanation}</div>)}
    </div>
  )
}

const StepFlashcards = ({ lesson, user, onNext }) => {
  const cards = Array.isArray(lesson?.flashcards) ? lesson.flashcards : []
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const done = cards.length === 0 || i >= cards.length
  if (done) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 text-center">
        <Layers className="h-6 w-6 text-blue-600 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{cards.length === 0 ? 'No study cards for this module' : 'All study cards reviewed'}</h3>
        <p className="mt-1 text-sm text-slate-600">{cards.length === 0 ? 'Continue to the knowledge check.' : user ? 'They will now enter your spaced-repetition queue for daily practice.' : 'Create a free account to get these cards back for daily review.'}</p>
        <button onClick={onNext} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Take the knowledge check <ArrowRight className="h-4 w-4" /></button>
      </section>
    )
  }
  const c = cards[i]
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-blue-700">
        <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Study Card {i + 1} / {cards.length}</div>
        <div className="text-slate-400">Tap to flip</div>
      </div>
      <button onClick={() => setFlipped((f) => !f)} className="mt-4 w-full min-h-[220px] rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 md:p-8 grid place-items-center text-center">
        <div>
          {!flipped ? (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Question</div>
              <div className="text-lg md:text-xl font-medium text-slate-900 leading-snug">{c.front}</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-blue-700 mb-3">Answer</div>
              <div className="text-lg md:text-xl font-medium text-slate-900 leading-snug">{c.back}</div>
            </>
          )}
        </div>
      </button>
      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-slate-500">Flip and read carefully before moving on.</div>
        <button disabled={!flipped} onClick={() => { setI(i + 1); setFlipped(false) }} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">Next <ArrowRight className="h-4 w-4" /></button>
      </div>
    </section>
  )
}

const StepQuiz = ({ lesson, onNext }) => {
  const questions = Array.isArray(lesson?.quiz) ? lesson.quiz : []
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const score = questions.reduce((s, q, i) => s + (answers[i] === q.correct ? 1 : 0), 0)
  const complete = questions.length > 0 && Object.keys(answers).length === questions.length
  if (questions.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 text-center">
        <Brain className="h-6 w-6 text-blue-600 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">No knowledge check for this module</h3>
        <p className="mt-1 text-sm text-slate-600">You can finish the module.</p>
        <button onClick={() => onNext(0)} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Finish module <Check className="h-4 w-4" /></button>
      </section>
    )
  }
  if (submitted) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Knowledge Check results</div>
        <div className="mt-3">
          <div className="text-4xl font-semibold text-slate-900">{score} <span className="text-slate-400 text-2xl">/ {questions.length}</span></div>
          <div className="text-sm text-slate-600 mt-1">{score === questions.length ? 'Perfect. You nailed it.' : score >= questions.length - 1 ? 'Excellent work.' : score >= questions.length / 2 ? 'Good — review study cards to strengthen weak spots.' : 'Not quite yet — replay the module and try again.'}</div>
        </div>
        <div className="mt-6 space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <div className="font-medium text-slate-900">{i + 1}. {q.q}</div>
              <div className="mt-2 text-sm">
                <div className={answers[i] === q.correct ? 'text-emerald-700' : 'text-red-600'}>Your answer: <strong>{q.options[answers[i]]}</strong></div>
                {answers[i] !== q.correct && <div className="text-emerald-700">Correct: <strong>{q.options[q.correct]}</strong></div>}
                <div className="text-slate-600 mt-1">{q.explanation}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => onNext(score)} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Finish module <Check className="h-4 w-4" /></button>
      </section>
    )
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
      <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Knowledge Check · {questions.length} questions</div>
      {questions.map((q, i) => (
        <div key={i}>
          <div className="font-medium text-slate-900">{i + 1}. {q.q}</div>
          <div className="mt-3 grid gap-2">
            {q.options.map((opt, j) => (
              <button key={j} onClick={() => setAnswers({ ...answers, [i]: j })} className={`text-left px-4 py-2.5 rounded-lg border text-sm ${answers[i] === j ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white hover:border-blue-400'}`}>
                <span className="font-medium mr-1">{String.fromCharCode(65 + j)}.</span> {opt}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button disabled={!complete} onClick={() => setSubmitted(true)} className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2">
        Submit knowledge check <ArrowRight className="h-4 w-4" />
      </button>
    </section>
  )
}

const StepDone = ({ lesson, next, courseSlug, onNav, user }) => {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  useEffect(() => { api(`/comments/${courseSlug}/${lesson.slug}`).then(setComments).catch(() => {}) }, [courseSlug, lesson.slug])
  const post = async () => {
    if (!text.trim() || !user) return
    try {
      const { comment } = await api('/comments', { method: 'POST', body: { courseSlug, lessonSlug: lesson.slug, text } })
      setComments([comment, ...comments]); setText('')
    } catch (e) { console.error(e) }
  }
  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8 text-center">
        <PartyPopper className="h-6 w-6 text-emerald-600 mx-auto" />
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">Module complete</h3>
        <p className="mt-1 text-sm text-slate-700">{user ? 'Your study cards are now in the practice queue. Come back tomorrow to keep them fresh.' : 'Nice work. Keep going with the next module.'}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {next && (
            <button onClick={() => onNav({ name: 'lesson', courseSlug, lessonSlug: next.slug })} className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Next: {next.title} <ArrowRight className="h-4 w-4" /></button>
          )}
          <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="h-11 px-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium">Back to path</button>
        </div>
      </div>
      {!user && <SaveProgressBanner />}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h4 className="font-semibold text-slate-900">Discussion</h4>
        <p className="text-sm text-slate-500 mt-0.5">Ask a question or share something you learned.</p>
        {user ? (
          <div className="mt-3 flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="flex-1 h-10 rounded-lg border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={post} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Post</button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600"><a href="/login" className="text-blue-700 font-medium hover:underline">Log in</a> or <a href="/register" className="text-blue-700 font-medium hover:underline">create a free account</a> to join the discussion.</p>
        )}
        <div className="mt-4 space-y-3">
          {comments.length === 0 && <div className="text-sm text-slate-400">Be the first to comment.</div>}
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="text-slate-900"><strong className="font-medium">{c.userName}</strong> <span className="text-slate-400 text-xs">· {new Date(c.createdAt).toLocaleDateString()}</span></div>
              <div className="text-slate-700">{c.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const StudyView = ({ user, onNav }) => {
  const [card, setCard] = useState(null)
  const [source, setSource] = useState(null)
  const [stats, setStats] = useState({ due: 0, weak: 0, total: 0, remainingDue: 0 })
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [done, setDone] = useState(false)
  const [ended, setEnded] = useState(false)
  const [includeNew, setIncludeNew] = useState(true)
  const [session, setSession] = useState({ studied: 0, correct: 0, again: 0, hard: 0, startedAt: Date.now(), estimatedNextReviews: [] })
  const seenIds = useRef(new Set())

  const load = useCallback(async (opts = {}) => {
    if (!user) return
    setLoading(true)
    try {
      const exclude = [...seenIds.current].join(',')
      const qs = new URLSearchParams()
      if (exclude) qs.set('exclude', exclude)
      if (opts.includeNew ?? includeNew) qs.set('includeNew', '1')
      const r = await api(`/study/next?${qs}`)
      if (r.done) {
        setDone(true); setCard(null); setSource(null)
        setStats(r.stats || stats)
      } else {
        setCard(r.card); setSource(r.source); setStats(r.stats); setDone(false)
        setFlipped(false)
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [user, includeNew])

  useEffect(() => { if (user) load() }, [user, load])

  const answer = async (grade) => {
    if (!card) return
    seenIds.current.add(card.id)
    try {
      const r = await api('/reviews/answer', { method: 'POST', body: { reviewId: card.id, grade } })
      const nextReview = r?.card?.dueAt ? new Date(r.card.dueAt) : null
      setSession((s) => ({
        ...s,
        studied: s.studied + 1,
        correct: s.correct + (grade === 'easy' ? 1 : 0),
        hard: s.hard + (grade === 'hard' ? 1 : 0),
        again: s.again + (grade === 'again' ? 1 : 0),
        estimatedNextReviews: nextReview ? [...s.estimatedNextReviews.slice(-9), nextReview] : s.estimatedNextReviews,
      }))
    } catch (e) { console.error(e) }
    await load()
  }

  const endSession = () => setEnded(true)

  const minutes = Math.max(1, Math.round((Date.now() - session.startedAt) / 60000))

  // Session summary after user ends OR when everything is exhausted
  if (ended || (done && session.studied > 0)) {
    const avgAcc = session.studied ? Math.round(((session.correct + session.hard) / session.studied) * 100) : 0
    return (
      <div className="max-w-lg mx-auto text-center pt-8 md:pt-16 space-y-5">
        <Award className="h-9 w-9 text-blue-600 mx-auto" />
        <h1 className="text-2xl md:text-3xl font-semibold text-slate-900">Great study session</h1>
        <p className="text-slate-600">You studied {session.studied} card{session.studied === 1 ? '' : 's'} in {minutes} minute{minutes === 1 ? '' : 's'}.</p>
        <div className="grid grid-cols-3 gap-3 text-center max-w-md mx-auto">
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-2xl font-semibold text-emerald-600">{session.correct}</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Easy</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-2xl font-semibold text-amber-600">{session.hard}</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Hard</div></div>
          <div className="rounded-xl border border-slate-200 bg-white p-4"><div className="text-2xl font-semibold text-red-500">{session.again}</div><div className="text-xs uppercase tracking-wide text-slate-500 mt-1">Again</div></div>
        </div>
        <div className="text-sm text-slate-600">Recall accuracy: <strong>{avgAcc}%</strong></div>
        {session.estimatedNextReviews.length > 0 && (
          <div className="text-xs text-slate-500">Next practice scheduled from <strong>{new Date(Math.min(...session.estimatedNextReviews.map((d) => new Date(d).getTime()))).toLocaleDateString()}</strong> onwards.</div>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button onClick={() => { seenIds.current.clear(); setSession({ studied: 0, correct: 0, again: 0, hard: 0, startedAt: Date.now(), estimatedNextReviews: [] }); setEnded(false); setDone(false); load() }} className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Keep studying <ArrowRight className="h-4 w-4" /></button>
          <button onClick={() => onNav({ name: 'dashboard' })} className="h-11 px-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium">Back to dashboard</button>
        </div>
      </div>
    )
  }

  if (loading && !card) return <FullPageLoader />

  if (done && session.studied === 0) {
    return (
      <div className="max-w-lg mx-auto text-center pt-8 md:pt-16">
        <TrendingUp className="h-8 w-8 text-blue-600 mx-auto" />
        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Nothing to study right now.</h1>
        <p className="mt-2 text-slate-600">Complete a module to add new study cards. Your due cards will show up here.</p>
        <button onClick={() => onNav({ name: 'dashboard' })} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Back to dashboard</button>
        <div className="mt-10">
          <FeedbackButton pageType="study" label="Send feedback about Study" />
        </div>
      </div>
    )
  }

  if (!card) return <FullPageLoader />

  const sourceBadge = ({
    due: { label: 'Due today', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    weak: { label: 'Weak card', className: 'bg-amber-50 text-amber-700 border-amber-200' },
    recent: { label: 'Recently learned', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    random: { label: 'Refresh', className: 'bg-slate-50 text-slate-600 border-slate-200' },
    new: { label: 'New card', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  })[source] || { label: source || 'Card', className: 'bg-slate-50 text-slate-600 border-slate-200' }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      {/* Session header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Study session</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {session.studied} studied · <span className="text-emerald-600">{session.correct} easy</span> · <span className="text-amber-600">{session.hard} hard</span> · <span className="text-red-500">{session.again} again</span> · <Timer className="inline h-3 w-3 -mt-0.5" /> {minutes}m
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input type="checkbox" checked={includeNew} onChange={(e) => setIncludeNew(e.target.checked)} className="h-3.5 w-3.5 accent-blue-600" />
            Include new cards
          </label>
          <button onClick={endSession} className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center gap-1.5"><StopCircle className="h-3.5 w-3.5" /> End study session</button>
        </div>
      </div>

      {/* Priority indicator */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className={`px-2 py-0.5 rounded-full border ${sourceBadge.className}`}>{sourceBadge.label}</span>
        {stats.due > 0 && <span className="text-slate-500">· {stats.due} due today</span>}
        {stats.weak > 0 && <span className="text-slate-500">· {stats.weak} weak</span>}
        {stats.total > 0 && <span className="text-slate-400">· {stats.total} in queue</span>}
        {card.courseTitle && <span className="ml-auto text-slate-400 truncate max-w-[45%]">{card.courseTitle} · {card.lessonTitle}</span>}
      </div>

      {/* Card */}
      <button onClick={() => setFlipped((f) => !f)} className="w-full min-h-[260px] rounded-2xl border border-slate-200 bg-white p-8 grid place-items-center text-center shadow-sm">
        <div>
          {!flipped ? (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Question · tap to reveal</div>
              <div className="text-xl font-medium text-slate-900 leading-snug">{card.front}</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-blue-700 mb-3">Answer</div>
              <div className="text-xl font-medium text-slate-900 leading-snug">{card.back}</div>
            </>
          )}
        </div>
      </button>

      {flipped ? (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <button onClick={() => answer('again')} className="h-14 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium">Again</button>
          <button onClick={() => answer('hard')} className="h-14 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium">Hard</button>
          <button onClick={() => answer('easy')} className="h-14 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium">Easy</button>
        </div>
      ) : (
        <div className="text-center text-sm text-slate-500">Try to recall the answer before revealing.</div>
      )}
    </div>
  )
}

const ChangePasswordCard = () => {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)   // {type:'ok'|'err', text}
  const submit = async (e) => {
    e.preventDefault(); setMsg(null)
    if (next.length < 8) { setMsg({ type: 'err', text: 'New password must be at least 8 characters.' }); return }
    if (next !== confirm) { setMsg({ type: 'err', text: 'New password and confirmation do not match.' }); return }
    if (next === current) { setMsg({ type: 'err', text: 'Please choose a password different from your current one.' }); return }
    setBusy(true)
    try {
      await api('/me/change-password', { method: 'POST', body: { currentPassword: current, newPassword: next, confirmNewPassword: confirm } })
      setMsg({ type: 'ok', text: 'Password updated. You\u2019ll stay signed in on this device. A confirmation email has been sent.' })
      setCurrent(''); setNext(''); setConfirm('')
    } catch (err) {
      setMsg({ type: 'err', text: err?.message || 'Could not update your password. Please try again.' })
    } finally { setBusy(false) }
  }
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="font-semibold text-slate-900">Change password</h3>
      <p className="text-sm text-slate-500 mt-1">Minimum 8 characters. We&rsquo;ll email you a confirmation for every password change.</p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Current password</label>
          <input type="password" required value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">New password</label>
            <input type="password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Confirm new password</label>
            <input type="password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {msg && (
          <div className={`text-sm rounded-md border px-3 py-2 ${msg.type === 'ok' ? 'text-emerald-800 bg-emerald-50 border-emerald-100' : 'text-red-700 bg-red-50 border-red-100'}`}>{msg.text}</div>
        )}
        <button disabled={busy} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
        </button>
      </form>
    </div>
  )
}

const ProfileView = ({ user, setUser, onNav }) => {
  const [name, setName] = useState(user?.name || '')
  // Newsletter UI removed (no newsletter for now). The stored preference is sent back unchanged.
  const newsletter = !!user?.newsletter
  const [country, setCountry] = useState(user?.country || '')
  const [city, setCity] = useState(user?.city || '')
  const [role, setRole] = useState(user?.role || '')
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState(null)
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')
  useEffect(() => { if (user) api('/stats').then(setStats) }, [user])
  const save = async () => {
    const { user: u } = await api('/me/update', { method: 'POST', body: { name, newsletter, country, city, role } })
    setUser(u); setSaved(true); setTimeout(() => setSaved(false), 1500)
  }
  const doDelete = async () => {
    setDeleteErr('')
    if (deleteText.trim() !== 'DELETE') { setDeleteErr('Please type DELETE (all uppercase) to confirm.'); return }
    setDeleting(true)
    try {
      await api('/me/delete', { method: 'POST', body: { confirmation: 'DELETE' } })
      // Full page navigation clears client-side state and forces a fresh auth check.
      if (typeof window !== 'undefined') {
        window.location.href = '/login?deleted=1'
      }
    } catch (e) {
      setDeleteErr(e.message || 'Deletion failed. Please try again in a moment.')
      setDeleting(false)
    }
  }
  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Your profile</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Email</label>
          <div className="w-full h-10 rounded-lg border border-slate-200 px-3 grid items-center bg-slate-50 text-slate-600 text-sm">{user.email}</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Country</label>
            <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Italy" maxLength={60} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">City</label>
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Milan" maxLength={80} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Your role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Prefer not to say</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Authentication</label>
          <div className="text-sm text-slate-600">Signed in via <strong className="font-medium">{user.provider}</strong>. Google login coming soon.</div>
        </div>
        <button onClick={save} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">
          {saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save changes'}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Study statistics</h3>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-semibold text-slate-900">{stats?.lessonsCompleted ?? 0}</div><div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Modules</div></div>
          <div><div className="text-2xl font-semibold text-slate-900">{stats?.flashcardsLearned ?? 0}</div><div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Cards</div></div>
          <div><div className="text-2xl font-semibold text-slate-900">{stats?.minutesStudied ?? 0}m</div><div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Time</div></div>
        </div>
      </div>

      <ChangePasswordCard />

      {/* GDPR Art. 17 — self-service Right to erasure. Visually separated + danger-styled. */}
      <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-red-100 grid place-items-center shrink-0">
            <AlertTriangle className="h-5 w-5 text-red-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-red-900">Danger zone — Delete my account</h3>
            <p className="mt-1 text-sm text-red-800/90 leading-relaxed">
              This will permanently erase your account, your learning mastery, every study card practice record, all comments you have posted, and your newsletter preferences. Some anonymised statistics may be retained (with no personal data). This action is <strong className="font-semibold">permanent and cannot be undone</strong>.
            </p>
            <p className="mt-2 text-xs text-red-700/80">
              Want a copy of your data first? Email <a href="mailto:hello@onlinespiritsclub.com" className="underline">hello@onlinespiritsclub.com</a> from this address and we&rsquo;ll send you a GDPR data export within 30 days.
            </p>
            <button
              type="button"
              onClick={() => { setDeleteText(''); setDeleteErr(''); setShowDelete(true) }}
              className="mt-4 h-10 px-4 rounded-lg border border-red-300 bg-white hover:bg-red-100 text-red-700 text-sm font-medium inline-flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete my account
            </button>
          </div>
        </div>
      </div>

      {showDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => !deleting && setShowDelete(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 grid place-items-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-red-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Delete your account?</h3>
                  <p className="mt-1 text-sm text-slate-700">
                    <strong className="font-medium">This action is permanent and cannot be undone.</strong>
                  </p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 rounded-md bg-slate-50 border border-slate-200 p-3">
                <li>🗑️ Your account &amp; profile ({user?.email})</li>
                <li>🗑️ Every module mastery record</li>
                <li>🗑️ All study card practice history</li>
                <li>🗑️ Every comment you have posted</li>
                <li>🗑️ Newsletter subscription and preferences</li>
                <li>⚠️ A one-way hashed audit row is retained (no personal data) to prove consent was withdrawn — as required by GDPR accountability.</li>
              </ul>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Type <code className="font-mono px-1 rounded bg-slate-100">DELETE</code> to confirm:</label>
                <input
                  autoFocus
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={deleting}
                />
              </div>
              {deleteErr && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-2">{deleteErr}</div>}
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDelete(false)}
                disabled={deleting}
                className="h-10 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={doDelete}
                disabled={deleting || deleteText.trim() !== 'DELETE'}
                className="h-10 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const AdminView = () => {
  const [category, setCategory] = useState('Rum')
  const [level, setLevel] = useState('Beginner')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])
  const [ok, setOk] = useState(false)
  useEffect(() => { api('/admin/generations').then(setItems).catch(() => {}) }, [])
  const submit = async () => {
    const { generation } = await api('/admin/generate', { method: 'POST', body: { category, level, notes } })
    setItems([generation, ...items]); setOk(true); setNotes(''); setTimeout(() => setOk(false), 1200)
  }
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Admin · Content pipeline</h1>
        <p className="mt-1 text-sm text-slate-500">Queue new courses for AI generation. Generated content will be editable before publishing.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-white">
              {['Rum','Tequila','Vodka','Liqueurs','Cocktails','Beer','Wine','Hospitality'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-white">
              {['Beginner','Intermediate','Advanced'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1.5">Notes / brief</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional creative direction for the LLM" className="w-full rounded-lg border border-slate-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={submit} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">
          {ok ? <><Check className="h-4 w-4" /> Queued</> : 'Queue generation'}
        </button>
      </div>
      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Recent requests</h3>
        <div className="space-y-2">
          {items.length === 0 && <div className="text-sm text-slate-400">No generations yet.</div>}
          {items.map((it) => (
            <div key={it.id} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between text-sm">
              <div><strong>{it.category}</strong> · {it.level}</div>
              <div className="text-slate-500 text-xs">{it.status} · {new Date(it.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
