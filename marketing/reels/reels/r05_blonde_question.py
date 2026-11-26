"""Reel 05 — Guide: ale vs lager. "Just a blonde, please."
Facts: Beer Fundamentals, Popular Beer Styles (Pilsner, IPA, Wheat Beer, Stout), Beer Service (temps).
Experience: owner's question (fresh or more flavour)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "Just a blonde, please.",
    "Most guests don't know if they want a lager or an ale. Ask this.",
    "Something fresh, or something with more flavour?",
    "Fresh? A crisp lager, like a pilsner. Served cold, three to seven degrees.",
    "More flavour? An IPA, but warn them: it's bitter. A wheat beer, with banana and clove. Or even a stout.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 1), (2, 3), (4, 4), (5, 5)]
DEFAULT = [4.5, 7.5, 8.0, 4.6]
POSES = ["point", "idle", "open", None]


def scenes(d, at):
    return [
        hook_scene("“Just a blonde, please.”", "Lager or ale? Ask this.", duration=d[0]),
        chat_scene([
            ("guest", "Just a blonde, please.", None),
            ("bar", "Something fresh, or with more flavour?", ["fresh,", "flavour?"]),
            ("guest", "Fresh!", None),
            ("bar", "Then a crisp pilsner. Served cold, 3–7 °C.", ["pilsner."]),
        ], title="Ask this", fit=d[1]),
        *points_scenes("More flavour?", [
            "IPA: citrus & pine, but bitter!",
            "Wheat beer: banana & clove",
            "Stout: coffee & chocolate",
        ], fit=d[2], at=at(2, ["More flavour?", "A wheat beer, with banana and clove.", "Or even a stout."])),
        engine.guide_cta_scene("Ale vs Lager", duration=d[3]),
    ]


if __name__ == "__main__":
    reelkit.run(5, "blonde_question", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
