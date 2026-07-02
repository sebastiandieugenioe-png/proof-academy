'use client'

// One-click newsletter unsubscribe. Works without login. Reads ?token= from the URL
// (present in the one-click link included with every marketing email) or falls back
// to a manual email form for people who no longer have the link.
//
// Notes on compliance:
//   - Endpoint is idempotent — re-clicks are safe.
//   - Response never confirms/denies whether an unknown email is a subscriber.
//   - Withdrawal timestamp is stored on the user + newsletter subscription record
//     for the GDPR audit trail. The audit endpoint is server-side only.

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, MailX, Check, ArrowLeft } from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'

function api(path, opts = {}) {
  return fetch(`/api${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    credentials: 'same-origin',
  }).then(async (r) => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(d.error || `HTTP ${r.status}`); e.status = r.status; throw e }
    return d
  })
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 grid place-items-center text-white text-sm font-bold">OS</div>
            <span className="font-semibold text-slate-900 hidden sm:inline">Online Spirits Club</span>
          </Link>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </div>
      </header>
      <main className="flex-1 grid place-items-center p-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
            {children}
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}

function UnsubscribeInner() {
  const params = useSearchParams()
  const token = params.get('token') || ''
  const emailFromUrl = params.get('email') || ''
  const [phase, setPhase] = useState('loading') // loading | ready | done | manual | error
  const [maskedEmail, setMaskedEmail] = useState('')
  const [alreadyOff, setAlreadyOff] = useState(false)
  const [manualEmail, setManualEmail] = useState(emailFromUrl)
  const [working, setWorking] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!token) { setPhase('manual'); return }
    ;(async () => {
      try {
        const info = await api(`/newsletter/unsubscribe?token=${encodeURIComponent(token)}`)
        if (cancelled) return
        setMaskedEmail(info.maskedEmail || '')
        setAlreadyOff(!!info.alreadyUnsubscribed)
        setPhase('ready')
      } catch (e) {
        if (cancelled) return
        // Invalid/expired token — offer manual form as a fallback.
        setPhase('manual')
      }
    })()
    return () => { cancelled = true }
  }, [token])

  const confirmUnsub = async () => {
    setWorking(true); setErrMsg('')
    try {
      await api('/newsletter/unsubscribe', { method: 'POST', body: { token } })
      setPhase('done')
    } catch (e) {
      setErrMsg('Something went wrong. Please try again in a moment.')
    } finally {
      setWorking(false)
    }
  }

  const manualUnsub = async (e) => {
    e.preventDefault()
    setWorking(true); setErrMsg('')
    const email = manualEmail.trim().toLowerCase()
    if (!email.includes('@')) { setErrMsg('Please enter a valid email address.'); setWorking(false); return }
    try {
      await api('/newsletter/unsubscribe', { method: 'POST', body: { email } })
      setPhase('done')
    } catch (e) {
      setErrMsg('Something went wrong. Please try again in a moment.')
    } finally {
      setWorking(false)
    }
  }

  if (phase === 'loading') {
    return (
      <div className="grid place-items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
          <Check className="h-6 w-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">You&rsquo;re unsubscribed</h1>
          <p className="mt-2 text-sm text-slate-600">
            You will no longer receive the Online Spirits Club newsletter. It may take up to 24 hours for pending emails already queued to stop.
          </p>
          <p className="mt-3 text-xs text-slate-500">
            You can still use the platform normally without a newsletter subscription. If this was a mistake, sign in and re-opt-in from your profile.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline">Return home</Link>
        </div>
      </div>
    )
  }

  if (phase === 'ready') {
    return (
      <div className="space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 grid place-items-center">
          <MailX className="h-6 w-6 text-blue-700" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unsubscribe from newsletter</h1>
          <p className="mt-2 text-sm text-slate-600">
            We&rsquo;ll stop sending marketing emails to{' '}
            <strong className="font-medium text-slate-900">{maskedEmail || 'this address'}</strong>.
          </p>
          {alreadyOff && (
            <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1.5 inline-block">
              You&rsquo;re already unsubscribed. Clicking below again is safe.
            </p>
          )}
        </div>
        <button
          onClick={confirmUnsub}
          disabled={working}
          className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm — unsubscribe me'}
        </button>
        {errMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{errMsg}</div>}
        <p className="text-xs text-slate-500 text-center">
          Your account, progress and access to all lessons are <strong className="font-medium">not affected</strong> by this. Only the marketing newsletter stops.
        </p>
      </div>
    )
  }

  // manual fallback
  return (
    <div className="space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 grid place-items-center">
        <MailX className="h-6 w-6 text-blue-700" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Unsubscribe from newsletter</h1>
        <p className="mt-2 text-sm text-slate-600">
          Enter your email and we&rsquo;ll remove it from the newsletter list.
        </p>
      </div>
      <form onSubmit={manualUnsub} className="space-y-3">
        <input
          type="email"
          required
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          disabled={working}
          className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {working ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unsubscribe'}
        </button>
        {errMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{errMsg}</div>}
      </form>
      <p className="text-xs text-slate-500 text-center">
        Your account, progress and access to all lessons are <strong className="font-medium">not affected</strong> — only the marketing newsletter is removed.
      </p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Shell>
      <Suspense fallback={<div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
        <UnsubscribeInner />
      </Suspense>
    </Shell>
  )
}
