# SEO guides — how they're made

Same dynamic as the reels: the owner chooses, Claude does the rest.

**Article first, then reels** (owner's rule, 25/11/2026). Each week = 3 articles, cut into 7 reels that all point back to their article.

1. **Sunday:** the weekly task adds 3 article rows to the "Calendario de contenido" sheet ("[ARTÍCULO A1] …", Formato = "Artículo SEO") and, under each one, its 2-3 reel rows ("[A1] <hook>"). All in Estado "Propuesta".
2. **Owner:** marks the articles he wants as "Elegido" (their reels go with them; he can drop any reel) and adds 2–3 lines of his own experience (column B).
3. **Claude:** writes the article first (`lib/guides/<slug>.js`, added to `GUIDES`), commits and pushes. Then makes that article's reels with `engine.guide_cta_scene()` so each one sends people to the guide.
4. **Owner:** deploys with the Emergent prompt (Claude always gives it ready to paste), then schedules the reels.
5. **Monthly:** check Search Console (queries with impressions) and improve those guides; bump `updated`.

## Rules
- **Voice: follow `VOICE.md`.** Casual, short, Sebastián's way of talking. Never formal or posh.
- Facts only from the site's lessons; every guide links to the lessons it uses.
- The owner's experience is what makes each guide worth ranking: no guide without it.
- Max 2–3 new guides a week (Google's "scaled content abuse" policy targets mass-produced pages).
- Written in English, first person where it's the owner's experience, signed by him.
- Every guide ends with the flashcards CTA (built into the page) and the 18+ line.
- When the companion reel is on YouTube, set `youtubeId` to embed it.
