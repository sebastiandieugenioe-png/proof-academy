'use client'

import { useEffect, useState } from 'react'
import { Lock, Loader2, ShieldAlert, LogIn } from 'lucide-react'

export default function AdminUnlock() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingUser, setCheckingUser] = useState(true)

  useEffect(() => {
    // Try to prefill email from local login session
    (async () => {
      try {
        const userId = typeof window !== 'undefined' ? window.localStorage.getItem('osc.userId') : null
        if (userId) {
          const r = await fetch('/api/me', { headers: { 'x-user-id': userId } })
          if (r.ok) { const u = await r.json(); if (u?.email) setEmail(u.email) }
        }
      } catch {}
      setCheckingUser(false)
    })()
  }, [])

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      // Reload so server component picks up cookie and renders the dashboard
      window.location.reload()
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white grid place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex h-11 w-11 rounded-xl bg-slate-900 text-white items-center justify-center shadow-md"><Lock className="h-5 w-5" /></div>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">Admin access</h1>
          <p className="text-sm text-slate-500 mt-1">Restricted area. Two-factor gate.</p>
        </div>
        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Admin email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email"
              placeholder={checkingUser ? 'Checking…' : 'you@example.com'}
              className="w-full h-11 rounded-lg border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Admin password</label>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required autoComplete="current-password"
              className="w-full h-11 rounded-lg border border-slate-200 px-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md p-3">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <button disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogIn className="h-4 w-4" /> Unlock</>}
          </button>
          <p className="text-xs text-slate-400 text-center">Session lasts 12 hours.</p>
        </form>
        <div className="text-center mt-4">
          <a href="/" className="text-xs text-slate-500 hover:text-slate-800">← Back to site</a>
        </div>
      </div>
    </div>
  )
}
