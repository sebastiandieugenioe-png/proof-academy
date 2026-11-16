// Renders lesson theory + a preview of the interactive features.
// Server component: no interactivity here — the interactive module (study cards,
// knowledge check) opens in the app at /?course=<course>&lesson=<lesson>, free and
// without an account.

import { Brain, Layers, ClipboardCheck } from 'lucide-react';

const formatInline = (t) => {
  const parts = t.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i} className="text-slate-900 font-semibold">{p.slice(2, -2)}</strong>;
    return <span key={i}>{p}</span>;
  });
};

const Paragraph = ({ text }) => {
  if (text.trim().startsWith('- ')) {
    const items = text.split('\n').map((l) => l.replace(/^- /, ''));
    return (
      <ul className="my-4 pl-5 list-disc space-y-1.5 text-slate-700">
        {items.map((it, i) => <li key={i} className="leading-relaxed">{formatInline(it)}</li>)}
      </ul>
    );
  }
  return <p className="my-4 leading-relaxed text-slate-700">{formatInline(text)}</p>;
};

export default function SeoLessonBody({ lesson, moduleHref }) {
  const paragraphs = lesson.theory.split('\n\n');
  return (
    <div className="mt-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-700">What you’ll learn</h2>
        <ul className="mt-3 space-y-2">
          {lesson.objectives.map((o, i) => (
            <li key={i} className="flex gap-2.5 text-slate-800">
              <div className="h-5 w-5 shrink-0 mt-0.5 rounded-full bg-blue-50 text-blue-700 grid place-items-center text-[11px] font-semibold">{i + 1}</div>
              <span className="leading-relaxed">{o}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 text-[15px] md:text-base">
        {paragraphs.map((p, i) => <Paragraph key={i} text={p} />)}
      </div>

      <section className="mt-8 grid gap-3 md:grid-cols-3" aria-label="Interactive module">
        {[
          { icon: Brain, title: `${lesson.embedded?.length || 0} embedded questions`, note: 'Active-recall in-line' },
          { icon: Layers, title: `${lesson.flashcards.length} study cards`, note: 'Spaced repetition' },
          { icon: ClipboardCheck, title: `${lesson.quiz.length}-question knowledge check`, note: 'Explanations included' },
        ].map((f, i) => (
          <a key={i} href={moduleHref} className="rounded-xl border border-slate-200 bg-slate-50 hover:border-blue-400 hover:bg-white p-4 text-center transition">
            <f.icon className="h-5 w-5 text-blue-600 mx-auto" />
            <div className="mt-2 font-medium text-slate-900 text-sm">{f.title}</div>
            <div className="text-xs text-slate-500">{f.note}</div>
          </a>
        ))}
      </section>
    </div>
  );
}
