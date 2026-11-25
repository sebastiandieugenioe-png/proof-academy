"""Reel 02 — Chat: 'Can I get a whiskey?'
Facts: Whiskey › Irish Whiskey (smooth, light, easy to drink), Bourbon (vanilla, caramel),
Rye Whiskey (spicy, peppery, dry), Scotch Whisky (Islay = smoky). Experience: owner (local / tried yourself)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
from formats import hook_scene, chat_scene, points_scenes, statement_scene, cta_scene

SEGMENTS = [
    "Can I get a whiskey?",
    "Don't just pour. Ask this.",
    "Where are you from?",
    "First time in Ireland? Then go local: an Irish whiskey. Smooth, light, and easy to drink.",
    "Not in Ireland? Match the flavour. Sweet? Bourbon: vanilla and caramel.",
    "Spicy? Rye: peppery and dry.",
    "Smoky? A Scotch from Islay.",
    "Bar manager tip: recommend something you've tried yourself.",
    "Learn every whiskey style in five minutes, then lock it in with free flashcards. Link in bio.",
]
GROUPS = [(0, 1), (2, 3), (4, 6), (7, 7), (8, 8)]   # segments per scene
DEFAULT = [2.8, 8.0, 7.5, 3.0, 3.8]


def scenes_for(d, chat_at=None, points_at=None):
    return [
        hook_scene("“Can I get a whiskey?”", "Don't just pour. Ask this.", duration=d[0]),
        chat_scene([
            ("guest", "Can I get a whiskey?", None),
            ("bar", "Sure! Where are you from?", ["from?"]),
            ("guest", "First time in Ireland!", None),
            ("bar", "Then go local: an Irish whiskey. Smooth, light and easy to drink.", ["Irish", "whiskey."]),
        ], title="What to say", fit=d[1], at=chat_at),
        *points_scenes("Not in Ireland? Match the flavour.", [
            "Sweet? Bourbon: vanilla & caramel",
            "Spicy? Rye: peppery & dry",
            "Smoky? Scotch from Islay",
        ], fit=d[2], at=points_at),
        statement_scene("BAR MANAGER TIP", "Recommend something you've tried yourself.", duration=d[3], sound="chime"),
        cta_scene("Whiskey", duration=d[4], kicker="FREE 5-MINUTE LESSONS"),
    ]


if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "out")
    os.makedirs(out, exist_ok=True)
    voice = next((a for a in sys.argv[1:] if not a.startswith("--")), None)
    durs = DEFAULT
    pspans = None
    if voice:
        breaks, spans, total, pspans = engine.align_phrases(voice, SEGMENTS)
        cuts = [0.0]
        for g in GROUPS[:-1]:
            last = g[1]
            s, e = breaks[last]               # pause after the last segment of this scene
            cuts.append((s + e) / 2)
        cuts.append(total + 0.8)
        durs = [b - a for a, b in zip(cuts, cuts[1:])]
        engine.VOICE = voice
        engine.SUBS = engine.build_subs_from_phrases(pspans) if pspans else engine.build_subs(SEGMENTS, spans)
        print('exact phrase alignment:', bool(pspans))
        print("scene durations:", [round(x, 2) for x in durs], "voice:", round(total, 2))
    chat_at = points_at = None
    if voice and pspans:
        st = {p: a for a, b, p in pspans}
        c0, p0 = durs[0], durs[0] + durs[1]
        chat_at = [0.0, st["Where are you from?"] - c0, st["First time in Ireland?"] - c0, st["Then go local:"] - c0]
        points_at = [st["Sweet?"] - p0, st["Spicy?"] - p0, st["Smoky?"] - p0]
        print("chat_at", [round(x, 2) for x in chat_at], "points_at", [round(x, 2) for x in points_at])
    sc = scenes_for(durs, chat_at, points_at)
    if "--preview" in sys.argv:
        engine.preview(sc, os.path.join(out, "preview_r02"))
    else:
        engine.render(sc, os.path.join(out, "osc_r02_whiskey.mp4"), preview_dir=os.path.join(out, "preview_r02"))
