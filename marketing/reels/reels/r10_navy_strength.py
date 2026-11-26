"""Reel 10 — Guide: drink stories. Navy Strength gin and the gunpowder.
Facts: Gin › Navy Strength Gin (~57% ABV or more, gunpowder story, partly legend)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "Why is it called Navy Strength gin?",
    "It's around fifty-seven percent or more.",
    "The story: gunpowder soaked in spirit that strong would still light. That was the proof the booze wasn't watered down.",
    "Part of it is probably legend, so tell it with a wink.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]
DEFAULT = [3.0, 3.6, 8.0, 4.0, 4.6]
POSES = ["point", "idle", "open", "thumbs", None]


def scenes(d, at):
    return [
        hook_scene("Why “Navy Strength”?", None, duration=d[0]),
        statement_scene("NAVY STRENGTH GIN", "Around 57% ABV or more", duration=d[1]),
        *did_you_know_scenes("Gunpowder test", "Soaked in spirit that strong, it would still light. Proof it wasn't watered down.", duration=d[2]),
        statement_scene("TELL IT WITH A WINK", "Part of it is probably legend.", duration=d[3], sound="chime"),
        engine.guide_cta_scene("Drink stories", duration=d[4]),
    ]


if __name__ == "__main__":
    reelkit.run(10, "navy_strength", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
