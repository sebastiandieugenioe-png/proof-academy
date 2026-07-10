'use client'

// Admin UI for CRUD on marketing tracking links.
// Talks to /api/admin/tracking-links/**  (all admin-guarded).
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Copy, Archive, ArchiveRestore, CopyPlus, Trash2, Save, X, Loader2, ExternalLink, LogOut, RefreshCw,
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

const EMPTY = {
  name: '',
  destinationUrl: 'https://onlinespiritsclub.com/',
  utmSource: '',
  utmMedium: '',
  utmCampaign: '',
  utmContent: '',
  utmTerm: '',
  slug: '',
}

export default function TrackingLinksClient({ adminEmail }) {
  const [links, setLinks] = useState(null)
  const [statusFilter, setStatusFilter] = useState('active')
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState(EMPTY)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLinks(null)
    try {
      const q = statusFilter === 'all' ? '' : `?status=${statusFilter}`
      const res = await api(`/admin/tracking-links${q}`)
      setLinks(res.links || [])
    } catch (e) {
      toast.error(e.message)
      setLinks([])
    }
  }

  useEffect(() => { load() }, [statusFilter])

  const beginCreate = () => { setDraft(EMPTY); setEditingId(null); setCreating(true) }
  const beginEdit = (link) => { setDraft({ ...link, utmContent: link.utmContent || '', utmTerm: link.utmTerm || '' }); setEditingId(link.id); setCreating(true) }
  const cancel = () => { setCreating(false); setDraft(EMPTY); setEditingId(null) }

  const save = async () => {
    setSaving(true)
    try {
      if (editingId) {
        await api(`/admin/tracking-links/${editingId}`, { method: 'PATCH', body: draft })
        toast.success('Tracking link updated')
      } else {
        await api('/admin/tracking-links', { method: 'POST', body: draft })
        toast.success('Tracking link created')
      }
      cancel()
      await load()
    } catch (e) { toast.error(e.message) }
    finally { setSaving(false) }
  }

  const remove = async (link) => {
    if (!window.confirm(`Delete "${link.name}"? This cannot be undone. Consider archiving instead.`)) return
    try { await api(`/admin/tracking-links/${link.id}`, { method: 'DELETE' }); toast.success('Deleted'); await load() }
    catch (e) { toast.error(e.message) }
  }
  const archive = async (link) => {
    const nextStatus = link.status === 'archived' ? 'active' : 'archived'
    try { await api(`/admin/tracking-links/${link.id}/archive`, { method: 'POST', body: { status: nextStatus } }); toast.success(nextStatus === 'archived' ? 'Archived' : 'Restored'); await load() }
    catch (e) { toast.error(e.message) }
  }
  const duplicate = async (link) => {
    try { const r = await api(`/admin/tracking-links/${link.id}/duplicate`, { method: 'POST' }); toast.success('Duplicated'); await load(); beginEdit(r.link) }
    catch (e) { toast.error(e.message) }
  }
  const copyText = async (text, label) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`) }
    catch { toast.error('Copy failed') }
  }

  const logout = async () => { await api('/admin-auth/logout', { method: 'POST' }); window.location.href = '/' }

  const suggestedSlug = useMemo(() => {
    if (!draft.name) return ''
    return draft.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 40)
  }, [draft.name])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/admin" className="h-9 px-3 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 text-sm text-slate-700">
              <ArrowLeft className="h-3.5 w-3.5" /> Admin
            </Link>
            <div>
              <div className="text-sm font-semibold text-slate-900 leading-tight">Tracking Links</div>
              <div className="text-[11px] text-slate-500 leading-tight">{adminEmail}</div>
            </div>
          </div>
          <button onClick={logout} className="text-sm h-9 px-3 rounded-md hover:bg-slate-100 text-slate-600 inline-flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketing tracking links</h1>
            <p className="text-sm text-slate-500">First-party UTM links with short URLs, click counters and attribution rollups.</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700">
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            <button onClick={load} className="h-9 px-3 rounded-md border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1.5 text-sm text-slate-700">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={beginCreate} className="h-9 px-3 rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5 text-sm">
              <Plus className="h-3.5 w-3.5" /> New link
            </button>
          </div>
        </div>

        {creating && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-slate-900">{editingId ? 'Edit tracking link' : 'New tracking link'}</h2>
              <button onClick={cancel} className="h-8 px-2 rounded-md text-slate-500 hover:bg-slate-100 inline-flex items-center gap-1 text-sm"><X className="h-4 w-4" /> Cancel</button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Internal name" required>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputCls} placeholder="e.g. Instagram Bio Link — Whiskey campaign" />
              </Field>
              <Field label="Short slug" required>
                <div className="flex gap-2">
                  <input value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value.toLowerCase() })} className={inputCls} placeholder="whiskey-ig-1" />
                  {!editingId && suggestedSlug && draft.slug !== suggestedSlug && (
                    <button type="button" onClick={() => setDraft({ ...draft, slug: suggestedSlug })} className="whitespace-nowrap px-3 h-10 rounded-md border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">use: {suggestedSlug}</button>
                  )}
                </div>
              </Field>
              <Field label="Destination URL" required className="md:col-span-2">
                <input value={draft.destinationUrl} onChange={(e) => setDraft({ ...draft, destinationUrl: e.target.value })} className={inputCls} placeholder="https://onlinespiritsclub.com/learn/whiskey" />
                <p className="mt-1 text-xs text-slate-500">Full URL or site-relative path. The tracking link will append UTM parameters automatically.</p>
              </Field>
              <Field label="UTM Source" required><input value={draft.utmSource} onChange={(e) => setDraft({ ...draft, utmSource: e.target.value })} className={inputCls} placeholder="instagram" /></Field>
              <Field label="UTM Medium" required><input value={draft.utmMedium} onChange={(e) => setDraft({ ...draft, utmMedium: e.target.value })} className={inputCls} placeholder="social" /></Field>
              <Field label="UTM Campaign" required><input value={draft.utmCampaign} onChange={(e) => setDraft({ ...draft, utmCampaign: e.target.value })} className={inputCls} placeholder="summer-launch" /></Field>
              <Field label="UTM Content (optional)"><input value={draft.utmContent} onChange={(e) => setDraft({ ...draft, utmContent: e.target.value })} className={inputCls} placeholder="bio-link" /></Field>
              <Field label="UTM Term (optional)" className="md:col-span-2"><input value={draft.utmTerm} onChange={(e) => setDraft({ ...draft, utmTerm: e.target.value })} className={inputCls} placeholder="whiskey learning path" /></Field>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={cancel} className="h-9 px-3 rounded-md border border-slate-200 hover:bg-slate-50 text-sm text-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="h-9 px-3 rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 inline-flex items-center gap-1.5 text-sm">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                {editingId ? 'Save changes' : 'Create link'}
              </button>
            </div>
          </div>
        )}

        {links === null ? (
          <div className="py-12 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : links.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-500">No tracking links {statusFilter !== 'all' ? `(${statusFilter})` : ''} yet.</p>
            <button onClick={beginCreate} className="mt-4 h-9 px-3 rounded-md bg-slate-900 text-white hover:bg-slate-800 inline-flex items-center gap-1.5 text-sm"><Plus className="h-3.5 w-3.5" /> Create your first link</button>
          </div>
        ) : (
          <div className="space-y-3">
            {links.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                onEdit={() => beginEdit(link)}
                onArchive={() => archive(link)}
                onDuplicate={() => duplicate(link)}
                onRemove={() => remove(link)}
                onCopy={copyText}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

const inputCls = 'w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400'

function Field({ label, required, children, className }) {
  return (
    <label className={`block ${className || ''}`}>
      <div className="text-xs font-medium text-slate-600 mb-1">{label}{required && <span className="text-rose-500"> *</span>}</div>
      {children}
    </label>
  )
}

function LinkCard({ link, onEdit, onArchive, onDuplicate, onRemove, onCopy }) {
  const archived = link.status === 'archived'
  return (
    <div className={`rounded-lg border ${archived ? 'border-slate-200 bg-slate-50' : 'border-slate-200 bg-white'} p-4 shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <button onClick={onEdit} className="text-sm font-medium text-slate-900 hover:underline text-left">{link.name || '(untitled)'}</button>
            {archived && <span className="text-[10px] uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">archived</span>}
          </div>
          <div className="mt-1 text-xs text-slate-500 truncate">
            {link.utmSource} / {link.utmMedium} / {link.utmCampaign}
            {link.utmContent && <> / <span className="text-slate-400">{link.utmContent}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="text-right">
            <div className="text-slate-400 uppercase tracking-wider">Clicks</div>
            <div className="text-lg font-semibold text-slate-900">{link.clickCount ?? 0}</div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <UrlRow label="Short"    value={link.shortUrl} onCopy={() => onCopy(link.shortUrl, 'Short URL')} />
        <UrlRow label="Full"     value={link.fullUrl}  onCopy={() => onCopy(link.fullUrl, 'Full URL')} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={onDuplicate} className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-1 text-xs text-slate-700"><CopyPlus className="h-3.5 w-3.5" /> Duplicate</button>
        <button onClick={onArchive} className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-1 text-xs text-slate-700">
          {archived ? <><ArchiveRestore className="h-3.5 w-3.5" /> Restore</> : <><Archive className="h-3.5 w-3.5" /> Archive</>}
        </button>
        <button onClick={onEdit} className="h-8 px-2 rounded-md border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-1 text-xs text-slate-700">Edit</button>
        <button onClick={onRemove} className="h-8 px-2 rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 text-xs"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
      </div>
    </div>
  )
}

function UrlRow({ label, value, onCopy }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-100 bg-slate-50 pl-3 pr-1 h-9">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 w-10">{label}</div>
      <a href={value} target="_blank" rel="noreferrer" className="flex-1 truncate text-xs text-slate-700 hover:underline">{value}</a>
      <a href={value} target="_blank" rel="noreferrer" className="h-7 w-7 grid place-items-center rounded hover:bg-slate-200 text-slate-500" title="Open"><ExternalLink className="h-3.5 w-3.5" /></a>
      <button onClick={onCopy} className="h-7 px-2 rounded hover:bg-slate-200 text-slate-600 inline-flex items-center gap-1 text-xs"><Copy className="h-3.5 w-3.5" /> Copy</button>
    </div>
  )
}
