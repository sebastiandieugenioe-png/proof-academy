"""Reel 01 — Chat: 'Just a blonde, please.'  Source: Beer Fundamentals › Ale vs Lager."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from engine import render
from formats import hook_scene, chat_scene, versus_scene, cta_scene

scenes = [
    hook_scene("“Just a blonde, please.”", "Don't guess. Ask this.", duration=2.6),
    chat_scene([
        ("guest", "Just a blonde, please.", None),
        ("bar", "Sure! Something fresh, or something with more flavour?", ["fresh,", "flavour?"]),
        ("guest", "Wait... what's the difference?", None),
        ("bar", "It's the yeast. And the temperature.", ["yeast.", "temperature."]),
    ], title="Lager or ale?"),
    versus_scene(
        {"title": "LAGER", "lines": ["Bottom-fermenting", "Cold: 7–13 °C", "“Lagern” = to store"], "color": (19, 49, 92)},
        {"title": "ALE", "lines": ["Top-fermenting", "Warmer", "Fruity esters + spicy phenols"], "color": (146, 64, 14)},
        footer="Most beer in the world is lager.", duration=6.2),
    cta_scene("Ale vs Lager"),
]

if __name__ == "__main__":
    out = os.path.join(os.path.dirname(__file__), "..", "out")
    os.makedirs(out, exist_ok=True)
    if "--preview" in sys.argv:
        from engine import preview
        preview(scenes, os.path.join(out, "preview_r01"))
    else:
        render(scenes, os.path.join(out, "osc_r01_ale_vs_lager.mp4"), preview_dir=os.path.join(out, "preview_r01"))
