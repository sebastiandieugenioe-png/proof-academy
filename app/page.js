'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import {
  GlassWater, Flame, Sparkles, ChevronRight, ChevronLeft, Check, X,
  BookOpen, Brain, Layers, Target, Loader2, LogOut, User as UserIcon,
  Home, Wrench, ArrowRight, PartyPopper, Repeat, TrendingUp,
  Zap, StopCircle, Timer, Award, Smartphone, Trash2, AlertTriangle,
} from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import OscLogo from '@/components/OscLogo'

const ICONS = { Flame, GlassWater, Sparkles }

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
      } catch { /* not logged in */ }
      setBooting(false)
    })()
  }, [])

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
            {route.name === 'landing' && <Landing courses={courses} onCta={() => { if (typeof window !== 'undefined') window.location.href = '/register' }} />}
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

const TopBar = ({ user, onNav, onLogout }) => (
  <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur">
    <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
      <Logo onClick={() => onNav(user ? { name: 'dashboard' } : { name: 'landing' })} />
      <nav className="flex items-center gap-1">
        {user ? (
          <>
            <button onClick={() => onNav({ name: 'study' })} className="hidden md:inline-flex text-sm px-3 h-9 items-center rounded-md hover:bg-slate-100 text-slate-700">Study</button>
            <button onClick={() => onNav({ name: 'profile' })} className="hidden md:inline-flex text-sm px-3 h-9 items-center rounded-md hover:bg-slate-100 text-slate-700">Profile</button>
            <button onClick={onLogout} className="text-sm px-3 h-9 inline-flex items-center gap-1.5 rounded-md hover:bg-slate-100 text-slate-600"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Log out</span></button>
          </>
        ) : (
          <button onClick={() => { if (typeof window !== 'undefined') window.location.href = '/login' }} className="text-sm h-9 px-3 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700 font-medium">Log in</button>
        )}
      </nav>
    </div>
  </header>
)

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

