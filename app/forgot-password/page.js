'use client'

// Public forgot-password entry. Always shows the SAME success message whether or
// not the email exists, to prevent enumeration.

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import OscLogo from '@/components/OscLogo'

function api(path, opts = {}) {
  return fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.body || {}),
    credentials: 'same-origin',
  }).then(async (r) => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(d.error || `HTTP ${r.status}`); e.status = r.status; throw e }
    return d
  })
}

function Inner() {
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState('form')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      await api('/auth/forgot-password', { body: { email: email.trim().toLowerCase() } })
    } catch {
      // Deliberately swallow all errors — client MUST always see the generic success.
    }
    setPhase('sent')
    setBusy(false)
  }

  if (phase === 'sent') {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 grid place-items-center">
          <Mail className="h-6 w-6 text-blue-700" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Check your inbox</h1>
        <p className="text-sm text-slate-600">If an account exists for that email, we&rsquo;ve sent instructions to reset the password. The link is valid for 1 hour.</p>
        <p className="text-xs text-slate-500">Didn&rsquo;t receive it? Check your spam folder, then <button onClick={() => setPhase('form')} className="text-blue-700 hover:underline">try again</button>.</p>
        <Link href="/login" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">Back to login</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-slate-600">Enter the email you used to sign up. We&rsquo;ll send you a link to set a new password.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
          <input type="email" required autoFocus autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button disabled={busy} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
        </button>
      </form>
      <div className="pt-2 text-xs text-slate-500 text-center">
        Remember it? <Link href="/login" className="text-blue-700 hover:underline">Log in</Link>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
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
            <Suspense fallback={<div className="grid place-items-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>}>
              <Inner />
            </Suspense>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  )
}
