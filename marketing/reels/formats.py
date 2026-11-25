"""OSC reel formats. Each builder returns a list of engine.Scene."""
import math
from PIL import Image, ImageDraw
from engine import (W, H, BRAND, Scene, text_block, paste_center, rounded, prog,
                    ease_out_back, ease_out_cubic, font, cta_scene)


# ---------------------------------------------------------------- hook
def hook_scene(line, sub=None, duration=2.6, shake=False):
    big = text_block(line, "black", 112, BRAND["white"], max_w=940)
    small = text_block(sub, "bold", 60, BRAND["gold"], max_w=900) if sub else None

    def draw(img, t):
        s = ease_out_back(prog(t, 0.05, 0.45))
        dx = 10 * math.sin(t * 60) * (1 - prog(t, 0.5, 0.4)) if shake else 0
        cy = H / 2 - (60 if small else 0)
        paste_center(img, big, W / 2 + dx, cy, scale=s)
        if small:
            paste_center(img, small, W / 2, cy + big.height / 2 + 80, scale=ease_out_back(prog(t, 0.8, 0.4)))
    sfx = [(0.0, "whoosh", 0.7), (0.15, "thump", 0.8)]
    if small:
        sfx.append((0.8, "pop", 0.7))
    return Scene(duration, draw, sfx)


# ---------------------------------------------------------------- chat
def chat_scene(messages, title=None, step=1.7, typing=0.7, tail=1.6):
    """messages: list of (side, text, highlight_words). side 'guest' (left) or 'bar' (right).
    Bartender messages show a typing indicator first."""
    max_w = 760
    bubbles = []
    for side, text, hl in messages:
        txt = text_block(text, "bold", 60, BRAND["white"] if side == "bar" else (15, 23, 42),
                         max_w=max_w, align="left", highlight=hl if side == "bar" else None)
        pad_x, pad_y = 44, 30
        bg = (30, 58, 138, 255) if side == "bar" else (241, 245, 249, 255)
        b = rounded((txt.width + 2 * pad_x, txt.height + 2 * pad_y), 44, bg)
        b.alpha_composite(txt, (pad_x, pad_y + 4))
        bubbles.append((side, b))
    label_guest = text_block("Guest", "semi", 32, BRAND["muted"])
    label_bar = text_block("Bartender", "semi", 32, BRAND["gold"])
    head = text_block(title, "black", 64, BRAND["white"], max_w=900) if title else None

    # timeline
    times, cur = [], 0.3
    for side, _ in bubbles:
        if side == "bar":
            cur += typing
        times.append(cur)
        cur += step
    duration = cur - step + tail

    def draw(img, t):
        top = 260
        if head:
            paste_center(img, head, W / 2, 230, alpha=prog(t, 0, 0.3))
            top = 230 + head.height / 2 + 70
        # stack: visible bubbles, bottom-aligned scroll if too tall
        visible = [i for i, s in enumerate(times) if t >= s]
        heights = [bubbles[i][1].height + 90 for i in visible]
        total_h = sum(heights)
        limit = H - 380 - top
        y = top - max(0, total_h - limit)
        for i, hgt in zip(visible, heights):
            side, b = bubbles[i]
            a = ease_out_back(prog(t, times[i], 0.35))
            x = 70 if side == "guest" else W - 70 - b.width
            lab = label_guest if side == "guest" else label_bar
            if y + 10 > top - 40:
                img.alpha_composite(lab, (int(x + (0 if side == "guest" else b.width - lab.width)), int(y)))
            bb = b.resize((max(1, int(b.width * a)), max(1, int(b.height * a)))) if a < 0.999 else b
            ox = x if side == "guest" else x + b.width - bb.width
            if y + 40 > top - 40:
                img.alpha_composite(bb, (int(ox), int(y + 40)))
            y += hgt
        # typing indicator for the next bartender message
        nxt = next((i for i, s in enumerate(times) if t < s), None)
        if nxt is not None and bubbles[nxt][0] == "bar" and t >= times[nxt] - typing:
            dots = rounded((190, 96), 44, (30, 58, 138, 255))
            dd = ImageDraw.Draw(dots)
            for k in range(3):
                ph = math.sin((t * 8) - k * 0.9)
                r = 11 + 4 * max(0, ph)
                cx, cy = 50 + k * 45, 48
                dd.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(226, 194, 122, 255))
            dy = min(y + 40, H - 420)
            img.alpha_composite(dots, (W - 70 - 190, int(dy)))
    sfx = []
    for (side, _), s in zip(bubbles, times):
        if side == "bar":
            sfx.append((max(0, s - typing), "type", 0.5))
        sfx.append((s, "pop", 0.6))
    return Scene(duration, draw, sfx)


