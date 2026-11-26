"""Reel 08 — Guide: wine when you're not an expert. Brut vs Extra Dry + bubbles basics.
Facts: Wine › Sparkling Wine Basics (Brut drier than Extra Dry, Champagne 2nd fermentation in bottle, Prosecco = Glera, 6–10 °C)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "Quick one. Which is drier: Brut, or Extra Dry?",
    "Brut. Weird, but Extra Dry is actually the sweeter one.",
    "More bubbles basics. Champagne gets its second fermentation in the bottle. Prosecco is made from a grape called Glera. And serve it cold: six to ten degrees.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 0), (1, 1), (2, 2), (3, 3)]
DEFAULT = [4.0, 4.5, 11.0, 4.6]
POSES = ["point", "thumbs", "open", None]


def scenes(d, at):
    return [
        hook_scene("Brut or Extra Dry?", "Which one is drier?", duration=d[0]),
        statement_scene("ANSWER", "Brut. Extra Dry is the sweeter one.", duration=d[1], sound="chime"),
        *points_scenes("Bubbles basics", [
            "Champagne: 2nd fermentation in the bottle",
            "Prosecco = Glera grape",
            "Serve cold: 6–10 °C",
        ], fit=d[2], at=at(2, ["Champagne gets its second fermentation in the bottle.",
                                "Prosecco is made from a grape called Glera.", "And serve it cold:"])),
        engine.guide_cta_scene("Wine for non-experts", duration=d[3]),
    ]


if __name__ == "__main__":
    reelkit.run(8, "brut_extra_dry", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
