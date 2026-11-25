// Renders a guide's "markdown-lite" body (see lib/guides/index.js) as React.
// Server component. Only our own guide files are rendered here, but we still
// build React elements (no dangerouslySetInnerHTML) and only allow relative
// links or https links.

import Link from 'next/link';

function safeHref(href) {
  if (href.startsWith('/') || href.startsWith('#')) return href;
  if (/^https:\/\//i.test(href)) return href;
  return null;
}

// **bold** and [text](url)
function inline(text, keyBase = 'i') {
  const out = [];
  const re = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let m;
  let n = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      out.push(<strong key={`${keyBase}-${n++}`} className="font-semibold text-slate-900">{tok.slice(2, -2)}</strong>);
    } else {
      const [, label, href] = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const h = safeHref(href);
      if (!h) out.push(label);
      else if (h.startsWith('/')) out.push(<Link key={`${keyBase}-${n++}`} href={h} className="text-blue-700 underline underline-offset-4 hover:text-blue-900">{label}</Link>);
      else out.push(<a key={`${keyBase}-${n++}`} href={h} rel="noopener" className="text-blue-700 underline underline-offset-4 hover:text-blue-900">{label}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function slugifyHeading(t) {
  return t.toLowerCase().replace(/\*\*/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function guideHeadings(body) {
  return body
    .split('\n')
    .filter((l) => l.startsWith('## '))
    .map((l) => ({ text: l.slice(3).trim(), id: slugifyHeading(l.slice(3).trim()) }));
}

export default function GuideBody({ body }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return (
    <div className="text-[16px] md:text-[17px] leading-relaxed text-slate-700">
      {blocks.map((raw, i) => {
        const b = raw.trim();
        if (b.startsWith('## ')) {
          const t = b.slice(3).trim();
          return <h2 key={i} id={slugifyHeading(t)} className="mt-10 mb-3 scroll-mt-20 text-2xl md:text-[28px] font-semibold tracking-tight text-slate-900">{inline(t, `h${i}`)}</h2>;
        }
        if (b.startsWith('### ')) {
          return <h3 key={i} className="mt-8 mb-2 text-xl font-semibold text-slate-900">{inline(b.slice(4).trim(), `h${i}`)}</h3>;
        }
        if (b.startsWith('> ')) {
          const t = b.split('\n').map((l) => l.replace(/^>\s?/, '')).join(' ');
          return <div key={i} className="my-5 rounded-xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4 text-slate-800">{inline(t, `q${i}`)}</div>;
        }
        const lines = b.split('\n');
        if (lines.every((l) => l.trim().startsWith('- '))) {
          return (
            <ul key={i} className="my-4 pl-5 list-disc space-y-2">
              {lines.map((l, j) => <li key={j}>{inline(l.trim().slice(2), `u${i}-${j}`)}</li>)}
            </ul>
          );
        }
        if (lines.every((l) => /^\d+\.\s/.test(l.trim()))) {
          return (
            <ol key={i} className="my-4 pl-5 list-decimal space-y-2">
              {lines.map((l, j) => <li key={j}>{inline(l.trim().replace(/^\d+\.\s/, ''), `o${i}-${j}`)}</li>)}
            </ol>
          );
        }
        return <p key={i} className="my-4">{inline(lines.join(' '), `p${i}`)}</p>;
      })}
    </div>
  );
}
