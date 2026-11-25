# OSC reels

Animated vertical reels (1080x1920, 30 fps) with synthesized SFX. Python + Pillow + numpy + ffmpeg, no network.

- `engine.py` – brand, text animation, background, progress bar, handle, SFX synth (whoosh, pop, ding, buzz, tick, type, chime, thump), per-scene render + concat + audio mux, preview stills.
- `formats.py` – hook, chat, versus, statement, quiz, myth/fact, CTA.
- `reels/rNN_*.py` – one file per reel. `python3 reels/r01_ale_vs_lager.py --preview` for stills, without the flag for the MP4 (written to `out/`).

Rule: every fact in a reel must come from a lesson on onlinespiritsclub.com (Lecciones tab); experience lines come from the owner.
Not part of the website build.
