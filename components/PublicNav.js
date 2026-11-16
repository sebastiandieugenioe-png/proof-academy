'use client'

// Shared public navigation for logged-out visitor pages.
// Desktop: inline nav.
// Mobile:  hamburger toggles a full-width dropdown sheet.
// "Log in" stays visible on ALL viewports (never inside the drawer).

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import OscLogo from '@/components/OscLogo'

const DEFAULT_LINKS = [
  { href: '/#paths',  label: 'Learning Paths' },
  { href: '/about',   label: 'About' },
]

export default function PublicNav({ active = null, links = DEFAULT_LINKS }) {
  const [open, setOpen] = useState(false)

  // Close on route change (Next.js Link updates the URL without a full reload).
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    window.addEventListener('popstate', close)
    return () => {
      window.removeEventListener('hashchange', close)
      window.removeEventListener('popstate', close)
    }
  }, [])

  // Lock body scroll while the mobile sheet is open (prevents horizontal / vertical scroll bleed).
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const closeAnd = (fn) => () => { setOpen(false); if (typeof fn === 'function') fn() }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Online Spirits Club — home" onClick={closeAnd()}>
          <OscLogo size={28} className="sm:hidden" />
          <OscLogo variant="full" size={28} className="hidden sm:inline-flex" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {links.map((l) => {
            const isActive = active && (l.href === active || l.label.toLowerCase() === active.toLowerCase())
            return isActive ? (
              <span key={l.href} className="px-3 h-9 inline-flex items-center rounded-md text-slate-900 font-medium">{l.label}</span>
            ) : (
              <Link key={l.href} href={l.href} className="px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700">{l.label}</Link>
            )
          })}
          <Link href="/login" className="ml-1 px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700 font-medium">Log in</Link>
        </nav>

        {/* Mobile controls: Log in stays visible; hamburger toggles sheet. */}
        <div className="flex items-center gap-1 md:hidden">
          <Link href="/login" className="px-3 h-9 inline-flex items-center rounded-md hover:bg-slate-100 text-slate-700 font-medium text-sm">Log in</Link>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="h-10 w-10 inline-flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-700"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile sheet — full-width dropdown just below the bar */}
      <div
        id="mobile-nav"
        className={`md:hidden overflow-hidden border-t border-slate-200 transition-[max-height,opacity] duration-200 ${open ? 'max-h-[80vh] opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}
      >
        <nav className="mx-auto max-w-6xl px-4 py-4 flex flex-col">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={closeAnd()}
              className="h-12 flex items-center border-b border-slate-100 text-slate-900 text-base font-medium"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/?course=alcohol-fundamentals"
            onClick={closeAnd()}
            className="mt-4 h-12 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium inline-flex items-center justify-center gap-2"
          >
            Start Learning
          </Link>
        </nav>
      </div>
    </header>
  )
}
