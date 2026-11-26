"""Reel 04 — Guide: cocktail recommendation. Sweet, sour or bitter + two options.
Facts: Cocktail Foundations › Understanding Balance. Experience: owner (two options, let them pick)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "Still not sure what cocktail to make them?",
    "Every good cocktail balances four things.",
    "Sweet. Sour. Strong: that's the spirit. And weak: the water from the ice, or the mixer.",
    "So ask: do you like it sweet, fresh and sour, or a bit bitter?",
    "Then give them two options and let them pick. If they choose it, they'll enjoy it more.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 0), (1, 2), (3, 3), (4, 4), (5, 5)]
DEFAULT = [3.0, 8.5, 4.5, 5.5, 4.6]
POSES = ["point", "open", "idle", "thumbs", None]


def scenes(d, at):
    return [
        hook_scene("Not sure what to make them?", None, duration=d[0]),
        *points_scenes("Every cocktail balances 4 things", [
            "Sweet",
            "Sour",
            "Strong = the spirit",
            "Weak = ice water or mixer",
        ], fit=d[1], at=at(1, ["Sweet.", "Sour.", "Strong:", "And weak:"])),
        statement_scene("ASK THIS", "“Sweet, sour or a bit bitter?”", duration=d[2]),
        statement_scene("BAR MANAGER TIP", "Give two options. Let them pick.", duration=d[3], sound="chime"),
        engine.guide_cta_scene("Picking a cocktail", duration=d[4]),
    ]


if __name__ == "__main__":
    reelkit.run(4, "cocktail_balance", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
