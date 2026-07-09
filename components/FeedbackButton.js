'use client'

// FeedbackButton — small, non-invasive text link that opens a
// bottom-sheet / centered modal for the user to send feedback.
// Auto-captures page context and submits to POST /api/feedback.
//
// Usage:
//   <FeedbackButton pageType="lesson" context={{ courseId, courseTitle, lessonId, lessonTitle }} />
//   <FeedbackButton pageType="dashboard" />

import { useEffect, useState } from 'react'
import { MessageSquare, X, Loader2, Check } from 'lucide-react'

const TYPES = [
  { value: 'suggestion',         label: 'Suggestion' },
  { value: 'content_correction', label: 'Content correction' },
  { value: 'bug',                label: 'Bug report' },
  { value: 'ux_issue',           label: 'UX issue' },
  { value: 'opinion',            label: 'General opinion' },
  { value: 'other',              label: 'Other' },
]

export default function FeedbackButton({
  pageType = 'other',
  context = {},
  label = 'Send feedback',
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('suggestion')
  const [message, setMessage] = useState('')
  const [screenshotUrl, setScreenshotUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | done | error
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onEsc) }
  }, [open])

  const reset = () => {
    setType('suggestion'); setMessage(''); setScreenshotUrl(''); setStatus('idle'); setErrMsg('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (status === 'submitting') return
    if (message.trim().length < 10) { setErrMsg('Please tell us a bit more (at least 10 characters).'); return }
    setStatus('submitting'); setErrMsg('')
    try {
      const payload = {
        type,
        message: message.trim(),
        pageType,
        url: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
        viewport: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '',
        screenshotUrl: screenshotUrl.trim() || undefined,
        courseId: context.courseId || null,
        courseTitle: context.courseTitle || null,
        moduleId: context.moduleId || null,
        moduleTitle: context.moduleTitle || null,
        lessonId: context.lessonId || null,
        lessonTitle: context.lessonTitle || null,
      }
      const res = await fetch('/api/feedback', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not send feedback.')
      setStatus('done')
      // Auto-close after a short beat
      setTimeout(() => { setOpen(false); reset() }, 2200)
    } catch (err) {
      setStatus('error'); setErrMsg(err.message || 'Please try again in a moment.')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition ${className}`}
      >
        <MessageSquare className="h-3.5 w-3.5" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
            className="w-full sm:max-w-lg bg-white sm:rounded-xl rounded-t-2xl border border-slate-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 font-medium">Send feedback</div>
                <div className="mt-0.5 text-sm text-slate-500">
                  {pageType === 'lesson' && context.lessonTitle ? `On: ${context.lessonTitle}` :
                   pageType === 'learning_path' && context.courseTitle ? `On: ${context.courseTitle}` :
                   'Share what would make OSC better.'}
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === 'done' ? (
              <div className="p-8 text-center">
                <div className="inline-flex h-10 w-10 rounded-full bg-slate-900 items-center justify-center">
                  <Check className="h-5 w-5 text-white" />
                </div>
                <p className="mt-4 text-base font-medium text-slate-900">Thank you.</p>
                <p className="mt-1 text-sm text-slate-500">We read every message.</p>
              </div>
            ) : (
              <form onSubmit={submit} className="px-5 py-5 space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full h-11 rounded-lg border border-slate-300 px-3 text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  >
                    {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 font-medium mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    required
                    rows={5}
                    placeholder="What did you notice? Be as specific as helpful."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 resize-y"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
                    <span>{message.length < 10 ? `${10 - message.length} more character${10 - message.length === 1 ? '' : 's'}` : 'Looks good'}</span>
                    <span>{message.length} / 2000</span>
                  </div>
                </div>
                <details className="text-xs text-slate-500">
                  <summary className="cursor-pointer select-none hover:text-slate-800">Attach a screenshot URL (optional)</summary>
                  <input
                    type="url"
                    value={screenshotUrl}
                    onChange={(e) => setScreenshotUrl(e.target.value)}
                    placeholder="https://…"
                    className="mt-2 w-full h-9 rounded-lg border border-slate-300 px-3 text-xs bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  />
                </details>
                {errMsg && <p className="text-sm text-red-600">{errMsg}</p>}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button type="button" onClick={() => setOpen(false)} className="h-10 px-4 rounded-md text-slate-600 hover:bg-slate-100 text-sm">Cancel</button>
                  <button
                    type="submit"
                    disabled={status === 'submitting' || message.trim().length < 10}
                    className="h-10 px-5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium inline-flex items-center gap-2 disabled:opacity-60"
                  >
                    {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sent to the OSC team only. No email involved. We may store your user id and current URL to help fix issues faster.
                </p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
