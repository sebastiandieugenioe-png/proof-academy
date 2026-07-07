// Shared public footer for every user-facing page.
// Contains: brand line, legal-page links, and a responsible-drinking disclaimer.
// Server component (no client-side state) — safe to import from any page.

import Link from 'next/link';
import OscLogo from './OscLogo';

const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/cookies', label: 'Cookie Policy' },
  { href: '/contact', label: 'Contact' },
  { href: '/data-rights', label: 'Data Rights' },
];

export default function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <div className="flex items-center gap-2">
          <OscLogo variant="full" size={22} />
        </div>
        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-slate-600 hover:text-slate-900 hover:underline underline-offset-4">
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="text-xs text-slate-500 leading-relaxed">
          <p>
            © {year} <strong>Online Spirits Club</strong>. A free educational platform. Ireland-based.
          </p>
          <p className="mt-2">
            <strong>Drink responsibly.</strong> This site is for people of legal drinking age. Never drink and drive.
            Alcohol should be enjoyed in moderation and only where legal.
            If you or someone you know is struggling with alcohol, please seek help from a qualified health professional.
          </p>
        </div>
      </div>
    </footer>
  );
}
