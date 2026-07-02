'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Check, X, Trash2, Send, Undo2, Eye,
  Loader2, LogOut, MessageSquare, Users as UsersIcon, Mail, BookOpen, Plus,
  BarChart3, TrendingUp, Search, Download, Save, AlertCircle, Filter,
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
        {tab === 'courses' && (openCourse ? <CourseEditor slug={openCourse} onBack={() => setOpenCourse(null)} /> : <CoursesList onOpen={setOpenCourse} />)}
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
  useEffect(() => { api('/admin/overview').then(setData).catch(console.error) }, [])
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

/* ==================== COURSES ===================== */
function CoursesList({ onOpen }) {
  const [courses, setCourses] = useState(null)
  const [filter, setFilter] = useState('all')
  useEffect(() => { api('/courses').then(setCourses) }, [])
  if (!courses) return <Spinner />
  const filtered = courses.filter((c) => {
    if (filter === 'missing-images') return c.lessons.some((l) => !l.image)
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

function CourseEditor({ slug, onBack }) {
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
    try { await api('/admin/course-publish', { method: 'POST', body: { slug, published } }); alert(published ? 'Published' : 'Unpublished') } catch (e) { alert(e.message) }
  }
  if (!course) return <Spinner />
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All courses</button>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{course.title}</h1>
          <p className="text-sm text-slate-500">{course.tagline}</p>
          <p className="text-xs text-slate-400 mt-1">{course.lessons.length} lessons · {course.level}</p>
        </div>
        <div className="flex gap-2 items-center">
          {saving && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving</span>}
          <button onClick={() => publishToggle(false)} className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 inline-flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Hide</button>
          <button onClick={() => publishToggle(true)} className="h-9 px-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Publish</button>
        </div>
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
              <LessonEditor lesson={lessons[l.slug]} onSave={(next) => patchLesson(l.slug, next)} />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

function LessonEditor({ lesson, onSave }) {
  const [d, setD] = useState(lesson)
  useEffect(() => setD(lesson), [lesson])
  const c = () => onSave(d)
  const s = (k, v) => setD((x) => ({ ...x, [k]: v }))
  const sArr = (k, i, v) => setD((x) => ({ ...x, [k]: x[k].map((it, j) => (j === i ? v : it)) }))
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
      <div className="grid gap-3 md:grid-cols-2">
        <F label="Image URL"><input value={d.image || ''} onChange={(e) => s('image', e.target.value)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white font-mono" /></F>
        <F label="Image alt / prompt"><input value={d.imagePrompt || ''} onChange={(e) => s('imagePrompt', e.target.value)} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      </div>
      {d.image && <img src={d.image} alt="" className="w-full h-40 object-cover rounded-lg border border-slate-200" />}
      <div className="grid gap-3 md:grid-cols-2">
        <F label="SEO title"><input value={d.seo?.title || ''} onChange={(e) => s('seo', { ...(d.seo || {}), title: e.target.value })} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="SEO description"><input value={d.seo?.description || ''} onChange={(e) => s('seo', { ...(d.seo || {}), description: e.target.value })} onBlur={c} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      </div>
    </div>
  )
}

const F = ({ label, children }) => <div><div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>{children}</div>
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
  const exportCsv = () => {
    if (!data) return
    const csv = 'email,name,newsletter,createdAt\n' + data.users.map((u) => `${u.email},"${(u.name||'').replace(/"/g,'""')}",${!!u.newsletter},${u.createdAt}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
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
            <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Joined</th><th className="text-left px-4 py-2">Newsletter</th><th></th></tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" onClick={() => onOpen(u.id)}>
                <td className="px-4 py-2 text-slate-900">{u.name}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
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
  const [newsletter, setNewsletter] = useState(false)
  const [saving, setSaving] = useState(false)
  const load = useCallback(async () => {
    const r = await api(`/admin/users/${id}`)
    setD(r); setName(r.user.name || ''); setEmail(r.user.email || ''); setNewsletter(!!r.user.newsletter)
  }, [id])
  useEffect(() => { load() }, [load])
  const save = async () => { setSaving(true); try { await api(`/admin/users/${id}`, { method: 'PATCH', body: { name, email, newsletter } }); await load() } catch (e) { alert(e.message) } finally { setSaving(false) } }
  const del = async () => { if (!confirm(`Delete ${d.user.email} and ALL their progress? This cannot be undone.`)) return; await api(`/admin/users/${id}`, { method: 'DELETE' }); onBack() }
  if (!d) return <Spinner />
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All users</button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{d.user.name || d.user.email}</h1>
        <p className="text-sm text-slate-500">{d.user.email} · joined {new Date(d.user.createdAt).toLocaleString()}</p>
        <p className="text-xs text-slate-400 mt-0.5">Auth: {d.user.authMethod || d.user.provider || 'email'} · Verified: {d.user.verified === false ? 'No' : 'Yes'}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Courses started" value={d.stats.coursesStarted} />
        <Stat label="Lessons completed" value={d.stats.lessonsCompleted} />
        <Stat label="Cards reviewed" value={d.stats.flashcardsReviewed} />
        <Stat label="Minutes studied" value={d.stats.minutesStudied} />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">Edit profile</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <F label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="Email"><input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" /></F>
          <F label="Newsletter"><label className="inline-flex items-center gap-2 text-sm text-slate-700 mt-2"><input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="h-4 w-4 accent-blue-600" /> Opted in</label></F>
        </div>
        <div className="flex justify-between">
          <button onClick={save} disabled={saving} className="h-9 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5 disabled:opacity-60">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Save className="h-3.5 w-3.5" /> Save</>}</button>
          <button onClick={del} className="h-9 px-4 rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-sm inline-flex items-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Delete account</button>
        </div>
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
    </div>
  )
}

/* ==================== NEWSLETTER ==================== */
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
