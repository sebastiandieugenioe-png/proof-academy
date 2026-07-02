'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Sparkles, Loader2, Check, X, Trash2, Send, Undo2, Play, ChevronDown, ChevronRight,
  ArrowLeft, Plus, RefreshCw, Wand2, Lock, Eye, ExternalLink, AlertTriangle,
} from 'lucide-react'

const api = async (path, opts = {}) => {
  const res = await fetch(`/api${path}`, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const STATUS_STYLES = {
  generating: 'bg-blue-100 text-blue-800 border-blue-200',
  ready: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  error: 'bg-red-100 text-red-800 border-red-200',
  published: 'bg-purple-100 text-purple-800 border-purple-200',
}

export default function AdminPanel() {
  const [view, setView] = useState({ name: 'list' })
  const [drafts, setDrafts] = useState([])
  const [templates, setTemplates] = useState({})
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    try {
      const [d, t] = await Promise.all([api('/admin/drafts'), api('/admin/templates')])
      setDrafts(d); setTemplates(t)
    } catch (e) { console.error(e) }
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  // Poll every 4s if any draft is generating
  useEffect(() => {
    const anyGen = drafts.some((d) => d.status === 'generating')
    if (!anyGen) return
    const t = setInterval(refresh, 4000)
    return () => clearInterval(t)
  }, [drafts])

  if (loading) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>

  if (view.name === 'draft') {
    return <DraftDetail draftId={view.id} onBack={() => { setView({ name: 'list' }); refresh() }} onRefresh={refresh} />
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-blue-700 flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" /> AI content pipeline</div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-1">Admin</h1>
          <p className="mt-1 text-sm text-slate-500">Generate courses with AI. Review and edit every field. Nothing is published automatically.</p>
        </div>
        <button onClick={refresh} className="h-9 px-3 text-sm rounded-md border border-slate-200 bg-white hover:bg-slate-50 inline-flex items-center gap-1.5"><RefreshCw className="h-3.5 w-3.5" /> Refresh</button>
      </div>

      <QuickStart templates={templates} onCreated={(id) => setView({ name: 'draft', id })} />

      <CustomGenerate onCreated={(id) => setView({ name: 'draft', id })} />

      <section>
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Drafts &amp; published courses</h2>
        {drafts.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">No drafts yet. Start with a template above.</div>}
        <ul className="space-y-2">
          {drafts.map((d) => (
            <li key={d.id}>
              <button onClick={() => setView({ name: 'draft', id: d.id })} className="w-full text-left rounded-xl border border-slate-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="font-semibold text-slate-900 truncate">{d.course?.title || 'Untitled'}</div>
                    <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[d.status] || 'bg-slate-100'}`}>{d.status}</span>
                    <span className="text-xs text-slate-500">{d.course?.category} · {d.course?.level}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {d.progress?.done ?? 0}/{d.progress?.total ?? '?'} lessons · {new Date(d.createdAt).toLocaleString()}
                  </div>
                  {d.status === 'generating' && (
                    <div className="mt-2 h-1 rounded-full bg-slate-100 overflow-hidden max-w-xs">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${((d.progress?.done || 0) / Math.max(1, d.progress?.total || 1)) * 100}%` }} />
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function QuickStart({ templates, onCreated }) {
  const [pending, setPending] = useState(null)
  const list = templates.beer || []
  const start = async (t) => {
    setPending(t.title)
    try {
      const res = await api('/admin/generate-course', {
        method: 'POST',
        body: { category: t.category, level: t.level, courseTitle: t.title, tagline: t.tagline, accent: t.accent, icon: t.icon, lessonTitles: t.lessons, notes: 'Cite BJCP, Brewers Association, Oxford Companion to Beer where relevant.' },
      })
      onCreated(res.draft.id)
    } catch (e) { alert(e.message) } finally { setPending(null) }
  }
  return (
    <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 md:p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-700" />
        <h2 className="font-semibold text-slate-900">Quick start — Beer Beginner</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">One click to queue an AI-generated Beer course. The AI cites BJCP, Brewers Association and Oxford Companion to Beer. You review before publishing.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {list.map((t) => (
          <div key={t.title} className="rounded-xl border border-white/70 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-blue-700">{t.category} · {t.level}</div>
            <div className="mt-1 font-semibold text-slate-900">{t.title}</div>
            <div className="mt-1 text-xs text-slate-500 line-clamp-2">{t.lessons.join(' · ')}</div>
            <button disabled={!!pending} onClick={() => start(t)} className="mt-3 w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1.5">
              {pending === t.title ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Queueing…</> : <><Wand2 className="h-3.5 w-3.5" /> Generate</>}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}

function CustomGenerate({ onCreated }) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('Rum')
  const [level, setLevel] = useState('Beginner')
  const [title, setTitle] = useState('Rum Beginner')
  const [tagline, setTagline] = useState('Sugarcane, molasses and the spirit of the tropics.')
  const [lessonTitles, setLessonTitles] = useState('What Is Rum?\nWhite Rum\nGold and Dark Rum\nAged and Sipping Rums\nRum Regions')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  const start = async () => {
    const titles = lessonTitles.split('\n').map((s) => s.trim()).filter(Boolean)
    if (!title || titles.length === 0) return alert('Course title and lesson titles are required.')
    setBusy(true)
    try {
      const res = await api('/admin/generate-course', {
        method: 'POST',
        body: { category, level, courseTitle: title, tagline, lessonTitles: titles, notes },
      })
      onCreated(res.draft.id)
    } catch (e) { alert(e.message) } finally { setBusy(false) }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between p-5 text-left">
        <div>
          <div className="font-semibold text-slate-900">Custom generation</div>
          <div className="text-sm text-slate-500 mt-0.5">Category, level, N lesson titles → AI drafts a full course.</div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="Category">
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-white text-sm">
                {['Rum','Tequila','Vodka','Liqueurs','Cocktails','Beer','Wine','Hospitality','Whiskey','Gin'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Level">
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 bg-white text-sm">
                {['Beginner','Intermediate'].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Course title">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
            </Field>
          </div>
          <Field label="Tagline (optional)">
            <input value={tagline} onChange={(e) => setTagline(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
          </Field>
          <Field label="Lesson titles (one per line)">
            <textarea value={lessonTitles} onChange={(e) => setLessonTitles(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 p-3 text-sm font-mono" />
          </Field>
          <Field label="Brief for the AI (optional)">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Emphasize legal definitions and cite EU 2019/787." className="w-full rounded-lg border border-slate-200 p-3 text-sm" />
          </Field>
          <button disabled={busy} onClick={start} className="h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 inline-flex items-center gap-1.5">
            {busy ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Queueing…</> : <><Wand2 className="h-3.5 w-3.5" /> Start generation</>}
          </button>
        </div>
      )}
    </section>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>
      {children}
    </div>
  )
}

// ---------------- DRAFT DETAIL ----------------
function DraftDetail({ draftId, onBack }) {
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [openIdx, setOpenIdx] = useState(0)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const load = async () => {
    try { setDraft(await api(`/admin/drafts/${draftId}`)) } catch (e) { alert(e.message) }
  }
  useEffect(() => { load() }, [draftId])

  // Auto-poll while generating
  useEffect(() => {
    if (draft?.status !== 'generating') return
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [draft?.status])

  const patch = async (nextCourse) => {
    setSaving(true)
    try {
      const res = await api(`/admin/drafts/${draftId}`, { method: 'PATCH', body: { course: nextCourse } })
      setDraft(res.draft)
    } catch (e) { alert(e.message) } finally { setSaving(false) }
  }
  const publish = async () => {
    try { await api(`/admin/drafts/${draftId}/publish`, { method: 'POST' }); await load() } catch (e) { alert(e.message) }
  }
  const unpublish = async () => {
    try { await api(`/admin/drafts/${draftId}/unpublish`, { method: 'POST' }); await load() } catch (e) { alert(e.message) }
  }
  const retry = async () => {
    try {
      await api(`/admin/drafts/${draftId}/retry`, { method: 'POST', body: { lessonTitles: draft.originalLessonTitles } })
      await load()
    } catch (e) { alert(e.message) }
  }
  const del = async () => {
    try { await api(`/admin/drafts/${draftId}`, { method: 'DELETE' }); onBack() } catch (e) { alert(e.message) }
  }

  if (!draft) return <div className="grid place-items-center py-20 text-slate-400"><Loader2 className="h-6 w-6 animate-spin" /></div>

  const c = draft.course
  const isGen = draft.status === 'generating'
  const isReady = draft.status === 'ready'
  const isPub = draft.status === 'published'
  const isErr = draft.status === 'error'

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <button onClick={onBack} className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> All drafts</button>

      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[11px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full border ${STATUS_STYLES[draft.status] || 'bg-slate-100'}`}>{draft.status}</span>
            <span className="text-xs text-slate-500">{c.category} · {c.level}</span>
            {saving && <span className="text-xs text-slate-400 inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> saving</span>}
          </div>
          <input value={c.title} onChange={(e) => setDraft({ ...draft, course: { ...c, title: e.target.value } })} onBlur={() => patch(c)} className="mt-2 w-full text-3xl font-semibold tracking-tight text-slate-900 bg-transparent border-none focus:outline-none focus:ring-0" />
          <input value={c.tagline || ''} onChange={(e) => setDraft({ ...draft, course: { ...c, tagline: e.target.value } })} onBlur={() => patch(c)} placeholder="Course tagline" className="mt-1 w-full text-slate-600 bg-transparent border-none focus:outline-none focus:ring-0" />
        </div>
        <div className="flex flex-wrap gap-2">
          {isReady && <button onClick={publish} className="h-10 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium inline-flex items-center gap-1.5"><Send className="h-4 w-4" /> Publish</button>}
          {isPub && <button onClick={unpublish} className="h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium inline-flex items-center gap-1.5"><Undo2 className="h-4 w-4" /> Unpublish</button>}
          {isPub && <a href={`/learn/${c.lessons[0]?.slug}`} target="_blank" rel="noreferrer" className="h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 text-sm font-medium inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> View live</a>}
          {isErr && <button onClick={retry} className="h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium inline-flex items-center gap-1.5"><RefreshCw className="h-4 w-4" /> Retry</button>}
          <button onClick={() => (confirmDelete ? del() : setConfirmDelete(true))} className={`h-10 px-4 rounded-lg text-sm font-medium inline-flex items-center gap-1.5 ${confirmDelete ? 'bg-red-600 text-white' : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-800'}`}>
            <Trash2 className="h-4 w-4" /> {confirmDelete ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </header>

      {isGen && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-blue-900 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Generating lesson {(draft.progress?.done ?? 0) + 1} of {draft.progress?.total ?? '?'}…</div>
            <div className="text-xs text-blue-700">{draft.progress?.done ?? 0} / {draft.progress?.total ?? '?'}</div>
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-blue-100 overflow-hidden">
            <div className="h-full bg-blue-600 transition-all" style={{ width: `${((draft.progress?.done || 0) / Math.max(1, draft.progress?.total || 1)) * 100}%` }} />
          </div>
        </div>
      )}
      {isErr && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <div className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /><div>
            <div className="font-medium">Generation stopped</div>
            <div className="text-xs mt-1 break-all">{draft.error}</div>
            {(draft.error || '').includes('budget') && <div className="text-xs mt-2 text-red-700">Your Emergent LLM key budget is exceeded. Increase the budget in Emergent → Profile → Universal Key → Add Balance, then click Retry.</div>}
          </div></div>
        </div>
      )}

      <ol className="space-y-3">
        {(c.lessons || []).map((l, i) => (
          <LessonEditor key={i} index={i} lesson={l} onChange={(next) => {
            const lessons = [...c.lessons]; lessons[i] = next
            const nextCourse = { ...c, lessons }
            setDraft({ ...draft, course: nextCourse })
          }} onCommit={() => patch(c)} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
        ))}
      </ol>

      {isReady && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-slate-900">Ready to publish?</div>
            <div className="text-sm text-slate-600">Once published, this course appears on the site and its lessons get public SEO pages under /learn/.</div>
          </div>
          <button onClick={publish} className="h-10 px-5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium inline-flex items-center gap-1.5"><Send className="h-4 w-4" /> Publish course</button>
        </div>
      )}
    </div>
  )
}

function LessonEditor({ index, lesson, onChange, onCommit, open, onToggle }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button onClick={onToggle} className="w-full text-left p-4 flex items-center gap-3 hover:bg-slate-50">
        <div className="h-8 w-8 shrink-0 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-xs font-semibold">{index + 1}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate">{lesson.title}</div>
          <div className="text-xs text-slate-500">{lesson.minutes} min · {lesson.objectives?.length || 0} objectives · {lesson.flashcards?.length || 0} cards · {lesson.quiz?.length || 0} quiz · {lesson.sources?.length || 0} sources</div>
        </div>
        {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-100 p-4 space-y-5 bg-slate-50/40">
          <Field label="Title">
            <input value={lesson.title} onChange={(e) => onChange({ ...lesson, title: e.target.value })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
          </Field>
          <div className="grid gap-3 md:grid-cols-4">
            <Field label="Minutes">
              <input type="number" min={2} max={8} value={lesson.minutes} onChange={(e) => onChange({ ...lesson, minutes: parseInt(e.target.value) || 4 })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
            </Field>
            <Field label="Slug">
              <input value={lesson.slug} onChange={(e) => onChange({ ...lesson, slug: e.target.value })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono bg-white" />
            </Field>
          </div>
          <Field label="Learning objectives">
            <div className="space-y-2">
              {(lesson.objectives || []).map((o, i) => (
                <input key={i} value={o} onChange={(e) => { const a = [...lesson.objectives]; a[i] = e.target.value; onChange({ ...lesson, objectives: a }) }} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
              ))}
            </div>
          </Field>
          <Field label="Theory (use **bold** and - lists, paragraphs separated by blank lines)">
            <textarea value={lesson.theory} onChange={(e) => onChange({ ...lesson, theory: e.target.value })} onBlur={onCommit} rows={10} className="w-full rounded-lg border border-slate-200 p-3 text-sm bg-white font-serif leading-relaxed" />
          </Field>

          <ArrayEditor label="Embedded active-recall questions" items={lesson.embedded || []} onChange={(items) => onChange({ ...lesson, embedded: items })} onCommit={onCommit} renderItem={QuizItem} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} />
          <ArrayEditor label="Flashcards" items={lesson.flashcards || []} onChange={(items) => onChange({ ...lesson, flashcards: items })} onCommit={onCommit} renderItem={FlashcardItem} makeNew={() => ({ front: '', back: '' })} />
          <ArrayEditor label="Quiz questions" items={lesson.quiz || []} onChange={(items) => onChange({ ...lesson, quiz: items })} onCommit={onCommit} renderItem={QuizItem} makeNew={() => ({ q: '', options: ['', '', ''], correct: 0, explanation: '' })} />
          <ArrayEditor label="Sources" items={lesson.sources || []} onChange={(items) => onChange({ ...lesson, sources: items })} onCommit={onCommit} renderItem={SourceItem} makeNew={() => ({ label: '', url: '' })} />

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Image prompt (for AI/stock photo)">
              <textarea value={lesson.imagePrompt || ''} onChange={(e) => onChange({ ...lesson, imagePrompt: e.target.value })} onBlur={onCommit} rows={2} className="w-full rounded-lg border border-slate-200 p-3 text-sm bg-white" />
            </Field>
            <Field label="Image search keywords">
              <input value={lesson.imageSearch || ''} onChange={(e) => onChange({ ...lesson, imageSearch: e.target.value })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
            </Field>
          </div>
          <Field label="Image URL (paste a royalty-free image; leave blank to use default)">
            <input value={lesson.image || ''} onChange={(e) => onChange({ ...lesson, image: e.target.value })} onBlur={onCommit} placeholder="https://images.unsplash.com/..." className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white font-mono" />
          </Field>
          {lesson.image && <img src={lesson.image} alt="" className="w-full h-40 object-cover rounded-lg border border-slate-200" />}

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="SEO title">
              <input value={lesson.seo?.title || ''} onChange={(e) => onChange({ ...lesson, seo: { ...(lesson.seo || {}), title: e.target.value } })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
            </Field>
            <Field label="SEO description">
              <input value={lesson.seo?.description || ''} onChange={(e) => onChange({ ...lesson, seo: { ...(lesson.seo || {}), description: e.target.value } })} onBlur={onCommit} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm bg-white" />
            </Field>
          </div>
        </div>
      )}
    </li>
  )
}

function ArrayEditor({ label, items, onChange, onCommit, renderItem: Item, makeNew }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-700 mb-1.5">{label}</div>
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg border border-slate-200 bg-white p-3 relative">
            <button onClick={() => { const a = items.filter((_, j) => j !== i); onChange(a); onCommit() }} className="absolute top-2 right-2 text-slate-400 hover:text-red-600" aria-label="Remove"><X className="h-4 w-4" /></button>
            <Item item={it} onChange={(next) => { const a = [...items]; a[i] = next; onChange(a) }} onCommit={onCommit} />
          </div>
        ))}
        <button onClick={() => { onChange([...items, makeNew()]); }} className="h-9 px-3 text-xs rounded-lg border border-dashed border-slate-300 bg-white hover:border-blue-400 text-slate-600 inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5" /> Add</button>
      </div>
    </div>
  )
}

function QuizItem({ item, onChange, onCommit }) {
  return (
    <div className="space-y-2">
      <input value={item.q} onChange={(e) => onChange({ ...item, q: e.target.value })} onBlur={onCommit} placeholder="Question" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
      <div className="grid gap-2">
        {(item.options || []).map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <button onClick={() => { onChange({ ...item, correct: i }); onCommit() }} className={`h-8 w-8 shrink-0 rounded-full border text-xs font-semibold ${item.correct === i ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200 text-slate-500'}`}>{String.fromCharCode(65 + i)}</button>
            <input value={opt} onChange={(e) => { const opts = [...item.options]; opts[i] = e.target.value; onChange({ ...item, options: opts }) }} onBlur={onCommit} className="flex-1 h-9 rounded-lg border border-slate-200 px-3 text-sm" />
          </div>
        ))}
      </div>
      <input value={item.explanation || ''} onChange={(e) => onChange({ ...item, explanation: e.target.value })} onBlur={onCommit} placeholder="Explanation for the correct answer" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm" />
    </div>
  )
}

function FlashcardItem({ item, onChange, onCommit }) {
  return (
    <div className="grid gap-2 md:grid-cols-2">
      <input value={item.front} onChange={(e) => onChange({ ...item, front: e.target.value })} onBlur={onCommit} placeholder="Front (question)" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
      <input value={item.back} onChange={(e) => onChange({ ...item, back: e.target.value })} onBlur={onCommit} placeholder="Back (answer)" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
    </div>
  )
}

function SourceItem({ item, onChange, onCommit }) {
  return (
    <div className="grid gap-2 md:grid-cols-[1fr_1.4fr]">
      <input value={item.label} onChange={(e) => onChange({ ...item, label: e.target.value })} onBlur={onCommit} placeholder="Source label (e.g. BJCP 2021 Style Guidelines)" className="h-10 rounded-lg border border-slate-200 px-3 text-sm" />
      <input value={item.url} onChange={(e) => onChange({ ...item, url: e.target.value })} onBlur={onCommit} placeholder="https://..." className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-mono" />
    </div>
  )
}
