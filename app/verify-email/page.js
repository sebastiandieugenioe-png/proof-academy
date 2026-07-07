'use client'

// Consumes the one-time verification link. On success, logs the user in and
// bounces them to the dashboard. On failure (invalid / expired / already used),
// shows a clear error + a resend form so they aren't stuck.

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Check, AlertTriangle, ArrowLeft, Mail } from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import OscLogo from '@/components/OscLogo'

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
          <Link href="/" className="flex items-center gap-2" aria-label="Online Spirits Club — home">
            <OscLogo size={28} className="sm:hidden" />
            <OscLogo variant="full" size={28} className="hidden sm:inline-flex" />
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

function VerifyInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const token = sp.get('token') || ''
  const [phase, setPhase] = useState('working') // working | success | error | resent
  const [errMsg, setErrMsg] = useState('')
  const [resendEmail, setResendEmail] = useState('')
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!token) { setPhase('error'); setErrMsg('Missing verification token. Please open the link from your email again.'); return }
    let cancelled = false
    ;(async () => {
      try {
        await api('/auth/verify-email', { method: 'POST', body: { token } })
        if (cancelled) return
        setPhase('success')
        setTimeout(() => { if (!cancelled) router.replace('/') }, 1500)
      } catch (e) {
        if (cancelled) return
        setPhase('error')
        setErrMsg(e.message || 'Verification failed. Please request a new link.')
      }
    })()
    return () => { cancelled = true }
  }, [token, router])

  const doResend = async (e) => {
    e.preventDefault()
    if (!resendEmail.trim() || !resendEmail.includes('@')) return
    setResending(true)
    try {
      await api('/auth/resend-verification', { method: 'POST', body: { email: resendEmail.trim().toLowerCase() } })
      setPhase('resent')
    } catch {
      setPhase('resent') // generic response either way — no enumeration
    } finally { setResending(false) }
  }

  if (phase === 'working') {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
        <p className="mt-4 text-sm text-slate-600">Verifying your email…</p>
      </div>
    )
  }

  if (phase === 'success') {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
          <Check className="h-6 w-6 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Email verified!</h1>
        <p className="text-sm text-slate-600">Redirecting you to your dashboard…</p>
      </div>
    )
  }

  if (phase === 'resent') {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 grid place-items-center">
          <Mail className="h-6 w-6 text-blue-700" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Check your inbox</h1>
        <p className="text-sm text-slate-600">If an account exists for that address, a fresh verification email is on its way. It may take a minute to arrive.</p>
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">Back to login</Link>
      </div>
    )
  }

  // error
  return (
    <div className="space-y-4">
      <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 grid place-items-center">
        <AlertTriangle className="h-6 w-6 text-amber-700" />
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Link invalid or expired</h1>
        <p className="mt-2 text-sm text-slate-600">{errMsg}</p>
      </div>
      <form onSubmit={doResend} className="space-y-3 pt-2 border-t border-slate-100">
        <p className="text-sm text-slate-700">Enter your email and we’ll send a new verification link.</p>
        <input
          type="email"
          required
          value={resendEmail}
          onChange={(e) => setResendEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          disabled={resending}
          className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resend verification email'}
        </button>
      </form>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Shell>
      <Suspense fallback={<div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
        <VerifyInner />
      </Suspense>
    </Shell>
  )
}
