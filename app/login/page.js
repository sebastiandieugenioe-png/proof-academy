'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'

async function api(path, opts = {}) {
  const r = await fetch(`/api${path}`, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    credentials: 'include',
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
  const rawNext = sp?.get('next') || '/'
  // Only allow same-origin relative redirects.
  const nextPath = typeof rawNext === 'string' && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/'
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Purge any legacy client-side id from pre-cookie installs.
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem('osc.userId') } catch {}
    }
    ;(async () => {
      try {
        const r = await fetch('/api/me', { credentials: 'include' })
        if (r.ok) { router.replace(nextPath); return }
      } catch {}
      setChecking(false)
    })()
  }, [router, nextPath])

  const submit = async (e) => {
    e.preventDefault(); setError('')
    setLoading(true)
    try {
      await api('/login', { method: 'POST', body: { email, password } })
      router.replace(nextPath)
    } catch (e) {
      // Generic error message — do not leak whether an account exists.
      setError('Invalid email or password.')
    } finally { setLoading(false) }
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
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Passwords are hashed with bcrypt. We never store them in clear text.
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
