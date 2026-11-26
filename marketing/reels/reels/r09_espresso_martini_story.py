"""Reel 09 — Guide: drink stories. Espresso Martini + first cocktail recipe (1806).
Facts: Liqueurs › Coffee Liqueurs (Dick Bradsell, London, 1980s); Cocktail Foundations › What Is a Cocktail? (1806)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "A story to tell while you shake an Espresso Martini.",
    "It was created by Dick Bradsell, in London, in the nineteen eighties.",
    "And the first printed cocktail recipe, from eighteen oh six? Spirit, sugar, water and bitters. That's it.",
    "Keep it under twenty seconds, and tell it while you make the drink.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]
DEFAULT = [3.6, 5.0, 8.0, 4.5, 4.6]
POSES = ["point", "open", "idle", "thumbs", None]


def scenes(d, at):
    return [
        hook_scene("Tell this while you shake one", "Espresso Martini", duration=d[0]),
        *did_you_know_scenes("Dick Bradsell created it", "London, 1980s.", duration=d[1]),
        *points_scenes("The first cocktail (1806)", [
            "Spirit",
            "Sugar",
            "Water",
            "Bitters",
        ], fit=d[2]),
        statement_scene("BAR MANAGER TIP", "Under 20 seconds. Tell it while you make the drink.", duration=d[3], sound="chime"),
        engine.guide_cta_scene("Drink stories", duration=d[4]),
    ]


if __name__ == "__main__":
    reelkit.run(9, "espresso_martini_story", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
