'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowRight, ArrowLeft, ShieldCheck } from 'lucide-react'

const ROLE_OPTIONS = ['Bartender','Barback','Waiter/Server','Hospitality student','Cocktail enthusiast','Spirits enthusiast','Beer enthusiast','Wine enthusiast','Bar manager','Other']

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

function AuthShell({ children, title, subtitle }) {
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
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1.5 text-sm text-slate-600">{subtitle}</p>}
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirm] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [role, setRole] = useState('')
  const [newsletter, setNewsletter] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [name, setName] = useState('')

  useEffect(() => {
    // Purge any legacy client-side id from pre-cookie installs.
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem('osc.userId') } catch {}
    }
    ;(async () => {
      try {
        const r = await fetch('/api/me', { credentials: 'include' })
        if (r.ok) { router.replace('/'); return }
      } catch {}
      setChecking(false)
    })()
  }, [router])

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (password !== confirmPassword) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await api('/register', { method: 'POST', body: { email, password, confirmPassword, name, country, city, role, newsletter } })
      router.replace('/')
    } catch (e) {
      if (e.status === 409) setError('This email is already registered. Please log in or contact support.')
      else if (e.status === 429) setError('Too many attempts. Please try again in a few minutes.')
      else setError('Could not create the account. Please check your details and try again.')
    } finally { setLoading(false) }
  }

  if (checking) return <AuthShell title="…"><div className="grid place-items-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div></AuthShell>

  return (
    <AuthShell title="Create your account" subtitle="Free forever. Learn spirits, cocktails and hospitality with evidence-based lessons.">
      <form onSubmit={submit} className="mt-6 space-y-3.5">
        <Field label="Full name (optional)">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" className="input" />
        </Field>
        <Field label="Email" required>
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
        </Field>
        <Field label="Password" required hint="At least 8 characters">
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <Field label="Confirm password" required>
          <input value={confirmPassword} onChange={(e) => setConfirm(e.target.value)} type="password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Country" required>
            <input value={country} onChange={(e) => setCountry(e.target.value)} required maxLength={60} placeholder="e.g. Italy" className="input" />
          </Field>
          <Field label="City" required>
            <input value={city} onChange={(e) => setCity(e.target.value)} required maxLength={80} placeholder="e.g. Milan" className="input" />
          </Field>
        </div>
        <Field label="Current role / status" required>
          <select value={role} onChange={(e) => setRole(e.target.value)} required className="input bg-white">
            <option value="">Select your role…</option>
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer pt-1">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-blue-600" />
          <span>Email me the free weekly spirits newsletter. Unsubscribe anytime.</span>
        </label>
        {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md p-2">{error}</div>}
        <button disabled={loading} className="w-full h-11 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-60 inline-flex items-center justify-center gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4" /></>}
        </button>
        <p className="text-xs text-slate-500 text-center">
          Already have an account? <Link href="/login" className="text-blue-700 hover:underline font-medium">Log in</Link>
        </p>
        <div className="pt-2 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Passwords are hashed with bcrypt. We never store them in clear text.
        </div>
      </form>
      <style jsx>{`
        .input { width: 100%; height: 2.5rem; border-radius: 0.5rem; border: 1px solid rgb(226 232 240); padding: 0 0.75rem; font-size: 0.875rem; outline: none; background: white; }
        .input:focus { border-color: rgb(59 130 246); box-shadow: 0 0 0 3px rgb(59 130 246 / 0.15); }
      `}</style>
    </AuthShell>
  )
}

function Field({ label, required, hint, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>} {hint && <span className="text-slate-400 font-normal">— {hint}</span>}</label>
      {children}
    </div>
  )
}
