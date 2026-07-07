'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Check, AlertTriangle, ArrowLeft, Eye, EyeOff } from 'lucide-react'
import PublicFooter from '@/components/PublicFooter'
import OscLogo from '@/components/OscLogo'

function api(path, body) {
  return fetch(`/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
    credentials: 'same-origin',
  }).then(async (r) => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) { const e = new Error(d.error || `HTTP ${r.status}`); e.status = r.status; throw e }
    return d
  })
}

function Inner() {
  const router = useRouter()
  const sp = useSearchParams()
  const token = sp.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [phase, setPhase] = useState(token ? 'form' : 'error')
  const [busy, setBusy] = useState(false)
  const [errMsg, setErrMsg] = useState(token ? '' : 'Missing reset token. Please open the link from your email again.')

  const submit = async (e) => {
    e.preventDefault()
    setErrMsg('')
    if (password.length < 8) { setErrMsg('Password must be at least 8 characters.'); return }
    if (password !== confirmPassword) { setErrMsg('Passwords do not match.'); return }
    setBusy(true)
    try {
      await api('/auth/reset-password', { token, password, confirmPassword })
      setPhase('success')
      setTimeout(() => router.replace('/login?reset=1'), 1500)
    } catch (e) {
      setErrMsg(e.message || 'Reset failed. Your link may have expired — request a new one.')
      if (String(e.message || '').toLowerCase().includes('invalid') || String(e.message || '').toLowerCase().includes('expired')) {
        setPhase('error')
      }
    } finally { setBusy(false) }
  }

  if (phase === 'success') {
    return (
      <div className="text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 grid place-items-center">
          <Check className="h-6 w-6 text-emerald-700" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Password updated</h1>
        <p className="text-sm text-slate-600">Redirecting you to log in…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="space-y-3 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 grid place-items-center">
          <AlertTriangle className="h-6 w-6 text-amber-700" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Link invalid or expired</h1>
        <p className="text-sm text-slate-600">{errMsg}</p>
        <Link href="/forgot-password" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline">Request a new link</Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Set a new password</h1>
        <p className="mt-1.5 text-sm text-slate-600">Pick something you haven&rsquo;t used before. Minimum 8 characters.</p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">New password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute inset-y-0 right-0 px-3 text-slate-400 hover:text-slate-600">{showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Confirm new password</label>
          <input type={showPw ? 'text' : 'password'} required minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoComplete="new-password" />
        </div>
        {errMsg && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{errMsg}</div>}
        <button disabled={busy} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update password'}
        </button>
      </form>
      <div className="pt-2 text-xs text-slate-500 text-center">
        <Link href="/login" className="text-blue-700 hover:underline">Back to login</Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
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
