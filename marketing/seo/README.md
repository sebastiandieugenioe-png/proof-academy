# SEO guides — how they're made

Same dynamic as the reels: the owner chooses, Claude does the rest.

1. **Sunday:** the weekly task proposes 2–3 guide ideas in the "Calendario de contenido" sheet (Formato = "Artículo SEO", Estado = "Propuesta"). Each answers one question people actually search, ideally on the same topic as a reel that week.
2. **Owner:** marks the ones he wants as "Elegido" and adds 2–3 lines of his own experience (column B).
3. **Claude:** writes `lib/guides/<slug>.js` (see the format in `lib/guides/index.js`), adds it to `GUIDES`, commits and pushes.
4. **Owner:** deploys with the usual Emergent prompt (one deploy per week for all new guides).
5. **Monthly:** check Search Console (queries with impressions) and improve those guides; bump `updated`.

## Rules
- **Voice: follow `VOICE.md`.** Casual, short, Sebastián's way of talking. Never formal or posh.
- Facts only from the site's lessons; every guide links to the lessons it uses.
- The owner's experience is what makes each guide worth ranking: no guide without it.
- Max 2–3 new guides a week (Google's "scaled content abuse" policy targets mass-produced pages).
- Written in English, first person where it's the owner's experience, signed by him.
- Every guide ends with the flashcards CTA (built into the page) and the 18+ line.
- When the companion reel is on YouTube, set `youtubeId` to embed it.
