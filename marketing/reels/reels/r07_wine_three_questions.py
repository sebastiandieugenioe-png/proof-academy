"""Reel 07 — Guide: wine when you're not an expert. Three questions + honesty.
Facts: Wine (body, food). Experience: owner ("I don't know much about wine")."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "A guest wants wine, and you're not a wine person?",
    "Don't fake it. Ask three things.",
    "Bubbles, white or red? Light, or more body? Are you having it with food?",
    "Then be honest: I'm not the wine expert, but if you like it fresh and light, try this one. And offer a taste.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 1), (2, 2), (3, 3), (4, 4)]
DEFAULT = [5.0, 7.0, 8.0, 4.6]
POSES = ["point", "open", "thumbs", None]


def scenes(d, at):
    return [
        hook_scene("Not a wine person?", "Don't fake it. Ask 3 things.", duration=d[0]),
        *points_scenes("Ask 3 things", [
            "Bubbles, white or red?",
            "Light or more body?",
            "With food?",
        ], fit=d[1], at=at(1, ["Bubbles, white or red?", "Light, or more body?", "Are you having it with food?"])),
        statement_scene("THEN SAY THIS", "“I'm not the wine expert, but try this one.” + offer a taste", duration=d[2], sound="chime"),
        engine.guide_cta_scene("Wine for non-experts", duration=d[3]),
    ]


if __name__ == "__main__":
    reelkit.run(7, "wine_three_questions", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