const Landing = ({ courses, onCta }) => (
  <div className="space-y-16 pt-4 md:pt-10">
    <section className="text-center max-w-3xl mx-auto">
      <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800 mb-6">
        <Sparkles className="h-3.5 w-3.5" /> Free forever · evidence-based · no ads
      </div>
      <h1 className="text-4xl md:text-6xl font-semibold tracking-tight text-slate-900">
        Master spirits, cocktails <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">& hospitality.</span>
      </h1>
      <p className="mt-5 text-lg text-slate-600 leading-relaxed">
        The free, science-based platform to learn behind-the-bar knowledge in 3–5 minute lessons. Active recall, flashcards, spaced repetition. No XP, no streaks — just real learning.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a href="/register" className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm inline-flex items-center gap-2">Start free <ArrowRight className="h-4 w-4" /></a>
        <a href="#courses" className="h-11 px-6 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-800 font-medium">See courses</a>
      </div>
      <p className="mt-4 text-xs text-slate-400">Free forever. No ads. No credit card required.</p>
    </section>

    <section className="grid gap-4 md:grid-cols-4">
      {[
        { icon: Brain, title: 'Active recall', body: 'Embedded questions and quizzes proven to strengthen memory.' },
        { icon: Repeat, title: 'Spaced repetition', body: 'Anki-inspired study sessions that surface cards right before you forget.' },
        { icon: Layers, title: 'Microlearning', body: '3–5 minute lessons that fit between shifts, classes, or coffees.' },
        { icon: Target, title: 'For real bartenders', body: 'Built for barbacks, waiters, students — the pros of tomorrow.' },
      ].map((f, i) => (
        <div key={i} className="rounded-xl border border-slate-200 bg-white p-5">
          <f.icon className="h-5 w-5 text-blue-600" />
          <h3 className="mt-3 font-semibold text-slate-900">{f.title}</h3>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{f.body}</p>
        </div>
      ))}
    </section>

    <section id="courses" className="space-y-4">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">Beginner learning paths</h2>
        <p className="text-sm text-slate-500 hidden md:block">More coming: Hospitality &amp; Intermediate levels.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {courses.map((c) => <CourseCard key={c.slug} course={c} onClick={onCta} />)}
      </div>
    </section>

    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-8 md:p-10 text-center">
      <PartyPopper className="h-6 w-6 text-blue-600 mx-auto" />
      <h3 className="mt-3 text-2xl font-semibold text-slate-900">Ready to actually learn?</h3>
      <p className="mt-2 text-slate-600 max-w-md mx-auto">Create a free account and start your first lesson. Newsletter is optional.</p>
      <a href="/register" className="mt-5 inline-flex h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium items-center">Get started free</a>
    </section>
  </div>
)

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
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{course.level} · {course.lessonCount} lessons</div>
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
        <StatCard label="Lessons completed" value={stats?.lessonsCompleted ?? 0} icon={BookOpen} />
        <StatCard label="Flashcards learned" value={stats?.flashcardsLearned ?? 0} icon={Layers} />
        <StatCard label="Cards to study" value={stats?.reviewsDue ?? 0} icon={Brain} highlight={stats?.reviewsDue > 0} onClick={() => onNav({ name: 'study' })} />
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
  const [progress, setProgress] = useState([])
  useEffect(() => {
    api(`/courses/${slug}`).then(setCourse).catch(() => {})
    if (user) api('/progress').then(setProgress)
  }, [slug, user])
  if (!course) return <FullPageLoader />
  const Icon = ICONS[course.icon] || BookOpen
  const doneSet = new Set(progress.filter((p) => p.completed && p.courseSlug === slug).map((p) => p.lessonSlug))
  return (
    <div className="space-y-8">
      <button onClick={() => onNav({ name: 'dashboard' })} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> Dashboard</button>
      <div className="flex items-start gap-4">
        <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${course.accent} grid place-items-center text-white shadow-sm`}>
          <Icon className="h-7 w-7" />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{course.level} · {course.lessons.length} lessons</div>
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">{course.title}</h1>
          <p className="mt-1.5 text-slate-600 max-w-2xl">{course.tagline}</p>
        </div>
      </div>
      <ol className="space-y-2.5">
        {course.lessons.map((l, i) => {
          const done = doneSet.has(l.slug)
          return (
            <li key={l.slug}>
              <button onClick={() => onNav({ name: 'lesson', courseSlug: slug, lessonSlug: l.slug })} className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 md:p-5 flex items-center gap-4 card-hover">
                <div className={`h-9 w-9 shrink-0 rounded-full grid place-items-center text-sm font-semibold ${done ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-slate-900">{l.title}</div>
                  <div className="text-xs text-slate-500">{l.minutes} min · Theory · Flashcards · Quiz</div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const STEPS = ['objectives', 'theory', 'flashcards', 'quiz', 'done']
const LessonView = ({ courseSlug, lessonSlug, user, onNav }) => {
  const [data, setData] = useState(null)
  const [step, setStep] = useState(0)
  const startedAt = useMemo(() => Date.now(), [courseSlug, lessonSlug])
  useEffect(() => {
    setData(null); setStep(0)
    api(`/lessons/${courseSlug}/${lessonSlug}`).then(setData).catch(() => {})
    if (user) api('/progress', { method: 'POST', body: { courseSlug, lessonSlug, step: 'objectives' } }).catch(() => {})
  }, [courseSlug, lessonSlug, user])
  const complete = async (quizScore) => {
    if (!user) return
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000))
    try { await api('/progress', { method: 'POST', body: { courseSlug, lessonSlug, step: 'done', completed: true, minutesSpent: minutes, quizScore } }) }
    catch (e) { console.error(e) }
  }
  if (!data) return <FullPageLoader />
  const { course, lesson, next, index, total } = data
  if (!lesson) return (
    <div className="max-w-lg mx-auto text-center py-12 space-y-4">
      <h1 className="text-xl font-semibold text-slate-900">Lesson unavailable</h1>
      <p className="text-sm text-slate-600">This lesson could not be loaded. Please try again or go back.</p>
      <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm">Back to course</button>
    </div>
  )
  const pct = Math.round(((step) / (STEPS.length - 1)) * 100)
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ChevronLeft className="h-4 w-4" /> {course.title}</button>
        <div className="text-xs text-slate-500">Lesson {index + 1} of {total}</div>
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">{lesson.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{lesson.minutes} minute lesson · {STEPS[step].charAt(0).toUpperCase() + STEPS[step].slice(1)}</p>
        </div>
      </div>
      {STEPS[step] === 'objectives' && <StepObjectives lesson={lesson} media={data.media} onNext={() => setStep(1)} />}
      {STEPS[step] === 'theory' && <StepTheory lesson={lesson} onNext={() => setStep(2)} />}
      {STEPS[step] === 'flashcards' && <StepFlashcards lesson={lesson} onNext={() => setStep(3)} />}
      {STEPS[step] === 'quiz' && <StepQuiz lesson={lesson} onNext={(score) => { setStep(4); complete(score) }} />}
      {STEPS[step] === 'done' && <StepDone lesson={lesson} next={next} courseSlug={courseSlug} onNav={onNav} user={user} />}
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
        <p className="mt-4 text-sm text-slate-500 italic">No objectives listed for this lesson.</p>
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
      <button onClick={onNext} className="mt-8 w-full sm:w-auto h-12 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center justify-center gap-2 tap">Start lesson <ArrowRight className="h-4 w-4" /></button>
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
        <p className="text-sm text-slate-500 italic">No theory content available for this lesson.</p>
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
        Continue to flashcards <ArrowRight className="h-4 w-4" />
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

const StepFlashcards = ({ lesson, onNext }) => {
  const cards = Array.isArray(lesson?.flashcards) ? lesson.flashcards : []
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const done = cards.length === 0 || i >= cards.length
  if (done) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 text-center">
        <Layers className="h-6 w-6 text-blue-600 mx-auto" />
        <h3 className="mt-3 text-lg font-semibold text-slate-900">{cards.length === 0 ? 'No flashcards for this lesson' : 'All flashcards reviewed'}</h3>
        <p className="mt-1 text-sm text-slate-600">{cards.length === 0 ? 'Continue to the quiz.' : 'They will now enter your spaced-repetition queue for daily study.'}</p>
        <button onClick={onNext} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Take the quiz <ArrowRight className="h-4 w-4" /></button>
      </section>
    )
  }
  const c = cards[i]
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-blue-700">
        <div className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Flashcard {i + 1} / {cards.length}</div>
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
        <h3 className="mt-3 text-lg font-semibold text-slate-900">No quiz for this lesson</h3>
        <p className="mt-1 text-sm text-slate-600">You can finish the lesson.</p>
        <button onClick={() => onNext(0)} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Finish lesson <Check className="h-4 w-4" /></button>
      </section>
    )
  }
  if (submitted) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8">
        <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Quiz results</div>
        <div className="mt-3">
          <div className="text-4xl font-semibold text-slate-900">{score} <span className="text-slate-400 text-2xl">/ {questions.length}</span></div>
          <div className="text-sm text-slate-600 mt-1">{score === questions.length ? 'Perfect. You nailed it.' : score >= questions.length - 1 ? 'Excellent work.' : score >= questions.length / 2 ? 'Good — review flashcards to strengthen weak spots.' : 'Not quite yet — replay the lesson and try again.'}</div>
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
        <button onClick={() => onNext(score)} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Finish lesson <Check className="h-4 w-4" /></button>
      </section>
    )
  }
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 space-y-6">
      <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Brain className="h-3.5 w-3.5" /> Quiz · {questions.length} questions</div>
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
        Submit quiz <ArrowRight className="h-4 w-4" />
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
        <h3 className="mt-3 text-2xl font-semibold text-slate-900">Lesson complete</h3>
        <p className="mt-1 text-sm text-slate-700">Your flashcards are now in the study queue. Come back tomorrow to keep them fresh.</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {next && (
            <button onClick={() => onNav({ name: 'lesson', courseSlug, lessonSlug: next.slug })} className="h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">Next: {next.title} <ArrowRight className="h-4 w-4" /></button>
          )}
          <button onClick={() => onNav({ name: 'course', slug: courseSlug })} className="h-11 px-6 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-medium">Back to course</button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h4 className="font-semibold text-slate-900">Discussion</h4>
        <p className="text-sm text-slate-500 mt-0.5">Ask a question or share something you learned.</p>
        <div className="mt-3 flex gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="flex-1 h-10 rounded-lg border border-slate-200 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={post} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Post</button>
        </div>
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
          <div className="text-xs text-slate-500">Next reviews scheduled from <strong>{new Date(Math.min(...session.estimatedNextReviews.map((d) => new Date(d).getTime()))).toLocaleDateString()}</strong> onwards.</div>
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
        <p className="mt-2 text-slate-600">Complete a lesson to add new flashcards. Your due cards will show up here.</p>
        <button onClick={() => onNav({ name: 'dashboard' })} className="mt-6 h-11 px-6 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium">Back to dashboard</button>
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
  const [newsletter, setNewsletter] = useState(user?.newsletter || false)
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
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <label className="flex items-start gap-2.5 text-sm text-slate-800 cursor-pointer">
            <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-blue-600" />
            <span>
              <span className="font-medium">Subscribe to the free weekly newsletter.</span>
              <span className="block text-xs text-slate-600 mt-0.5 leading-relaxed">
                One short email per week — new mini-lessons, curated flashcards, cocktail history and hospitality tips. No ads. Unsubscribe anytime.
              </span>
            </span>
          </label>
          {user?.newsletter && user?.newsletterConsentAt && (
            <p className="text-[11px] text-slate-500">
              Subscribed since {new Date(user.newsletterConsentAt).toLocaleDateString()}.
            </p>
          )}
          {!user?.newsletter && user?.newsletterWithdrawnAt && (
            <p className="text-[11px] text-slate-500">
              Unsubscribed on {new Date(user.newsletterWithdrawnAt).toLocaleDateString()}. You can re-subscribe by ticking the box.
            </p>
          )}
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Service emails (password reset, security, account deletion) are sent regardless — they&rsquo;re required to run your account.
          </p>
        </div>
        <button onClick={save} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium inline-flex items-center gap-2">
          {saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save changes'}
        </button>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="font-semibold text-slate-900">Study statistics</h3>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div><div className="text-2xl font-semibold text-slate-900">{stats?.lessonsCompleted ?? 0}</div><div className="text-xs text-slate-500 uppercase tracking-wide mt-1">Lessons</div></div>
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
              This will permanently erase your account, your learning progress, every flashcard review, all comments you have posted, and your newsletter preferences. Some anonymised statistics may be retained (with no personal data). This action is <strong className="font-semibold">permanent and cannot be undone</strong>.
            </p>
            <p className="mt-2 text-xs text-red-700/80">
              Want a copy of your data first? Email <a href="mailto:privacy@onlinespiritsclub.com" className="underline">privacy@onlinespiritsclub.com</a> from this address and we&rsquo;ll send you a GDPR data export within 30 days.
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
                <li>🗑️ Every lesson progress record</li>
                <li>🗑️ All flashcard-review history</li>
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
