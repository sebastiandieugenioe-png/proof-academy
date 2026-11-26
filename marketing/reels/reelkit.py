"""Shared runner for reels with voice + Finn.
Usage in a reel file:  reelkit.run(N, "slug", SEGMENTS, GROUPS, DEFAULT, scenes_fn, POSES)
  scenes_fn(durs, at) -> list of scenes;  at(scene_idx, [phrase, ...]) -> list of offsets or None.
  POSES = Finn pose per scene group (None hides him, e.g. on the CTA).
CLI: python3 reels/rNN_x.py [voice.mp3] [--preview] [--no-music] [--no-finn]"""
import itertools, os, sys
import engine


def run(num, slug, segments, groups, default, scenes_fn, poses):
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
    os.makedirs(out, exist_ok=True)
    voice = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
    durs, st = list(default), {}
    if voice:
        breaks, spans, total, pspans = engine.align_phrases(voice, segments)
        cuts = [0.0] + [sum(breaks[g[1]]) / 2 for g in groups[:-1]] + [total + 0.8]
        durs = [b - a for a, b in zip(cuts, cuts[1:])]
        engine.VOICE = voice
        engine.SUBS = engine.build_subs_from_phrases(pspans) if pspans else engine.build_subs(segments, spans)
        st = {p: a for a, b, p in (pspans or [])}
        print("exact phrase alignment:", bool(pspans), "| scenes:", [round(x, 2) for x in durs], "| voice:", round(total, 2))
    starts = [0.0] + list(itertools.accumulate(durs))

    def at(i, phrases):
        if not all(p in st for p in phrases):
            return None
        return [max(0.0, st[p] - starts[i]) for p in phrases]

    engine.MUSIC = None if "--no-music" in sys.argv else engine.pick_music(num)
    engine.FINN = "--no-finn" not in sys.argv
    engine.FINN_POSES = list(zip(starts, poses))
    scenes = scenes_fn(durs, at)
    name = f"r{num:02d}_{slug}"
    if "--preview" in sys.argv:
        engine.preview(scenes, os.path.join(out, "preview_" + name))
    else:
        engine.render(scenes, os.path.join(out, f"osc_{name}.mp4"), preview_dir=os.path.join(out, "preview_" + name))
