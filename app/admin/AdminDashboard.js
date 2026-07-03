'use client'

import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  ArrowLeft, ChevronDown, ChevronRight, Check, X, Trash2, Send, Undo2, Eye,
  Loader2, LogOut, MessageSquare, Users as UsersIcon, Mail, BookOpen, Plus,
  BarChart3, TrendingUp, Search, Download, Save, AlertCircle, Filter,
  ImageIcon, Upload, Link2, RefreshCcw, RefreshCw, FileText, Globe, Settings, Copy,
} from 'lucide-react'

const api = async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: BarChart3 },
  { key: 'learning', label: 'Learning', icon: TrendingUp },
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'pages', label: 'Pages', icon: FileText },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'newsletter', label: 'Newsletter', icon: Mail },
]

export default function AdminDashboard({ adminEmail }) {
  const [tab, setTab] = useState('overview')
  const [openCourse, setOpenCourse] = useState(null)
  const [openUser, setOpenUser] = useState(null)

  const logout = async () => { await api('/admin-auth/logout', { method: 'POST' }); window.location.href = '/' }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-900 text-white grid place-items-center text-xs font-bold">OSC</div>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-tight">Admin</div>
              <div className="text-[11px] text-slate-500 leading-tight">{adminEmail}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-sm h-9 px-3 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 text-slate-700"><Eye className="h-3.5 w-3.5" /> View site</a>
            <button onClick={logout} className="text-sm h-9 px-3 rounded-md hover:bg-slate-100 text-slate-600 inline-flex items-center gap-1.5"><LogOut className="h-3.5 w-3.5" /> Sign out</button>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-2 overflow-x-auto">
          <div className="flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon; const active = tab === t.key
              return (
                <button key={t.key} onClick={() => { setTab(t.key); setOpenCourse(null); setOpenUser(null) }}
                  className={`px-3 h-11 inline-flex items-center gap-1.5 text-sm border-b-2 whitespace-nowrap ${active ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'overview' && <Overview />}
        {tab === 'learning' && <LearningAnalytics />}
        {tab === 'courses' && (openCourse ? <CourseEditor slug={openCourse} onBack={() => setOpenCourse(null)} onSlugChanged={(next) => setOpenCourse(next)} /> : <CoursesList onOpen={setOpenCourse} />)}
        {tab === 'pages' && <PagesManager />}
        {tab === 'comments' && <CommentsView />}
        {tab === 'users' && (openUser ? <UserDetail id={openUser} onBack={() => setOpenUser(null)} /> : <UsersView onOpen={setOpenUser} />)}
        {tab === 'newsletter' && <NewsletterView />}
      </main>
    </div>
  )
}

/* ===================== OVERVIEW ===================== */
function Overview() {
  const [data, setData] = useState(null)
  const [ver, setVer] = useState(null)
  useEffect(() => { api('/admin/overview').then(setData).catch(console.error) }, [])
  useEffect(() => { api('/admin/version').then(setVer).catch(() => setVer(null)) }, [])
  if (!data) return <Spinner />
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Overview</h1>
        <p className="text-sm text-slate-500">A high-level snapshot of the platform.</p>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Users</div>
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Total registered" value={data.users.total} />
          <Stat label="New in last 7 days" value={data.users.last7d} accent />
          <Stat label="New in last 30 days" value={data.users.last30d} />
          <Stat label="Newsletter opt-ins" value={data.users.newsletter} />
          <Stat label="Active (ever)" value={data.users.active} />
          <Stat label="Active last 7 days" value={data.users.active7d} accent />
        </div>
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Learning</div>
        <div className="grid gap-3 md:grid-cols-4">
          <Stat label="Lessons completed" value={data.learning.lessonsCompleted} />
          <Stat label="Course completions" value={data.learning.courseCompletions} />
          <Stat label="Flashcard reviews" value={data.learning.cardsReviewed} />
          <Stat label="Quizzes taken" value={data.learning.quizzesTaken} />
          <Stat label="Average quiz score" value={data.learning.avgQuizScore != null ? `${data.learning.avgQuizScore} / 5` : '—'} accent />
          <Stat label="Course completion rate" value={`${data.learning.completionRate}%`} />
        </div>
      </div>
      {ver && (
        <div className="pt-4 border-t border-slate-100 text-[11px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
          <span>Build: <span className="text-slate-500">{ver.version}</span></span>
          <span>Env: <span className="text-slate-500">{ver.env}</span></span>
          {ver.builtAt && <span>Built: <span className="text-slate-500">{ver.builtAt}</span></span>}
          {ver.node && <span>Node: <span className="text-slate-500">{ver.node}</span></span>}
        </div>
      )}
    </div>
  )
}

/* ================ LEARNING ANALYTICS ================ */
function LearningAnalytics() {
  const [d, setD] = useState(null)
  useEffect(() => { api('/admin/analytics').then(setD).catch(console.error) }, [])
  if (!d) return <Spinner />
  const max = (arr, key) => Math.max(1, ...arr.map((r) => r[key] || 0))
  const mStarted = max(d.byCourse, 'started')
  const mReviews = max(d.dailyReviews, 'count')
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Learning analytics</h1>
        <p className="text-sm text-slate-500">Course &amp; lesson usage, drop-off, and daily reviews.</p>
      </div>

      <Section title="Course activity" note="Started vs completed by unique user × course.">
        <div className="space-y-2">
          {d.byCourse.length === 0 && <Empty>No progress data yet.</Empty>}
          {d.byCourse.map((c) => (
            <div key={c.slug} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="font-medium text-slate-900">/{c.slug}</div>
                <div className="text-slate-500 text-xs">avg quiz: {c.avgQuiz ?? '—'}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <BarRow label={`Started ${c.started}`} value={c.started} max={mStarted} color="bg-blue-500" />
                <BarRow label={`Completed ${c.completed}`} value={c.completed} max={mStarted} color="bg-emerald-500" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {d.audience && <AudienceInsights audience={d.audience} />}

      <Section title="Most completed lessons" note="Top 20 lessons by completion count.">
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="text-left px-4 py-2">Course</th><th className="text-left px-4 py-2">Lesson</th><th className="text-right px-4 py-2">Started</th><th className="text-right px-4 py-2">Completed</th></tr>
            </thead>
            <tbody>
              {d.byLesson.map((l) => (
                <tr key={`${l.courseSlug}/${l.lessonSlug}`} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600">/{l.courseSlug}</td>
                  <td className="px-4 py-2 text-slate-900">{l.lessonSlug}</td>
                  <td className="px-4 py-2 text-right">{l.started}</td>
                  <td className="px-4 py-2 text-right font-medium">{l.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Highest drop-off lessons" note="Lessons with lowest completion rate (min 2 starts).">
        <div className="space-y-2">
          {d.dropoff.length === 0 && <Empty>No drop-off data yet.</Empty>}
          {d.dropoff.map((r) => (
            <div key={`${r.courseSlug}/${r.lessonSlug}`} className="rounded-lg border border-slate-200 bg-white p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">{r.lessonSlug}</div>
                <div className="text-xs text-slate-500">/{r.courseSlug} · {r.completed}/{r.started} completed</div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-red-600">{r.dropoff}%</div>
                <div className="text-[11px] text-slate-500">drop-off</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Daily flashcard reviews" note="Last 30 days with any review activity.">
        <div className="rounded-lg border border-slate-200 bg-white p-3 overflow-x-auto">
          <div className="flex items-end gap-1 h-24 min-w-full">
            {d.dailyReviews.length === 0 && <div className="text-sm text-slate-400">No reviews yet.</div>}
            {d.dailyReviews.map((day) => (
              <div key={day.date} className="flex-1 min-w-[10px] flex flex-col items-center gap-1">
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.max(4, (day.count / mReviews) * 100)}%` }} title={`${day.date}: ${day.count}`}></div>
                <div className="text-[9px] text-slate-400">{day.date.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </div>
  )
}

const BarRow = ({ label, value, max, color }) => (
  <div>
    <div className="text-slate-600 mb-1">{label}</div>
    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full ${color}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  </div>
)
const Section = ({ title, note, children }) => (
  <div>
    <div className="flex items-baseline justify-between mb-2">
      <h3 className="font-semibold text-slate-900">{title}</h3>
      {note && <p className="text-xs text-slate-500">{note}</p>}
    </div>
    {children}
  </div>
)
const Empty = ({ children }) => <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">{children}</div>

