# OSC reels

Animated vertical reels (1080x1920, 30 fps) with synthesized SFX. Python + Pillow + numpy + ffmpeg, no network.

- `engine.py` – brand, text animation, background, progress bar, handle, SFX synth (whoosh, pop, ding, buzz, tick, type, chime, thump), per-scene render + concat + audio mux, preview stills.
- `formats.py` – hook, chat, versus, statement, quiz, myth/fact, CTA.
- `reels/rNN_*.py` – one file per reel. `python3 reels/r01_ale_vs_lager.py --preview` for stills, without the flag for the MP4 (written to `out/`).

Rule: every fact in a reel must come from a lesson on onlinespiritsclub.com (Lecciones tab); experience lines come from the owner.
Not part of the website build.

## Flashcards message (since 25/11/2026)
Every reel ends promoting the study method: the CTA scene shows "+ flashcards that make it stick" and the narration closes with
"Learn it in 5 minutes, then lock it in with free flashcards. Link in bio." Describe only what OSC offers (5-min lessons,
flashcards, quiz, Study review with a free account); no scientific claims or statistics.

## Rule (25/11/2026): every reel points to the long guide
- If the reel's topic has a guide in /guides, end with `engine.guide_cta_scene("<guide topic>")` and the voice line `engine.GUIDE_VOICE_LINE` ("Full guide on our site, plus a free five-minute lesson and flashcards. Link in bio.").
- Post captions mention the guide too: "Full guide on our site (link in bio) + free 5-min lesson & flashcards." YouTube description gets the full guide URL.
- No guide yet for the topic: use the normal `cta_scene` (lesson + flashcards) and propose a guide for that topic in the next weekly ideas.
- Captions and voice lines follow the casual voice in `marketing/seo/VOICE.md`.