# ---------------------------------------------------------------- versus cards
def versus_scene(left, right, footer=None, duration=6.0):
    """left/right: dict(title, lines[list], color)."""
    def card(spec):
        t = text_block(spec["title"], "black", 84, BRAND["white"])
        body = text_block("\n".join(spec["lines"]), "bold", 46, BRAND["white"], max_w=760, line_gap=1.3)
        c = rounded((900, t.height + body.height + 140), 50, spec["color"] + (235,))
        c.alpha_composite(t, ((900 - t.width) // 2, 50))
        c.alpha_composite(body, ((900 - body.width) // 2, 70 + t.height))
        return c
    lc, rc = card(left), card(right)
    foot = text_block(footer, "bold", 50, BRAND["gold"], max_w=900) if footer else None
    gap = 60
    total_h = lc.height + rc.height + gap
    y0 = (H - total_h) / 2 - (60 if foot else 0)

    def draw(img, t):
        a = ease_out_cubic(prog(t, 0.1, 0.5))
        b = ease_out_cubic(prog(t, 1.6, 0.5))
        paste_center(img, lc, W / 2 - (1 - a) * W, y0 + lc.height / 2)
        paste_center(img, rc, W / 2 + (1 - b) * W, y0 + lc.height + gap + rc.height / 2)
        if foot:
            paste_center(img, foot, W / 2, y0 + total_h + 110, scale=ease_out_back(prog(t, 3.4, 0.45)))
    sfx = [(0.1, "whoosh", 0.7), (1.6, "whoosh", 0.7)]
    if foot:
        sfx.append((3.4, "chime", 0.6))
    return Scene(duration, draw, sfx)


# ---------------------------------------------------------------- statement
def statement_scene(kicker, line, duration=2.6, sound="thump"):
    k = text_block(kicker, "bold", 46, BRAND["gold"])
    l = text_block(line, "black", 100, BRAND["white"], max_w=920)

    def draw(img, t):
        paste_center(img, k, W / 2, H / 2 - l.height / 2 - 70, alpha=prog(t, 0, 0.25))
        paste_center(img, l, W / 2, H / 2, scale=ease_out_back(prog(t, 0.15, 0.45)))
    return Scene(duration, draw, [(0.15, sound, 0.8)])


# ---------------------------------------------------------------- quiz
def quiz_scenes(question, options, correct, explanation, count=3):
    q = text_block(question, "black", 84, BRAND["white"], max_w=920)
    opts = []
    for i, o in enumerate(options):
        txt = text_block(f"{'ABC'[i]}   {o}", "bold", 56, BRAND["white"], max_w=780, align="left")
        opts.append(txt)
    expl = text_block(explanation, "bold", 50, BRAND["muted"], max_w=900)
    dur = 1.2 + 0.4 * len(opts) + count + 3.2

    def draw(img, t):
        paste_center(img, q, W / 2, 470, scale=ease_out_back(prog(t, 0, 0.45)))
        reveal = 1.2 + 0.4 * len(opts) + count
        for i, o in enumerate(opts):
            y = 820 + i * 190
            ok = i == correct
            col = (255, 255, 255, 38)
            if t >= reveal:
                col = (34, 197, 94, 230) if ok else (255, 255, 255, 18)
            box = rounded((900, 150), 40, col, outline=(255, 255, 255, 90), width=3)
            box.alpha_composite(o, (50, (150 - o.height) // 2 + 6))
            s = ease_out_back(prog(t, 1.0 + 0.4 * i, 0.35))
            if t >= reveal and ok:
                s *= 1 + 0.06 * math.sin(min(1, (t - reveal) / 0.3) * math.pi)
            paste_center(img, box, W / 2, y, scale=s, alpha=1.0 if (t < reveal or ok) else 0.5)
        start = 1.2 + 0.4 * len(opts)
        if start <= t < reveal:
            n = count - int(t - start)
            c = text_block(str(n), "black", 160, BRAND["gold"])
            paste_center(img, c, W / 2, 1520, scale=ease_out_back((t - start) % 1 / 0.3))
        if t >= reveal:
            paste_center(img, expl, W / 2, 1560, alpha=prog(t, reveal + 0.3, 0.3))
    start = 1.2 + 0.4 * len(opts)
    sfx = [(0, "whoosh", 0.7)] + [(1.0 + 0.4 * i, "pop", 0.5) for i in range(len(opts))]
    sfx += [(start + k, "tick", 0.9) for k in range(count)]
    sfx += [(start + count, "ding", 0.9)]
    return [Scene(dur, draw, sfx)]


# ---------------------------------------------------------------- myth / fact  (adapted "Don't say / Say")
def myth_fact_scenes(myths, fact, note=None):
    """myths: list of strings shown and struck through (buzz + shake); fact: the correct line (ding)."""
    rows = [text_block(m, "bold", 58, BRAND["white"], max_w=880) for m in myths]
    fact_img = text_block(fact, "black", 76, BRAND["white"], max_w=900)
    note_img = text_block(note, "bold", 46, BRAND["muted"], max_w=880) if note else None
    lab_m = text_block("MYTH", "black", 44, BRAND["red"])
    lab_f = text_block("FACT", "black", 44, BRAND["green"])
    per = 1.3
    dur = 0.4 + per * len(rows) + 3.6

    def draw(img, t):
        y = 330
        for i, r in enumerate(rows):
            s0 = 0.3 + per * i
            if t < s0:
                break
            shake = 12 * math.sin((t - s0) * 70) * (1 - prog(t, s0 + 0.5, 0.3)) if t > s0 + 0.5 else 0
            paste_center(img, lab_m, W / 2, y, alpha=prog(t, s0, 0.2))
            paste_center(img, r, W / 2 + shake, y + 30 + r.height / 2, scale=ease_out_back(prog(t, s0, 0.35)),
                         alpha=1.0 if t < s0 + 0.5 else 0.55)
            st = prog(t, s0 + 0.5, 0.3)
            if st > 0:
                d = ImageDraw.Draw(img)
                x0 = W / 2 - r.width / 2 - 10
                cy = y + 30 + r.height / 2
                d.line((x0, cy, x0 + (r.width + 20) * st, cy), fill=BRAND["red"], width=9)
            y += r.height + 110
        fs = 0.4 + per * len(rows)
        if t >= fs:
            cy = max(y + 80, 1250)
            box = rounded((960, fact_img.height + 120), 50, (34, 197, 94, 60), outline=BRAND["green"] + (255,), width=4)
            box.alpha_composite(fact_img, ((960 - fact_img.width) // 2, 70))
            paste_center(img, lab_f, W / 2, cy - box.height / 2 - 40, alpha=prog(t, fs, 0.2))
            paste_center(img, box, W / 2, cy, scale=ease_out_back(prog(t, fs, 0.45)))
            if note_img:
                paste_center(img, note_img, W / 2, cy + box.height / 2 + 90, alpha=prog(t, fs + 0.8, 0.3))
    sfx = []
    for i in range(len(rows)):
        sfx += [(0.3 + per * i, "pop", 0.5), (0.8 + per * i, "buzz", 0.5)]
    sfx.append((0.4 + per * len(rows), "ding", 0.9))
    return [Scene(dur, draw, sfx)]


__all__ = ["hook_scene", "chat_scene", "versus_scene", "statement_scene", "quiz_scenes",
           "myth_fact_scenes", "cta_scene"]
