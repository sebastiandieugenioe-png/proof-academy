"""Reel 06 — Guide: ale vs lager. It's the yeast, not the colour.
Facts: Beer Fundamentals › Ale vs Lager (yeast, temperature 7–13 °C, lagern = to store, most beer is lager)."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import engine
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import reelkit
from formats import hook_scene, chat_scene, points_scenes, statement_scene, versus_scene, did_you_know_scenes

SEGMENTS = [
    "Lager just means light beer, right? Nope.",
    "It's not the colour. It's the yeast, and the temperature.",
    "Lager ferments cold, around seven to thirteen degrees: clean and crisp. Ale ferments warm, and that gives fruity, spicy notes.",
    "Bonus: lager comes from the German lagern, to store. And most beer drunk in the world is lager.",
    engine.GUIDE_VOICE_LINE,
]
GROUPS = [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]
DEFAULT = [3.2, 3.8, 9.0, 7.0, 4.6]
POSES = ["point", "idle", None, "thumbs", None]   # versus cards need the full screen


def scenes(d, at):
    return [
        hook_scene("“Lager = light beer?”", "Nope.", duration=d[0], shake=True),
        statement_scene("THE REAL DIFFERENCE", "The yeast. And the temperature.", duration=d[1]),
        versus_scene(
            {"title": "LAGER", "lines": ["Ferments cold", "7–13 °C", "Clean & crisp"], "color": (19, 49, 92)},
            {"title": "ALE", "lines": ["Ferments warm", "Fruity notes", "Spicy notes"], "color": (146, 64, 14)},
            duration=d[2]),
        *did_you_know_scenes("“Lagern” = to store", "Most beer drunk in the world is lager.", duration=d[3]),
        engine.guide_cta_scene("Ale vs Lager", duration=d[4]),
    ]


if __name__ == "__main__":
    reelkit.run(6, "lager_not_colour", SEGMENTS, GROUPS, DEFAULT, scenes, POSES)
