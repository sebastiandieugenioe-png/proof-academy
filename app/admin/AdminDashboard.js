'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  ArrowLeft, ChevronDown, ChevronRight, Check, X, Trash2, Send, Undo2, Eye,
  Loader2, LogOut, MessageSquare, Users as UsersIcon, Mail, BookOpen, Plus,
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
  { key: 'courses', label: 'Courses', icon: BookOpen },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'users', label: 'Users', icon: UsersIcon },
  { key: 'newsletter', label: 'Newsletter', icon: Mail },
]

export default function AdminDashboard({ adminEmail }) {
  const [tab, setTab] = useState('courses')
  const [openCourse, setOpenCourse] = useState(null)

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
                <button key={t.key} onClick={() => { setTab(t.key); setOpenCourse(null) }}
                  className={`px-3 h-11 inline-flex items-center gap-1.5 text-sm border-b-2 ${active ? 'border-blue-600 text-blue-700 font-medium' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                  <Icon className="h-4 w-4" /> {t.label}
                </button>
              )
            })}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'courses' && (openCourse ? <CourseEditor slug={openCourse} onBack={() => setOpenCourse(null)} /> : <CoursesList onOpen={setOpenCourse} />)}
        {tab === 'comments' && <CommentsView />}
        {tab === 'users' && <UsersView />}
        {tab === 'newsletter' && <NewsletterView />}
      </main>
    </div>
  )
}

function CoursesList({ onOpen }) {
  const [courses, setCourses] = useState(null)
  useEffect(() => { api('/courses').then(setCourses) }, [])
  if (!courses) return <Spinner />
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Courses &amp; lessons</h1>
        <p className="text-sm text-slate-500 mt-0.5">Edit any lesson to update theory, quizzes, sources, images and SEO. Changes publish instantly.</p>
      </div>
      <ul className="space-y-2">
        {courses.map((c) => (
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
  const [lessons, setLessons] = useState({}) // slug -> full lesson data
  const [openIdx, setOpenIdx] = useState(-1)
  const [saving, setSaving] = useState(false)

  const loadCourse = useCallback(async () => {
    const c = await api(`/courses/${slug}`)
    setCourse(c)
    // Fetch full lesson content for each lesson lazily as opened
  }, [slug])
  useEffect(() => { loadCourse() }, [loadCourse])

  const loadLesson = async (lslug) => {
    if (lessons[lslug]) return
    const d = await api(`/lessons/${slug}/${lslug}`)
    setLessons((m) => ({ ...m, [lslug]: d.lesson }))
  }

  const patchLesson = async (lslug, next) => {
    setSaving(true)
    try {
      // Build full course payload from current state (bundled + overrides applied)
      const merged = { ...course, lessons: course.lessons.map((l) => ({
        ...(lessons[l.slug] || l), // full data if we have it, else the summary
        ...(l.slug === lslug ? next : {}),
      })) }
      const res = await api(`/admin/course-override`, { method: 'POST', body: { course: merged } })
      if (res?.course) {
        setCourse({ ...course, ...res.course, lessons: course.lessons.map((l, i) => ({ ...l, ...res.course.lessons[i], slug: res.course.lessons[i].slug || l.slug })) })
        setLessons((m) => ({ ...m, [lslug]: res.course.lessons.find((l) => l.slug === lslug) || m[lslug] }))
      }
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }

  const publishToggle = async (published) => {
    try { await api(`/admin/course-publish`, { method: 'POST', body: { slug, published } }); alert(published ? 'Published' : 'Unpublished') }
    catch (e) { alert(e.message) }
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
        <div className="flex gap-2">
          <button onClick={() => publishToggle(false)} className="h-9 px-3 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-700 inline-flex items-center gap-1.5"><Undo2 className="h-3.5 w-3.5" /> Unpublish</button>
          <button onClick={() => publishToggle(true)} className="h-9 px-3 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-sm inline-flex items-center gap-1.5"><Send className="h-3.5 w-3.5" /> Publish</button>
          {saving && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving</span>}
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
  const [draft, setDraft] = useState(lesson)
  useEffect(() => setDraft(lesson), [lesson])
  const commit = () => onSave(draft)
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }))
  const setArr = (k, i, v) => setDraft((d) => ({ ...d, [k]: d[k].map((x, j) => (j === i ? v : x)) }))
  const addTo = (k, item) => setDraft((d) => ({ ...d, [k]: [...(d[k] || []), item] }))
  const rmAt = (k, i) => setDraft((d) => ({ ...d, [k]: d[k].filter((_, j) => j !== i) }))
  return (
    <div className="border-t border-slate-100 p-4 space-y-5 bg-slate-50/40">
      <F label="Title"><input value={draft.title} onChange={(e) => set('title', e.target.value)} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      <div className="grid gap-3 md:grid-cols-3">
        <F label="Minutes"><input type="number" min={2} max={8} value={draft.minutes || 4} onChange={(e) => set('minutes', parseInt(e.target.value) || 4)} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="Slug"><input value={draft.slug} onChange={(e) => set('slug', e.target.value)} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono bg-white" /></F>
      </div>
      <F label="Learning objectives">
        <div className="space-y-2">
          {(draft.objectives || []).map((o, i) => (
            <input key={i} value={o} onChange={(e) => setArr('objectives', i, e.target.value)} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          ))}
        </div>
      </F>
      <F label="Theory (**bold** and - lists supported)"><textarea value={draft.theory} onChange={(e) => set('theory', e.target.value)} onBlur={commit} rows={12} className="w-full rounded-lg border border-slate-200 p-3 text-sm bg-white font-serif leading-relaxed" /></F>

      <ArrEditor label="Embedded active-recall" items={draft.embedded || []} onChange={(x) => set('embedded', x)} onCommit={commit} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} render={QuizItem} />
      <ArrEditor label="Flashcards" items={draft.flashcards || []} onChange={(x) => set('flashcards', x)} onCommit={commit} makeNew={() => ({ front: '', back: '' })} render={FlashcardItem} />
      <ArrEditor label="Quiz" items={draft.quiz || []} onChange={(x) => set('quiz', x)} onCommit={commit} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} render={QuizItem} />
      <ArrEditor label="Sources &amp; citations" items={draft.sources || []} onChange={(x) => set('sources', x)} onCommit={commit} makeNew={() => ({ label: '', url: '' })} render={SourceItem} />

      <div className="grid gap-3 md:grid-cols-2">
        <F label="Image URL"><input value={draft.image || ''} onChange={(e) => set('image', e.target.value)} onBlur={commit} placeholder="https://images.unsplash.com/..." className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white font-mono" /></F>
        <F label="Image alt / prompt"><input value={draft.imagePrompt || ''} onChange={(e) => set('imagePrompt', e.target.value)} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      </div>
      {draft.image && <img src={draft.image} alt="" className="w-full h-40 object-cover rounded-lg border border-slate-200" />}
      <div className="grid gap-3 md:grid-cols-2">
        <F label="SEO title"><input value={draft.seo?.title || ''} onChange={(e) => set('seo', { ...(draft.seo || {}), title: e.target.value })} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
        <F label="SEO description"><input value={draft.seo?.description || ''} onChange={(e) => set('seo', { ...(draft.seo || {}), description: e.target.value })} onBlur={commit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" /></F>
      </div>
    </div>
  )
}

const F = ({ label, children }) => (<div><div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>{children}</div>)

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

function CommentsView() {
  const [rows, setRows] = useState(null)
  const load = () => api('/admin/comments').then(setRows)
  useEffect(() => { load() }, [])
  const del = async (id) => { if (!confirm('Delete this comment?')) return; await api(`/admin/comments/${id}`, { method: 'DELETE' }); load() }
  const toggle = async (id, approved) => { await api(`/admin/comments/${id}`, { method: 'PATCH', body: { approved } }); load() }
  if (!rows) return <Spinner />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Comments</h1>
      {rows.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No comments yet.</div>}
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm text-slate-900"><strong>{c.userName}</strong> <span className="text-xs text-slate-400">· {new Date(c.createdAt).toLocaleString()}</span></div>
                <div className="text-xs text-slate-500">/learn/{c.lessonSlug}</div>
                <div className="text-sm text-slate-800 mt-1 whitespace-pre-wrap">{c.text}</div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button onClick={() => toggle(c.id, !c.approved)} className={`h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1 ${c.approved ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{c.approved ? 'Approved' : 'Pending'}</button>
                <button onClick={() => del(c.id)} className="h-8 px-3 rounded-md text-xs text-red-600 hover:bg-red-50 inline-flex items-center gap-1"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function UsersView() {
  const [data, setData] = useState(null)
  useEffect(() => { api('/admin/users').then(setData) }, [])
  if (!data) return <Spinner />
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Total users" value={data.total} />
        <Stat label="Newsletter opt-ins" value={data.newsletter} />
        <Stat label="Signed up (7d)" value={data.last7d} />
        <Stat label="Active learners" value={data.active} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
            <tr><th className="text-left px-4 py-2">Name</th><th className="text-left px-4 py-2">Email</th><th className="text-left px-4 py-2">Joined</th><th className="text-left px-4 py-2">Newsletter</th></tr>
          </thead>
          <tbody>
            {data.users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-2 text-slate-900">{u.name}</td>
                <td className="px-4 py-2 text-slate-600">{u.email}</td>
                <td className="px-4 py-2 text-slate-500 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-2">{u.newsletter ? <Check className="h-4 w-4 text-emerald-600" /> : <X className="h-4 w-4 text-slate-300" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function NewsletterView() {
  const [rows, setRows] = useState(null)
  useEffect(() => { api('/admin/newsletter').then(setRows) }, [])
  const exportCsv = () => {
    if (!rows) return
    const csv = 'email,source,createdAt\n' + rows.map((r) => `${r.email},${r.source || ''},${r.createdAt}`).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'osc-newsletter.csv'; a.click(); URL.revokeObjectURL(url)
  }
  if (!rows) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Newsletter opt-ins</h1>
        <button onClick={exportCsv} className="h-9 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm inline-flex items-center gap-1.5">Export CSV</button>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
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

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <div className="text-xs text-slate-500 uppercase tracking-wide">{label}</div>
    <div className="mt-1 text-2xl font-semibold text-slate-900">{value ?? 0}</div>
  </div>
)
const Spinner = () => <div className="grid place-items-center py-16 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>
