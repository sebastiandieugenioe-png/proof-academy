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
