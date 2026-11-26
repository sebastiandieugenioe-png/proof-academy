"""Reel 03 — Guide: cocktail recommendation. "What do you drink when you go out?"
Facts: Cocktail Foundations › Cocktail Families. Experience: owner's question."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

GUIDE = "Picking a cocktail for any guest"
SEGMENTS = [
    "What do you recommend?",
    "Stop pushing your favourite cocktail on everyone. Ask this instead.",
    "What do you drink when you go out?",
    "Their answer tells you almost everything.",
    "G and T? Go for a highball. Margarita? A sour. Negroni? Something spirit-forward, short and strong.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 1), (2, 3), (4, 4), (5, 5)]
DEFAULT = [4.0, 6.5, 7.5, 4.6]
POSES = ["point", "idle", "open", None]


def scenes(d, at):
    return [
        hook_scene("“What do you recommend?”", "Don't push your favourite. Ask this.", duration=d[0]),
        chat_scene([
            ("guest", "What do you recommend?", None),
            ("bar", "What do you drink when you go out?", ["go", "out?"]),
            ("guest", "Margaritas, mostly.", None),
            ("bar", "Perfect, you're a sours person.", ["sours"]),
        ], title="Ask this first", fit=d[1]),
        *points_scenes("Match it to a family", [
            "G&T? A highball",
            "Margarita? A sour",
            "Negroni? Spirit-forward",
        ], fit=d[2], at=at(2, ["G and T?", "Margarita?", "Negroni?"])),
        engine.guide_cta_scene("Picking a cocktail", duration=d[3]),
    ]


if __name__ == "__main__":
    reelkit.run(3, "cocktail_question", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
