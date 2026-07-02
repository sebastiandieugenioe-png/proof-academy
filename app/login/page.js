'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react'

async function api(path, opts = {}) {
  const r = await fetch(`/api${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(d.error || `HTTP ${r.status}`); e.status = r.status; e.body = d; throw e }
  return d
}

export default function LoginPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const nextPath = sp?.get('next') || '/'
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('osc.userId') : null
    if (!saved) { setChecking(false); return }
    ;(async () => {
      try {
        const r = await fetch(`/api/me?userId=${encodeURIComponent(saved)}`)
        if (r.ok) { router.replace(nextPath); return }
      } catch {}
      setChecking(false)
    })()
  }, [router, nextPath])

  const submit = async (e) => {
    e.preventDefault(); setError('')
    setLoading(true)
    try {
      const r = await api('/login', { method: 'POST', body: { email, password } })
      if (typeof window !== 'undefined') localStorage.setItem('osc.userId', r.user.id)
      router.replace(nextPath)
    } catch (e) {
      if (e.status === 428 && e.body?.needsPasswordSetup) {
        setNeedsPasswordSetup(true); setError('')
      } else {
        setError(e.message)
      }
    } finally { setLoading(false) }
  }

  const setupPassword = async (e) => {
    e.preventDefault(); setError('')
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      const r = await api('/set-password', { method: 'POST', body: { email, password: newPassword, confirmPassword } })
      if (typeof window !== 'undefined') localStorage.setItem('osc.userId', r.user.id)
      router.replace(nextPath)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  if (checking) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
    )
  }

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
            {!needsPasswordSetup ? (
              <>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
                <p className="mt-1.5 text-sm text-slate-600">Log in to continue learning.</p>
                <form onSubmit={submit} className="mt-6 space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" placeholder="you@example.com" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Password</label>
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{error}</div>}
                  <button disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Log in <ArrowRight className="h-4 w-4" /></>}
                  </button>
                  <p className="text-xs text-slate-500 text-center">
                    New to Online Spirits Club? <Link href="/register" className="text-blue-700 hover:underline font-medium">Create an account</Link>
                  </p>
                </form>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-blue-700 mb-2"><KeyRound className="h-5 w-5" /><span className="text-xs font-medium uppercase tracking-wide">Account upgrade</span></div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set a password to continue</h1>
                <p className="mt-1.5 text-sm text-slate-600">Your account was created before we required passwords. Set one now to secure it — your learning progress will be kept.</p>
                <form onSubmit={setupPassword} className="mt-6 space-y-3.5">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
                    <div className="w-full h-10 rounded-lg border border-slate-200 px-3 grid items-center bg-slate-50 text-slate-600 text-sm">{email}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">New password <span className="text-slate-400 font-normal">— at least 8 characters</span></label>
                    <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="password" required minLength={8} autoComplete="new-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Confirm password</label>
                    <input value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" required minLength={8} autoComplete="new-password" className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{error}</div>}
                  <button disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Set password &amp; log in <ArrowRight className="h-4 w-4" /></>}
                  </button>
                </form>
              </>
            )}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Passwords are hashed with bcrypt. We never store them in clear text.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