/* ==================== AUDIENCE INSIGHTS ==================== */
function AudienceInsights({ audience }) {
  const { byCountry = [], byCity = [], byRole = [], newsletterByRole = [], totalUsers = 0 } = audience || {}
  const withProfile = byCountry.reduce((s, r) => s + r.count, 0)
  const roleCoverage = byRole.reduce((s, r) => s + r.count, 0)
  const maxCountry = Math.max(1, ...byCountry.map((r) => r.count))
  const maxCity = Math.max(1, ...byCity.map((r) => r.count))
  const maxRole = Math.max(1, ...byRole.map((r) => r.count))
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Audience insights</h2>
        <p className="text-xs text-slate-500">Signals collected at signup. {withProfile}/{totalUsers} users shared their country, {roleCoverage}/{totalUsers} their role.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Users by country" note="Top 30 countries.">
          {byCountry.length === 0 ? <Empty>No country data yet. Ask users to fill in profile.</Empty> : (
            <div className="space-y-1.5">
              {byCountry.map((r) => (
                <div key={r.country} className="flex items-center gap-2 text-sm">
                  <div className="w-32 truncate text-slate-700 shrink-0">{r.country}</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-blue-500" style={{ width: `${(r.count / maxCountry) * 100}%` }} /></div>
                  <div className="w-8 text-right text-xs text-slate-500 tabular-nums">{r.count}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
        <Section title="Users by role / status" note="Distribution across roles.">
          {byRole.length === 0 ? <Empty>No role data yet.</Empty> : (
            <div className="space-y-1.5">
              {byRole.map((r) => (
                <div key={r.role} className="flex items-center gap-2 text-sm">
                  <div className="w-40 truncate text-slate-700 shrink-0">{r.role}</div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-indigo-500" style={{ width: `${(r.count / maxRole) * 100}%` }} /></div>
                  <div className="w-8 text-right text-xs text-slate-500 tabular-nums">{r.count}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
      <Section title="Users by city" note="Top 30 cities (city + country).">
        {byCity.length === 0 ? <Empty>No city data yet.</Empty> : (
          <div className="grid gap-1.5 md:grid-cols-2">
            {byCity.map((r) => (
              <div key={`${r.city}-${r.country}`} className="flex items-center gap-2 text-sm">
                <div className="w-40 truncate text-slate-700 shrink-0">{r.city}<span className="text-slate-400 text-xs"> · {r.country}</span></div>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${(r.count / maxCity) * 100}%` }} /></div>
                <div className="w-8 text-right text-xs text-slate-500 tabular-nums">{r.count}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
      <Section title="Newsletter opt-in rate by role" note="Percentage of each role who opted into the newsletter at signup.">
        {newsletterByRole.length === 0 ? <Empty>Not enough role data.</Empty> : (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                <tr><th className="text-left px-4 py-2">Role</th><th className="text-right px-4 py-2">Users</th><th className="text-right px-4 py-2">Opted in</th><th className="text-right px-4 py-2">Rate</th></tr>
              </thead>
              <tbody>
                {newsletterByRole.map((r) => (
                  <tr key={r.role} className="border-t border-slate-100">
                    <td className="px-4 py-2 text-slate-900">{r.role}</td>
                    <td className="px-4 py-2 text-right text-slate-600 tabular-nums">{r.total}</td>
                    <td className="px-4 py-2 text-right text-slate-600 tabular-nums">{r.optedIn}</td>
                    <td className="px-4 py-2 text-right font-medium tabular-nums">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${r.rate >= 70 ? 'bg-emerald-100 text-emerald-800' : r.rate >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{r.rate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

/* ==================== COURSES ===================== */
function CoursesList({ onOpen }) {
  const [courses, setCourses] = useState(null)
  const [filter, setFilter] = useState('all')
  useEffect(() => { api('/courses').then(setCourses) }, [])
  if (!courses) return <Spinner />
  const filtered = courses.filter((c) => {
    if (filter === 'missing-images') return c.lessons.some((l) => !l.hasImage && !l.image)
    return true
  })
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Courses &amp; lessons</h1>
        <p className="text-sm text-slate-500 mt-0.5">Edit any lesson to update theory, quizzes, sources, images and SEO.</p>
      </div>
      <div className="flex gap-2 flex-wrap">
        {['all','missing-images'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`h-8 px-3 rounded-full text-xs font-medium ${filter === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
            {f === 'all' ? 'All courses' : 'Lessons missing images'}
          </button>
        ))}
      </div>
      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.slug}>
            <button onClick={() => onOpen(c.slug)} className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-semibold text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{c.lessonCount} lessons · {c.level} · /{c.slug}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CourseEditor({ slug, onBack, onSlugChanged }) {
  const [course, setCourse] = useState(null)
  const [lessons, setLessons] = useState({})
  const [openIdx, setOpenIdx] = useState(-1)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => setCourse(await api(`/courses/${slug}`)), [slug])
  useEffect(() => { load() }, [load])
  const loadLesson = async (ls) => {
    if (lessons[ls]) return
    const d = await api(`/lessons/${slug}/${ls}`)
    setLessons((m) => ({ ...m, [ls]: d.lesson }))
  }
  const patchLesson = async (ls, next) => {
    setSaving(true)
    try {
      const mergedLessons = course.lessons.map((l) => ({ ...(lessons[l.slug] || l), ...(l.slug === ls ? next : {}) }))
      const merged = { ...course, lessons: mergedLessons }
      const r = await api('/admin/course-override', { method: 'POST', body: { course: merged } })
      if (r?.course?.lessons) {
        const updated = r.course.lessons.find((l) => l.slug === ls)
        if (updated) setLessons((m) => ({ ...m, [ls]: updated }))
      }
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }
  const publishToggle = async (published) => {
    try { await api('/admin/course-publish', { method: 'POST', body: { slug, published } }); toast.success(published ? 'Course published' : 'Course hidden') } catch (e) { toast.error(e.message) }
  }
  if (!course) return <Spinner />
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All courses</button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-500">{course.tagline}</p>
          <p className="text-xs text-slate-400 mt-1">{course.lessons.length} lessons · {course.level}{course.category ? ` · ${course.category}` : ''}</p>
        </div>
        <div className="flex gap-2 items-center">
          {saving && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving</span>}
          <button onClick={() => publishToggle(false)} className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 inline-flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Hide</button>
          <button onClick={() => publishToggle(true)} className="h-9 px-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Publish</button>
        </div>
      </div>

      <CourseSettings course={course} onSaved={(updated, renamed) => {
        setCourse((c) => ({ ...c, ...updated }))
        if (renamed?.to && onSlugChanged) onSlugChanged(renamed.to)
      }} />

      <div className="pt-2">
        <h2 className="text-sm font-medium text-slate-600 uppercase tracking-wide mb-2">Lessons</h2>
      </div>
      <ol className="space-y-2">
        {course.lessons.map((l, i) => (
          <li key={l.slug} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button onClick={async () => { const next = openIdx === i ? -1 : i; setOpenIdx(next); if (next !== -1) await loadLesson(l.slug) }} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50">
              <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">{i + 1}</div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{l.title}</div>
                <div className="text-xs text-slate-500">{l.minutes} min · /{l.slug}</div>
              </div>
              <a href={`/learn/${l.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-slate-500 hover:text-blue-700 inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> View</a>
              {openIdx === i ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>
            {openIdx === i && lessons[l.slug] && (
              <LessonEditor courseSlug={course.slug} lesson={lessons[l.slug]} onSave={(next) => patchLesson(l.slug, next)} onImageUpdated={(img) => setLessons((m) => ({ ...m, [l.slug]: { ...(m[l.slug] || {}), image: img } }))} />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ================ COURSE SETTINGS PANEL ================ */
function CourseSettings({ course, onSaved }) {
  const [title, setTitle] = useState(course.title || '')
  const [slug, setSlug] = useState(course.slug || '')
  const [tagline, setTagline] = useState(course.tagline || '')
  const [category, setCategory] = useState(course.category || '')
  const [level, setLevel] = useState(course.level || 'Beginner')
  const [saving, setSaving] = useState(false)
  const [showRenameWarn, setShowRenameWarn] = useState(false)

  useEffect(() => {
    setTitle(course.title || ''); setSlug(course.slug || ''); setTagline(course.tagline || '')
    setCategory(course.category || ''); setLevel(course.level || 'Beginner')
  }, [course])

  const dirty = title !== (course.title || '') || slug !== (course.slug || '') || tagline !== (course.tagline || '') || category !== (course.category || '') || level !== (course.level || 'Beginner')
  const slugChanged = slug !== (course.slug || '')

  const save = async () => {
    if (slugChanged && !showRenameWarn) { setShowRenameWarn(true); return }
    setSaving(true)
    try {
      const r = await api('/admin/course-meta', {
        method: 'POST',
        body: { originalSlug: course.slug, title, slug, tagline, category, level },
      })
      toast.success(r.renamed ? `Course renamed. Old URL redirects to /learn/${r.renamed.to} (301).` : 'Course settings saved.')
      onSaved?.({ title, slug: r.renamed?.to || slug, tagline, category, level }, r.renamed)
      setShowRenameWarn(false)
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><Settings className="h-4.5 w-4.5" /></div>
        <div>
          <div className="font-semibold text-slate-900 text-sm">Course settings</div>
          <div className="text-[11px] text-slate-500">These changes propagate to landing, dashboard, SEO pages and sitemap.</div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label={<>Slug <span className="text-slate-400 font-normal">(URL path)</span></>}>
          <div className="flex items-center gap-1">
            <div className="h-10 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2 text-xs text-slate-500 inline-flex items-center">/learn/</div>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} maxLength={80} className="flex-1 h-10 rounded-r-lg border border-slate-200 px-3 text-sm font-mono bg-white" />
          </div>
        </F>
        <F label="Description / tagline" className="md:col-span-2">
          <textarea value={tagline} onChange={(e) => setTagline(e.target.value)} rows={2} maxLength={400} className="w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white" />
        </F>
        <F label="Category">
          <input list="osc-cat-list" value={category} onChange={(e) => setCategory(e.target.value)} maxLength={60} placeholder="e.g. Whiskey, Cocktails, Hospitality" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          <datalist id="osc-cat-list">
            {['Whiskey','Gin','Vodka','Rum','Tequila','Liqueurs','Cocktails','Beer','Wine','Hospitality','Fundamentals'].map((c) => <option key={c} value={c} />)}
          </datalist>
        </F>
        <F label="Level label">
          <input list="osc-lvl-list" value={level} onChange={(e) => setLevel(e.target.value)} maxLength={40} placeholder="Beginner / Intermediate / Advanced" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          <datalist id="osc-lvl-list">
            {['Beginner','Intermediate','Advanced','All levels'].map((c) => <option key={c} value={c} />)}
          </datalist>
        </F>
      </div>

      {slugChanged && showRenameWarn && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex gap-2 items-start">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <strong>Renaming a slug is permanent.</strong> The old URL <code className="px-1 py-0.5 rounded bg-white/70">/learn/{course.slug}</code> will 301-redirect to <code className="px-1 py-0.5 rounded bg-white/70">/learn/{slug}</code>. Existing user progress will be migrated. Click Save again to confirm.
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && <span className="text-[11px] text-amber-700">Unsaved changes</span>}
        <button onClick={save} disabled={saving || !dirty || !title.trim() || !slug.trim()} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> {slugChanged && !showRenameWarn ? 'Save (will rename)' : 'Save settings'}</>}
        </button>
      </div>
    </div>
  )
}

function LessonEditor({ courseSlug, lesson, onSave, onImageUpdated }) {
  const [d, setD] = useState(lesson)
  useEffect(() => setD(lesson), [lesson])
  const c = () => onSave(d)
  const s = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const sArr = (k, i, v) => setD((x) => ({ ...x, [k]: x[k].map((it, j) => (j === i ? v : it)) }))
  const handleImageUpdated = (img) => { setD((x) => ({ ...x, image: img })); onImageUpdated?.(img) }
  return (
    <div className="border-t border-slate-100 p-4 space-y-5 bg-slate-50/40">
      <F label="Title"><input value={d.title} onChange={(e) => s('title', e.target.value)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      <div className="grid gap-3 md:grid-cols-3">
        <F label="Minutes"><input type="number" min={2} max={8} value={d.minutes || 4} onChange={(e) => s('minutes', parseInt(e.target.value) || 4)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="Slug"><input value={d.slug} onChange={(e) => s('slug', e.target.value)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono bg-white" /></F>
      </div>
      <F label="Objectives">
        {(d.objectives || []).map((o, i) => (
          <input key={i} value={o} onChange={(e) => sArr('objectives', i, e.target.value)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white mb-2" />
        ))}
      </F>
      <F label="Theory (**bold** and - lists supported)"><textarea value={d.theory} onChange={(e) => s('theory', e.target.value)} onBlur={c} rows={12} className="w-full rounded-lg border border-slate-200 p-3 text-sm bg-white font-serif leading-relaxed" /></F>
      <ArrEditor label="Embedded questions" items={d.embedded || []} onChange={(x) => s('embedded', x)} onCommit={c} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} render={QuizItem} />
      <ArrEditor label="Flashcards" items={d.flashcards || []} onChange={(x) => s('flashcards', x)} onCommit={c} makeNew={() => ({ front: '', back: '' })} render={FlashcardItem} />
      <ArrEditor label="Quiz" items={d.quiz || []} onChange={(x) => s('quiz', x)} onCommit={c} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} render={QuizItem} />
      <ArrEditor label="Sources & citations" items={d.sources || []} onChange={(x) => s('sources', x)} onCommit={c} makeNew={() => ({ label: '', url: '' })} render={SourceItem} />
      <LessonImageEditor courseSlug={courseSlug} lessonSlug={d.slug} image={d.image} onChange={handleImageUpdated} />
      <div className="grid gap-3 md:grid-cols-2">
        <F label="SEO title"><input value={d.seo?.title || ''} onChange={(e) => s('seo', { ...(d.seo || {}), title: e.target.value })} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="SEO description"><input value={d.seo?.description || ''} onChange={(e) => s('seo', { ...(d.seo || {}), description: e.target.value })} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      </div>
    </div>
  )
}

/* ================ LESSON IMAGE EDITOR ================ */
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 8
const MAX_BYTES = MAX_MB * 1024 * 1024

function normalizeImage(img) {
  // Accepts legacy string OR structured object; returns { url, alt, caption, credit, id }
  if (!img) return { url: '', alt: '', caption: '', credit: '', id: null }
  if (typeof img === 'string') return { url: img, alt: '', caption: '', credit: '', id: null }
  return { url: img.url || '', alt: img.alt || '', caption: img.caption || '', credit: img.credit || '', id: img.id || null }
}

function LessonImageEditor({ courseSlug, lessonSlug, image, onChange }) {
  const initial = useMemo(() => normalizeImage(image), [image])
  const [current, setCurrent] = useState(initial)
  const [preview, setPreview] = useState(initial.url)
  const [pendingBlob, setPendingBlob] = useState(null) // { file, previewUrl } — for pre-upload preview
  const [urlInput, setUrlInput] = useState('')
  const [mode, setMode] = useState('upload') // 'upload' | 'url'
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [debug, setDebug] = useState(null) // { resolvedUrl, source, imageId, storedUrl, alt, caption, credit }
  const [debugLoading, setDebugLoading] = useState(false)
  const [debugImgOk, setDebugImgOk] = useState(null) // null=unknown, true, false
  const fileRef = useRef(null)

  // Fetch what the PUBLIC /api/lessons endpoint resolves to (this is the source of truth for both auth + SEO pages).
  const refreshDebug = useCallback(async () => {
    if (!courseSlug || !lessonSlug) return
    setDebugLoading(true)
    try {
      const r = await fetch(`/api/lessons/${courseSlug}/${lessonSlug}`, { cache: 'no-store' })
      const data = await r.json().catch(() => ({}))
      const li = data?.lesson?.image
      const structured = li && typeof li === 'object'
      const storedUrl = structured ? li.url : (typeof li === 'string' ? li : null)
      const mediaImg = data?.media?.image || null
      // Determine which source /api/lessons chose.
      let source = 'unknown'
      if (mediaImg && storedUrl && mediaImg === storedUrl) source = 'custom (admin-managed)'
      else if (mediaImg && mediaImg.startsWith('/api/images/')) source = 'custom (admin-managed)'
      else if (mediaImg === '/placeholder-lesson.svg') source = 'placeholder (default)'
      else if (mediaImg) source = 'fallback (media.js)'
      else source = 'no image'
      const d = {
        resolvedUrl: mediaImg,
        source,
        storedUrl,
        imageId: structured ? (li.id || null) : null,
        alt: data?.media?.imageAlt || '',
        caption: data?.media?.imageCaption || '',
        credit: data?.media?.imageCredit || '',
      }
      setDebug(d)
      // Probe the image URL is publicly reachable
      if (d.resolvedUrl) {
        try {
          const probe = await fetch(d.resolvedUrl, { method: 'HEAD' })
          setDebugImgOk(probe.ok)
        } catch { setDebugImgOk(false) }
      } else {
        setDebugImgOk(null)
      }
    } catch (e) { console.error('debug fetch failed', e) } finally { setDebugLoading(false) }
  }, [courseSlug, lessonSlug])

  useEffect(() => { refreshDebug() }, [refreshDebug])

  useEffect(() => {
    const n = normalizeImage(image)
    setCurrent(n)
    setPreview(n.url)
    setPendingBlob(null)
  }, [image, lessonSlug])

  const dirty = pendingBlob || (
    current.url !== initial.url || current.alt !== initial.alt ||
    current.caption !== initial.caption || current.credit !== initial.credit
  )

  const validateFile = (file) => {
    if (!file) return 'No file selected.'
    if (!ALLOWED_TYPES.includes(file.type)) return `Unsupported type: ${file.type || 'unknown'}. Use JPG, PNG or WebP.`
    if (file.size > MAX_BYTES) return `File too large (${(file.size/1024/1024).toFixed(1)}MB). Max ${MAX_MB}MB.`
    return null
  }

  const pickFile = (file) => {
    const err = validateFile(file)
    if (err) { toast.error(err); return }
    // Revoke previous blob URL to avoid leaks
    if (pendingBlob?.previewUrl) URL.revokeObjectURL(pendingBlob.previewUrl)
    const previewUrl = URL.createObjectURL(file)
    setPendingBlob({ file, previewUrl })
    setPreview(previewUrl)
  }

  const onFileInput = (e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }
  const onDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f) }

  const uploadPending = async () => {
    if (!pendingBlob) return null
    const fd = new FormData()
    fd.append('file', pendingBlob.file)
    const res = await fetch('/api/admin/images', { method: 'POST', body: fd, credentials: 'same-origin' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `Upload failed (HTTP ${res.status})`)
    return data.image
  }

  const importUrl = async () => {
    if (!urlInput.trim()) return
    setBusy(true)
    try {
      const r = await fetch('/api/admin/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ url: urlInput.trim() }) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Import failed (HTTP ${r.status})`)
      setCurrent((c) => ({ ...c, url: data.image.url, id: data.image.id }))
      setPreview(data.image.url)
      setUrlInput('')
      toast.success('Image imported from URL. Click "Save image" to attach it to this lesson.')
    } catch (e) { toast.error(e.message) } finally { setBusy(false) }
  }

  const useExternalUrl = () => {
    if (!urlInput.trim()) return
    if (!/^https?:\/\//i.test(urlInput.trim())) { toast.error('Enter a valid http(s) URL.'); return }
    setCurrent((c) => ({ ...c, url: urlInput.trim(), id: null }))
    setPreview(urlInput.trim())
    setUrlInput('')
    toast('Preview updated. Click "Save image" to attach it.')
  }

  const save = async () => {
    setSaving(true)
    try {
      let imageObj = { ...current }
      if (pendingBlob) {
        toast.loading('Uploading image…', { id: 'imgsave' })
        const info = await uploadPending()
        // Cleanup blob URL
        URL.revokeObjectURL(pendingBlob.previewUrl)
        imageObj = { ...imageObj, url: info.url, id: info.id }
        setPendingBlob(null)
      }
      const r = await fetch('/api/admin/lesson-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ courseSlug, lessonSlug, image: imageObj }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Save failed (HTTP ${r.status})`)
      toast.success('Image saved.', { id: 'imgsave' })
      onChange?.(data.image)
      const n = normalizeImage(data.image)
      setCurrent(n); setPreview(n.url)
      refreshDebug()
    } catch (e) { toast.error(e.message, { id: 'imgsave' }) } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm('Remove image from this lesson? The image file will be permanently deleted.')) return
    setSaving(true)
    try {
      const r = await fetch('/api/admin/lesson-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ courseSlug, lessonSlug, image: null }),
      })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data.error || `Remove failed (HTTP ${r.status})`)
      toast.success('Image removed.')
      onChange?.(null)
      setCurrent({ url: '', alt: '', caption: '', credit: '', id: null })
      setPreview('')
      if (pendingBlob?.previewUrl) URL.revokeObjectURL(pendingBlob.previewUrl)
      setPendingBlob(null)
      refreshDebug()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const replace = () => { setPendingBlob(null); setPreview(''); setCurrent((c) => ({ ...c, url: '', id: null })) }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-700 grid place-items-center"><ImageIcon className="h-4.5 w-4.5" /></div>
          <div>
            <div className="font-semibold text-slate-900 text-sm">Lesson image</div>
            <div className="text-[11px] text-slate-500">16:9 recommended · JPG · PNG · WebP · max {MAX_MB}MB · auto-optimized</div>
          </div>
        </div>
        {(preview || current.url) && (
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={replace} className="h-8 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs inline-flex items-center gap-1.5"><RefreshCcw className="h-3.5 w-3.5" /> Replace</button>
            <button type="button" onClick={remove} disabled={saving} className="h-8 px-3 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 text-xs inline-flex items-center gap-1.5 disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
          </div>
        )}
      </div>

      {/* === DEBUG PANEL === What the PUBLIC /api/lessons endpoint resolves for this lesson. */}
      <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/70 p-3 text-[11px] font-mono leading-relaxed">
        <div className="flex items-center justify-between mb-1.5 font-sans">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium text-[11px]"><AlertCircle className="h-3.5 w-3.5" /> Debug — public resolution ({courseSlug}/{lessonSlug})</div>
          <button type="button" onClick={refreshDebug} disabled={debugLoading} className="h-6 px-2 rounded border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 text-[10px] inline-flex items-center gap-1 disabled:opacity-50">{debugLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />} Refresh</button>
        </div>
        {debug ? (
          <div className="grid gap-y-1 gap-x-3 text-slate-700" style={{ gridTemplateColumns: 'max-content 1fr' }}>
            <div className="text-slate-500">Source</div>
            <div className={
              debug.source.startsWith('custom') ? 'text-emerald-700 font-semibold' :
              debug.source.startsWith('fallback') ? 'text-amber-700 font-semibold' :
              debug.source.startsWith('placeholder') ? 'text-slate-500 font-semibold' :
              'text-red-600 font-semibold'
            }>{debug.source}</div>
            <div className="text-slate-500">GridFS ID</div>
            <div className="break-all">{debug.imageId || <span className="text-slate-400">(none — external URL or fallback)</span>}</div>
            <div className="text-slate-500">Stored on lesson</div>
            <div className="break-all">{debug.storedUrl || <span className="text-slate-400">(no lesson.image field)</span>}</div>
            <div className="text-slate-500">Resolved media.image</div>
            <div className="break-all">{debug.resolvedUrl || <span className="text-slate-400">(null)</span>}</div>
            <div className="text-slate-500">Alt / caption / credit</div>
            <div className="break-all">
              alt=&quot;{debug.alt || ''}&quot; · caption=&quot;{debug.caption || ''}&quot; · credit=&quot;{debug.credit || ''}&quot;
            </div>
            <div className="text-slate-500">URL reachable</div>
            <div>
              {debugImgOk === true && <span className="text-emerald-700">✓ HTTP 200</span>}
              {debugImgOk === false && <span className="text-red-600">✗ HTTP error (image will 404)</span>}
              {debugImgOk === null && <span className="text-slate-400">n/a</span>}
              {debug.resolvedUrl && <a href={debug.resolvedUrl} target="_blank" rel="noreferrer" className="ml-2 text-blue-700 hover:underline">open ↗</a>}
            </div>
          </div>
        ) : (
          <div className="text-slate-400">Loading debug info…</div>
        )}
        <div className="mt-2 pt-2 border-t border-slate-200/70 text-[10px] text-slate-500 font-sans">
          Priority: <b>custom</b> (this admin panel) → <b>fallback</b> (/lib/media.js) → <b>placeholder</b> (/placeholder-lesson.svg). If Source shows &quot;fallback&quot; but you just saved a custom image, hard-refresh the public page (Ctrl+F5) — SEO pages are server-rendered and may be cached on the CDN.
        </div>
      </div>

      {/* Preview */}
      <div className="mt-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
        <div className="relative w-full aspect-[16/9] bg-slate-100">
          {preview ? (
            // Local blob preview — using native img is required (Next.js Image doesn't play well with blob: URLs in this context)
            <img src={preview} alt="preview" className="w-full h-full object-cover" onError={() => { toast.error('Image failed to load.'); }} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-center p-4">
              <div>
                <ImageIcon className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="mt-2 text-xs text-slate-500">No image yet. Upload or paste a URL below.</p>
                <p className="mt-1 text-[11px] text-slate-400">Recommended aspect ratio 16:9 · 1600×900 or larger</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2 text-[10px] font-medium bg-black/50 text-white/95 px-2 py-0.5 rounded">16:9</div>
        </div>
      </div>

      {/* Source picker */}
      {!preview && (
        <div className="mt-3">
          <div className="flex gap-1 mb-2">
            {[{k:'upload',l:'Upload file',i:Upload},{k:'url',l:'Paste URL',i:Link2}].map((t) => (
              <button key={t.k} type="button" onClick={() => setMode(t.k)} className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 ${mode === t.k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                <t.i className="h-3.5 w-3.5" /> {t.l}
              </button>
            ))}
          </div>
          {mode === 'upload' ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}
            >
              <Upload className="h-6 w-6 text-slate-400 mx-auto" />
              <p className="mt-2 text-sm text-slate-700 font-medium">Drop image here or tap to browse</p>
              <p className="text-[11px] text-slate-500 mt-0.5">JPG · PNG · WebP · up to {MAX_MB}MB</p>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onFileInput} className="hidden" />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-xs font-medium text-slate-700">Image URL</label>
              <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://…" className="flex-1 h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono" />
                <div className="flex gap-2">
                  <button type="button" onClick={useExternalUrl} className="h-10 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs whitespace-nowrap">Use as-is</button>
                  <button type="button" onClick={importUrl} disabled={busy || !urlInput.trim()} className="h-10 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs whitespace-nowrap inline-flex items-center gap-1.5 disabled:opacity-60">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Download className="h-3.5 w-3.5" /> Fetch &amp; store</>}</button>
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">&ldquo;Fetch &amp; store&rdquo; downloads &amp; hosts a permanent copy. &ldquo;Use as-is&rdquo; keeps the original URL (breaks if remote goes down).</p>
            </div>
          )}
        </div>
      )}

      {/* Editable pending file bar */}
      {pendingBlob && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span className="truncate">{pendingBlob.file.name} · {(pendingBlob.file.size/1024).toFixed(0)} KB · not saved yet</span>
          </div>
          <button type="button" onClick={() => { URL.revokeObjectURL(pendingBlob.previewUrl); setPendingBlob(null); setPreview(current.url) }} className="text-amber-900 hover:text-amber-700 shrink-0"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Metadata */}
      {(preview || current.url) && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <F label={<>Alt text <span className="text-slate-400 font-normal">(for screen readers &amp; SEO)</span></>}>
            <input value={current.alt} onChange={(e) => setCurrent((c) => ({ ...c, alt: e.target.value }))} maxLength={300} placeholder="e.g. Copper pot stills in a Scottish distillery" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          </F>
          <F label={<>Caption <span className="text-slate-400 font-normal">(shown under image)</span></>}>
            <input value={current.caption} onChange={(e) => setCurrent((c) => ({ ...c, caption: e.target.value }))} maxLength={300} placeholder="Optional. e.g. Copper reacts with sulphur compounds during distillation." className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          </F>
          <F label={<>Credit / source</>}>
            <input value={current.credit} onChange={(e) => setCurrent((c) => ({ ...c, credit: e.target.value }))} maxLength={200} placeholder="e.g. © John Doe / Unsplash" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          </F>
          <F label={<>Direct URL <span className="text-slate-400 font-normal">(read-only)</span></>}>
            <input value={current.url} readOnly className="w-full h-10 rounded-lg border border-slate-200 px-3 text-xs bg-slate-50 font-mono text-slate-500" />
          </F>
        </div>
      )}

      {/* Save bar */}
      <div className="mt-4 flex items-center justify-end gap-2">
        {dirty && <span className="text-[11px] text-amber-700">Unsaved changes</span>}
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty || (!current.url && !pendingBlob)}
          className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-60 inline-flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save image</>}
        </button>
      </div>
    </div>
  )
}

const F = ({ label, children, className }) => <div className={className}><div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>{children}</div>
function ArrEditor({ label, items, onChange, onCommit, makeNew, render: Item }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 relative">
            <button onClick={() => { onChange(items.filter((_, j) => j !== i)); onCommit() }} className="absolute top-2 right-2 text-slate-400 hover:text-red-600"><X className="h-4 w-4" /></button>
            <Item item={it} onChange={(n) => { const a = [...items]; a[i] = n; onChange(a) }} onCommit={onCommit} />
          </div>
        ))}
        <button onClick={() => onChange([...(items || []), makeNew()])} className="h-9 px-3 text-xs rounded-lg border border-dashed border-slate-300 bg-white hover:border-blue-400 text-slate-600 inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
    </div>
  )
}
const QuizItem = ({ item, onChange, onCommit }) => (
  <div className="space-y-2">
    <input value={item.q} onChange={(e) => onChange({ ...item, q: e.target.value })} onBlur={onCommit} placeholder="Question" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
    {(item.options || []).map((opt, i) => (
      <div key={i} className="flex items-center gap-2">
        <button onClick={() => { onChange({ ...item, correct: i }); onCommit() }} className={`h-8 w-8 shrink-0 rounded-full border text-xs font-semibold ${item.correct === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + i)}</button>
        <input value={opt} onChange={(e) => { const o = [...item.options]; o[i] = e.target.value; onChange({ ...item, options: o }) }} onBlur={onCommit} className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm" />
      </div>
    ))}
    <input value={item.explanation || ''} onChange={(e) => onChange({ ...item, explanation: e.target.value })} onBlur={onCommit} placeholder="Explanation" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
  </div>
)
const FlashcardItem = ({ item, onChange, onCommit }) => (
  <div className="grid gap-2 md:grid-cols-2">
    <input value={item.front} onChange={(e) => onChange({ ...item, front: e.target.value })} onBlur={onCommit} placeholder="Front" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
    <input value={item.back} onChange={(e) => onChange({ ...item, back: e.target.value })} onBlur={onCommit} placeholder="Back" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
  </div>
)
const SourceItem = ({ item, onChange, onCommit }) => (
  <div className="grid gap-2 md:grid-cols-[1fr_1.4fr]">
    <input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} onBlur={onCommit} placeholder="Label" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
    <input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} onBlur={onCommit} placeholder="https://..." className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono" />
  </div>
)

/* ==================== COMMENTS ===================== */
function CommentsView() {
  const [rows, setRows] = useState(null)
  const [filter, setFilter] = useState('all')
  const load = () => api('/admin/comments').then(setRows)
  useEffect(() => { load() }, [])
  const del = async (id) => { if (!confirm('Delete this comment?')) return; await api(`/admin/comments/${id}`, { method: 'DELETE' }); load() }
  const toggle = async (id, approved) => { await api(`/admin/comments/${id}`, { method: 'PATCH', body: { approved } }); load() }
  if (!rows) return <Spinner />
  const filtered = rows.filter((c) => filter === 'all' ? true : filter === 'pending' ? c.approved === false : filter === 'approved' ? c.approved !== false : true)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Comments</h1>
        <div className="flex gap-2">
          {[{k:'all',l:`All (${rows.length})`},{k:'approved',l:`Approved (${rows.filter(r=>r.approved!==false).length})`},{k:'pending',l:`Pending (${rows.filter(r=>r.approved===false).length})`}].map((f) => (
            <button key={f.k} onClick={() => setFilter(f.k)} className={`h-8 px-3 rounded-full text-xs font-medium ${filter === f.k ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>{f.l}</button>
          ))}
        </div>
      </div>
      {filtered.length === 0 && <Empty>No comments in this filter.</Empty>}
      <ul className="space-y-2">
        {filtered.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-900"><strong>{c.userName}</strong> <span className="text-xs text-slate-400">· {new Date(c.createdAt).toLocaleString()}</span></div>
                <a href={`/learn/${c.lessonSlug}`} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">/learn/{c.lessonSlug}</a>
                <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{c.text}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => toggle(c.id, !(c.approved !== false))} className={`h-8 px-3 rounded-md text-xs font-medium ${c.approved !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{c.approved !== false ? 'Approved' : 'Pending'}</button>
                <button onClick={() => del(c.id)} className="h-8 px-3 rounded-md text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ====================== USERS ====================== */
function UsersView({ onOpen }) {
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const load = useCallback(async () => setData(await api(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)), [q])
  useEffect(() => { load() }, [load])
  const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const exportCsv = () => {
    if (!data) return
    const header = ['email','name','country','city','role','newsletter','newsletterConsentAt','newsletterWithdrawnAt','newsletterSource','createdAt'].join(',')
    const rows = data.users.map((u) => [u.email, u.name, u.country, u.city, u.role, !!u.newsletter, u.newsletterConsentAt || '', u.newsletterWithdrawnAt || '', u.newsletterSource || '', u.createdAt].map(csvEscape).join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'osc-users.csv'; a.click()
  }
  if (!data) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users <span className="text-sm text-slate-400 font-normal">({data.total})</span></h1>
        <button onClick={exportCsv} className="h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</button>
      </div>
      <div className="relative">
        <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by email or name…" className="w-full h-10 rounded-lg border border-slate-200 pl-9 pr-3 text-sm bg-white" />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-2">Name</th>
              <th className="text-left px-4 py-2">Email</th>
              <th className="text-left px-4 py-2 hidden md:table-cell">Country</th>
              <th className="text-left px-4 py-2 hidden lg:table-cell">City</th>
              <th className="text-left px-4 py-2">Role</th>
              <th className="text-left px-4 py-2 hidden md:table-cell">Joined</th>
              <th className="text-left px-4 py-2">Newsletter</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(u.id)}>
                <td className="px-4 py-2 text-slate-900">{u.name}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-500 hidden md:table-cell">{u.country || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-2 text-slate-500 hidden lg:table-cell">{u.city || <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-2 text-slate-500">{u.role ? <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{u.role}</span> : <span className="text-slate-300">—</span>}</td>
                <td className="px-4 py-2 text-slate-500 text-xs hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">{u.newsletter ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-slate-300" />}</td>
                <td className="px-4 py-2 text-right"><ChevronRight className="h-4 w-4 text-slate-400" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserDetail({ id, onBack }) {
  const [d, setD] = useState(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [role, setRole] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const load = useCallback(async () => {
    const r = await api(`/admin/users/${id}`)
    setD(r)
    setName(r.user.name || ''); setEmail(r.user.email || '')
    setCountry(r.user.country || ''); setCity(r.user.city || ''); setRole(r.user.role || '')
    setNewsletter(!!r.user.newsletter)
  }, [id])
  useEffect(() => { load() }, [load])
  const save = async () => {
    setSaving(true)
    try {
      await api(`/admin/users/${id}`, { method: 'PATCH', body: { name, email, country, city, role, newsletter } })
      await load()
      toast.success('Profile updated.')
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }
  const del = async () => {
    if (deleteText.trim().toLowerCase() !== (d?.user?.email || '').toLowerCase()) {
      toast.error('Please type the exact email to confirm deletion.'); return
    }
    setDeleting(true)
    try {
      await api(`/admin/users/${id}`, { method: 'DELETE' })
      toast.success(`Deleted ${d.user.email} and all associated data.`)
      onBack()
    } catch (e) { toast.error(e.message); setDeleting(false) }
  }
  const downloadExport = (format) => {
    // GDPR Art. 15 (access) + Art. 20 (portability). Cookies flow with the browser fetch.
    const a = document.createElement('a')
    a.href = `/api/admin/users/${id}/export?format=${format}`
    a.download = ''
    a.click()
    toast.success(`Preparing ${format.toUpperCase()} export…`)
  }
  const deleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment? This action cannot be undone.')) return
    try {
      await api(`/admin/comments/${commentId}`, { method: 'DELETE' })
      toast.success('Comment deleted.')
      await load()
    } catch (e) { toast.error(e.message) }
  }
  if (!d) return <Spinner />
  const comments = d.comments || []
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All users</button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{d.user.name || d.user.email}</h1>
          <p className="text-sm text-slate-500">{d.user.email} · joined {new Date(d.user.createdAt).toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-0.5">Auth: {d.user.authMethod || d.user.provider || 'email'} · Verified: {d.user.verified === false ? 'No' : 'Yes'} · ID: <code className="font-mono">{d.user.id}</code></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadExport('json')}
            title="GDPR Art. 20 portability — full data bundle in machine-readable JSON."
            className="h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export JSON
          </button>
          <button
            onClick={() => downloadExport('csv')}
            title="GDPR Art. 15 access — flat CSV, spreadsheet-friendly."
            className="h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm inline-flex items-center gap-1.5"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-5">
        <Stat label="Courses started" value={d.stats.coursesStarted} />
        <Stat label="Lessons completed" value={d.stats.lessonsCompleted} />
        <Stat label="Cards reviewed" value={d.stats.flashcardsReviewed} />
        <Stat label="Minutes studied" value={d.stats.minutesStudied} />
        <Stat label="Comments" value={d.stats.commentsPosted ?? comments.length} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">Edit profile</h3>
          <span className="text-xs text-slate-500">GDPR: <span className="font-medium text-slate-700">Rectification (Art. 16)</span></span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <F label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="Role">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white">
              <option value="">—</option>
              <option value="Bartender">Bartender</option>
              <option value="Server">Server</option>
              <option value="Manager">Manager</option>
              <option value="Sommelier">Sommelier</option>
              <option value="Owner">Owner</option>
              <option value="Student">Student</option>
              <option value="Enthusiast">Enthusiast</option>
              <option value="Other">Other</option>
            </select>
          </F>
          <F label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="City"><input value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="Newsletter"><label className="inline-flex items-center gap-2 text-sm text-slate-700 mt-2"><input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="h-4 w-4 accent-blue-600" /> Opted in</label></F>
        </div>
        {(d.user.newsletterConsentAt || d.user.newsletterWithdrawnAt) && (
          <div className="text-xs text-slate-500 -mt-1">
            {d.user.newsletterConsentAt && <span>Consented: {new Date(d.user.newsletterConsentAt).toLocaleString()}</span>}
            {d.user.newsletterConsentAt && d.user.newsletterWithdrawnAt && <span className="mx-2">·</span>}
            {d.user.newsletterWithdrawnAt && <span>Withdrawn: {new Date(d.user.newsletterWithdrawnAt).toLocaleString()}</span>}
            {d.user.newsletterSource && <span className="ml-2">· Source: {d.user.newsletterSource}</span>}
          </div>
        )}
        <div className="flex justify-between pt-1">
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save</>}</button>
          <button onClick={() => { setDeleteText(''); setShowDeleteConfirm(true) }} className="h-9 px-4 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete account</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-slate-900">Comments <span className="text-slate-400 font-normal">({comments.length})</span></h3>
          <span className="text-xs text-slate-500">GDPR: <span className="font-medium text-slate-700">Erasure (Art. 17)</span></span>
        </div>
        {comments.length === 0 ? <Empty>No comments posted.</Empty> : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            {comments.map((c) => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-slate-500 mb-1">
                    <span className="font-mono text-slate-400">{c.lessonSlug || c.courseSlug || '—'}</span>
                    <span className="mx-2">·</span>
                    <span>{new Date(c.createdAt).toLocaleString()}</span>
                    {c.approved === false && <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Pending</span>}
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap break-words">{c.text}</p>
                </div>
                <button
                  onClick={() => deleteComment(c.id)}
                  className="h-8 px-3 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-xs inline-flex items-center gap-1.5 shrink-0"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-slate-900 mb-2">Lesson activity</h3>
        {d.progress.length === 0 && <Empty>No progress yet.</Empty>}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="text-left px-4 py-2">Course</th><th className="text-left px-4 py-2">Lesson</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Quiz</th><th className="text-left px-4 py-2">Updated</th></tr>
            </thead>
            <tbody>
              {d.progress.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-600">/{p.courseSlug}</td>
                  <td className="px-4 py-2 text-slate-900">{p.lessonSlug}</td>
                  <td className="px-4 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.completed ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{p.completed ? 'Completed' : 'In progress'}</span></td>
                  <td className="px-4 py-2 text-slate-700">{p.quizScore != null ? `${p.quizScore}/5` : '—'}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{new Date(p.updatedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => !deleting && setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-red-100 grid place-items-center shrink-0">
                  <Trash2 className="h-5 w-5 text-red-700" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-slate-900">Delete account permanently?</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    This will permanently erase <strong className="font-medium text-slate-900">{d.user.email}</strong> and all associated data.
                  </p>
                </div>
              </div>
              <ul className="text-xs text-slate-600 space-y-1 rounded-md bg-slate-50 border border-slate-200 p-3">
                <li>🗑️ User account and profile</li>
                <li>🗑️ {d.progress.length} lesson-progress record{d.progress.length === 1 ? '' : 's'}</li>
                <li>🗑️ All flashcard-review history</li>
                <li>🗑️ {comments.length} comment{comments.length === 1 ? '' : 's'} posted by this user</li>
                <li>⚠️ Newsletter audit doc (if any) is preserved for legal audit trail — email replaced with a hash on request.</li>
              </ul>
              <p className="text-xs text-slate-500">This satisfies GDPR Art. 17 (Right to erasure). The action <strong>cannot be undone</strong>.</p>
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">Type <code className="font-mono">{d.user.email}</code> to confirm:</label>
                <input
                  autoFocus
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder={d.user.email}
                  className="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm font-mono"
                  disabled={deleting}
                />
              </div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={del}
                disabled={deleting || deleteText.trim().toLowerCase() !== (d.user.email || '').toLowerCase()}
                className="h-9 px-4 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-40"
              >
                {deleting ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</> : <><Trash2 className="h-4 w-4" /> Delete permanently</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

/* ==================== NEWSLETTER ==================== */
}
function NewsletterView() {
  const [rows, setRows] = useState(null)
  useEffect(() => { api('/admin/newsletter').then(setRows) }, [])
  const exportCsv = () => {
    if (!rows) return
    const csv = 'email,source,createdAt\n' + rows.map((r) => `${r.email},${r.source || ''},${r.createdAt}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'osc-newsletter.csv'; a.click()
  }
  if (!rows) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Newsletter opt-ins <span className="text-sm text-slate-400 font-normal">({rows.length})</span></h1>
        <button onClick={exportCsv} className="h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5"><Download className="h-3.5 w-3.5" /> Export CSV</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Source</th><th className="text-left px-4 py-2">Signed up</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-900">{r.email}</td>
                <td className="px-4 py-2 text-slate-500">{r.source || '—'}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const Stat = ({ label, value, accent }) => (
  <div className={`rounded-xl border p-4 ${accent ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
    <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    <div className={`mt-1 text-2xl font-semibold ${accent ? 'text-blue-800' : 'text-slate-900'}`}>{value ?? 0}</div>
  </div>
)
const Spinner = () => <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>

/* ==================== PAGES MANAGER (WordPress-style) ==================== */
function PagesManager() {
  const [pages, setPages] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const load = useCallback(async () => { try { setPages(await api('/admin/pages')) } catch (e) { toast.error(e.message) } }, [])
  useEffect(() => { load() }, [load])

  const runSeed = useCallback(async (force) => {
    const confirmMsg = force
      ? 'Overwrite legal-page content with the built-in defaults?\n\nAny manual edits to Privacy, Terms, Cookies, Contact, Data Rights or About will be REPLACED. Published/draft state is preserved.'
      : 'Sync legal pages?\n\nMissing pages (Privacy, Terms, Cookies, Contact, Data Rights, About) will be created and published. Existing pages keep their content — only metadata (title/SEO) is refreshed.'
    if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) return
    setSeeding(true)
    try {
      const res = await api('/admin/seed-legal-pages', { method: 'POST', body: { force: !!force } })
      const s = res?.summary || {}
      const parts = []
      if (s.created) parts.push(`${s.created} created`)
      if (s.updatedContent) parts.push(`${s.updatedContent} content updated`)
      if (s.updatedMetadata) parts.push(`${s.updatedMetadata} metadata refreshed`)
      if (s.preserved) parts.push(`${s.preserved} preserved`)
      toast.success(parts.length ? `Legal pages: ${parts.join(', ')}.` : 'Legal pages already up to date.')
      await load()
    } catch (e) {
      toast.error(e.message || 'Seed failed')
    } finally {
      setSeeding(false)
    }
  }, [load])

  if (openId) return <PageEditor id={openId} onBack={() => { setOpenId(null); load() }} onDeleted={() => { setOpenId(null); load() }} />
  if (creating) return <PageEditor id={null} onBack={() => { setCreating(false); load() }} />
  if (!pages) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Pages</h1>
          <p className="text-sm text-slate-500">Public HTML pages (About, Privacy, Terms, custom landing pages, etc.).</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => runSeed(false)}
            disabled={seeding}
            title="Create missing legal pages and refresh their metadata. Preserves your edits."
            className="h-10 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {seeding ? 'Syncing…' : 'Sync legal pages'}
          </button>
          <button
            onClick={() => runSeed(true)}
            disabled={seeding}
            title="Overwrite legal-page content with built-in defaults. Preserves published state."
            className="h-10 px-3 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            Force overwrite
          </button>
          <button onClick={() => setCreating(true)} className="h-10 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> New page</button>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span className="font-medium text-slate-700">Tip:</span> Use <em>Sync legal pages</em> once on a fresh production database to publish
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/privacy</code>,
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/terms</code>,
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/cookies</code>,
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/contact</code>,
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/data-rights</code> and
        <code className="mx-1 px-1 rounded bg-white border border-slate-200 text-[11px]">/about</code>.
        Safe to re-run — existing edits are preserved unless you press <em>Force overwrite</em>.
      </div>
      {pages.length === 0 ? (
        <Empty>No pages yet. Create your first one.</Empty>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
              <tr><th className="text-left px-4 py-2">Title</th><th className="text-left px-4 py-2">Slug</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Updated</th><th></th></tr>
            </thead>
            <tbody>
              {pages.map((p) => (
                <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => setOpenId(p.id)}>
                  <td className="px-4 py-2 text-slate-900 font-medium">{p.title}</td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">/{p.slug}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {p.published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{new Date(p.updatedAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {p.published && <a href={`/${p.slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-blue-700 mr-2"><Globe className="h-3.5 w-3.5" /> Live</a>}
                    <ChevronRight className="h-4 w-4 text-slate-400 inline" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Slugs that have a built-in default we can re-sync from /app/lib/legal-pages.js.
// Keep in sync with getLegalPages(). Used by PageEditor to conditionally show the
// "Sync from default" button.
const BUILTIN_LEGAL_SLUGS = new Set(['privacy', 'terms', 'cookies', 'contact', 'data-rights', 'about'])

function PageEditor({ id, onBack, onDeleted }) {
  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [seoTitle, setSeoTitle] = useState('')
  const [seoDescription, setSeoDescription] = useState('')
  const [contentHtml, setContentHtml] = useState('<h2>New page</h2>\n<p>Start writing…</p>')
  const [published, setPublished] = useState(false)
  const [pageId, setPageId] = useState(id)
  const [showPreview, setShowPreview] = useState(false)
  const [pristineHtml, setPristineHtml] = useState('')
  const [showSyncConfirm, setShowSyncConfirm] = useState(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    (async () => {
      try {
        const p = await api(`/admin/pages/${id}`)
        setTitle(p.title || ''); setSlug(p.slug || ''); setSeoTitle(p.seoTitle || '')
        setSeoDescription(p.seoDescription || ''); setContentHtml(p.contentHtml || '')
        setPristineHtml(p.contentHtml || ''); setPublished(!!p.published); setPageId(p.id)
      } catch (e) { toast.error(e.message) } finally { setLoading(false) }
    })()
  }, [id])

  const dirty = true // simple UX — always allow save button

  const save = async ({ publishToo } = {}) => {
    if (!title.trim() || !slug.trim()) { toast.error('Title and slug are required.'); return }
    setSaving(true)
    try {
      if (pageId) {
        const r = await api(`/admin/pages/${pageId}`, { method: 'PATCH', body: { title, slug, seoTitle, seoDescription, contentHtml, ...(publishToo !== undefined ? { published: publishToo } : {}) } })
        if (publishToo !== undefined) setPublished(!!r.page.published)
        setPristineHtml(r?.page?.contentHtml || contentHtml)
        toast.success('Page saved.')
      } else {
        const r = await api('/admin/pages', { method: 'POST', body: { title, slug, seoTitle, seoDescription, contentHtml, published: publishToo ?? false } })
        setPageId(r.page.id); setPublished(!!r.page.published); setPristineHtml(r.page.contentHtml || contentHtml)
        toast.success('Page created.')
      }
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const togglePublish = async () => save({ publishToo: !published })
  const del = async () => {
    if (!pageId) { onBack(); return }
    if (!confirm('Delete this page? This cannot be undone.')) return
    try { await api(`/admin/pages/${pageId}`, { method: 'DELETE' }); toast.success('Page deleted.'); onDeleted?.() } catch (e) { toast.error(e.message) }
  }

  // Sync only THIS page from its built-in default (see /app/lib/legal-pages.js).
  // Never touches any other page. Published/draft state is preserved by the API.
  // Requires the current slug to be one of BUILTIN_LEGAL_SLUGS.
  const canSync = pageId && BUILTIN_LEGAL_SLUGS.has(slug)
  const runSyncThisPage = async () => {
    if (!canSync) return
    setSyncing(true)
    try {
      const res = await api('/admin/seed-legal-pages', { method: 'POST', body: { slug, force: true } })
      const r = (res?.results || [])[0]
      // Reload the page from the DB so the editor reflects the newly-seeded HTML.
      const fresh = await api(`/admin/pages/${pageId}`)
      setTitle(fresh.title || ''); setSlug(fresh.slug || ''); setSeoTitle(fresh.seoTitle || '')
      setSeoDescription(fresh.seoDescription || ''); setContentHtml(fresh.contentHtml || '')
      setPristineHtml(fresh.contentHtml || ''); setPublished(!!fresh.published)
      setShowSyncConfirm(false)
      if (r?.action === 'updated-content') {
        toast.success(`Synced /${slug} from built-in default. Published state preserved.`)
      } else if (r?.action === 'created') {
        toast.success(`Created /${slug} from built-in default.`)
      } else {
        toast.success(`/${slug} already matches the built-in default.`)
      }
    } catch (e) {
      toast.error(e.message || 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All pages</button>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{pageId ? 'Edit page' : 'New page'}</h1>
          <p className="text-sm text-slate-500">Public URL: <code className="px-1 py-0.5 rounded bg-slate-100 text-slate-700">/{slug || 'slug'}</code></p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${published ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{published ? 'Published' : 'Draft'}</span>
          {pageId && published && <a href={`/${slug}`} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> View live</a>}
          <button onClick={() => setShowPreview(true)} className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Preview</button>
          <button onClick={togglePublish} disabled={saving} className={`h-9 px-3 rounded-md text-sm inline-flex items-center gap-1.5 ${published ? 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700' : 'bg-purple-600 hover:bg-purple-700 text-white'} disabled:opacity-60`}>
            {published ? <><Undo2 className="h-3.5 w-3.5" /> Unpublish</> : <><Send className="h-3.5 w-3.5" /> Publish</>}
          </button>
          {canSync && (
            <button
              onClick={() => setShowSyncConfirm(true)}
              disabled={saving || syncing}
              title="Overwrite this page's content with the built-in default (published/draft state is preserved)."
              className="h-9 px-3 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sync this page
            </button>
          )}
          <button onClick={() => save()} disabled={saving} className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Save</>}</button>
          {pageId && <button onClick={del} className="h-9 px-3 rounded-md border border-red-200 bg-white hover:bg-red-50 text-red-600 text-sm inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete</button>}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <F label="Page title"><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label={<>Slug <span className="text-slate-400 font-normal">(URL)</span></>}>
          <div className="flex items-center gap-1">
            <div className="h-10 rounded-l-lg border border-r-0 border-slate-200 bg-slate-50 px-2 text-xs text-slate-500 inline-flex items-center">/</div>
            <input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} maxLength={80} placeholder="about" className="flex-1 h-10 rounded-r-lg border border-slate-200 px-3 text-sm font-mono bg-white" />
          </div>
        </F>
        <F label="SEO title" className="md:col-span-2"><input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} maxLength={200} placeholder="Leave blank to auto-generate from title" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="SEO description" className="md:col-span-2"><textarea value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} maxLength={400} rows={2} placeholder="~160 characters. Shown in search results and social shares." className="w-full rounded-lg border border-slate-200 p-2.5 text-sm bg-white" /></F>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1.5">Content (HTML) <span className="text-slate-400 font-normal">— dangerous tags are stripped on save (script, style, unsafe attrs)</span></label>
        <textarea
          value={contentHtml}
          onChange={(e) => setContentHtml(e.target.value)}
          rows={20}
          spellCheck={false}
          className="w-full rounded-lg border border-slate-200 p-3 text-xs bg-white font-mono leading-relaxed"
          placeholder="<h2>Section title</h2>\n<p>Paragraph text with <a href=&quot;/learn/what-is-alcohol&quot;>a link</a>.</p>\n<ul>\n  <li>Bullet one</li>\n  <li>Bullet two</li>\n</ul>"
        />
        <p className="mt-1.5 text-[11px] text-slate-500">Supported: headings, paragraphs, lists, links, images, tables, blockquotes, code blocks, YouTube/Vimeo iframes. Scripts and event handlers are always stripped.</p>
      </div>

      {showPreview && (
        <PagePreviewModal title={title} slug={slug} html={contentHtml} onClose={() => setShowPreview(false)} />
      )}

      {showSyncConfirm && (
        <SyncConfirmModal
          slug={slug}
          published={published}
          working={syncing}
          onConfirm={runSyncThisPage}
          onClose={() => !syncing && setShowSyncConfirm(false)}
        />
      )}
    </div>
  )
}

function SyncConfirmModal({ slug, published, working, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 grid place-items-center shrink-0">
              <RefreshCw className="h-5 w-5 text-amber-700" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold text-slate-900">Sync <code className="text-base font-mono bg-slate-100 px-1.5 py-0.5 rounded">/{slug}</code> from the built-in default?</h3>
              <p className="mt-1 text-sm text-slate-600">
                This will <strong className="font-medium text-slate-900">replace the current content</strong> of this page with the latest built-in default from the code base.
              </p>
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-1 rounded-md bg-slate-50 border border-slate-200 p-3">
            <li>✅ Only <code className="font-mono">/{slug}</code> is affected — no other pages are touched.</li>
            <li>✅ Published/draft state is preserved (currently <strong>{published ? 'Published' : 'Draft'}</strong>).</li>
            <li>⚠️ Any manual edits you made to <code className="font-mono">/{slug}</code> will be overwritten.</li>
          </ul>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={working}
            className="h-9 px-3 rounded-md border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-sm disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={working}
            className="h-9 px-4 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-60"
          >
            {working ? <><Loader2 className="h-4 w-4 animate-spin" /> Syncing…</> : <><RefreshCw className="h-4 w-4" /> Overwrite with default</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function PagePreviewModal({ title, slug, html, onClose }) {
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 truncate">Preview · {title || 'Untitled'}</div>
            <div className="text-xs text-slate-500 truncate">/{slug || 'slug'}</div>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-md hover:bg-slate-100 grid place-items-center text-slate-500"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-6">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900">{title || 'Untitled'}</h1>
          <div className="mt-6 prose-cms text-slate-800" dangerouslySetInnerHTML={{ __html: html || '' }} />
        </div>
        <div className="border-t border-slate-200 px-4 py-3 bg-slate-50 text-xs text-slate-500 flex items-center gap-2">
          <AlertCircle className="h-3.5 w-3.5" /> Preview shows content <em>before</em> server-side sanitization. Save the page to apply sanitization.
        </div>
      </div>
    </div>
  )
}
