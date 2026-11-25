"""OSC reel engine — vertical animated reels with synthesized SFX.

Python + Pillow + numpy + ffmpeg. No network needed.
Each scene renders to its own MP4, then scenes are joined with the ffmpeg
concat demuxer (-c copy) and the mixed WAV is muxed in (-c:v copy).
"""
import math, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H, FPS = 1080, 1920, 30
SR = 44100
HERE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------- brand
BRAND = {
    "bg_top": (15, 23, 42),        # slate-900
    "bg_bottom": (30, 58, 138),    # OSC navy #1E3A8A
    "gold": (226, 194, 122),
    "white": (255, 255, 255),
    "muted": (203, 213, 225),
    "dim": (148, 163, 184),
    "red": (248, 113, 113),
    "green": (74, 222, 128),
    "amber": (217, 119, 6),
    "ice": (96, 165, 250),
    "handle": "@onlinespiritsclub",
    "url": "onlinespiritsclub.com",
    "legal": "18+ · Enjoy responsibly",
    "logo": os.path.join(HERE, "assets", "logo.png"),
}
FONT_FILES = {
    "black": "/usr/share/fonts/opentype/inter/InterDisplay-ExtraBold.otf",
    "bold": "/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf",
    "semi": "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf",
}
_font_cache = {}


def font(kind, size):
    key = (kind, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(FONT_FILES[kind], size)
    return _font_cache[key]


# ---------------------------------------------------------------- easing
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def ease_out_cubic(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_out_back(x, s=1.70158):
    x = clamp(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def prog(t, start, dur):
    return clamp((t - start) / dur) if dur > 0 else float(t >= start)


# ---------------------------------------------------------------- text
def wrap(text, fnt, max_w):
    words, lines, cur = text.split(), [], ""
    for w_ in words:
        test = (cur + " " + w_).strip()
        if fnt.getlength(test) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w_
    if cur:
        lines.append(cur)
    return lines


def text_block(text, kind, size, color, max_w=900, align="center", line_gap=1.12, highlight=None):
    """Render wrapped text to a transparent RGBA image.
    highlight: list of words/phrases drawn in gold."""
    fnt = font(kind, size)
    lines = []
    for para in text.split("\n"):
        lines += wrap(para, fnt, max_w) or [""]
    lh = int(size * line_gap)
    w = int(max(fnt.getlength(l) for l in lines)) + 8
    h = lh * len(lines) + int(size * 0.3)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    hl = [x.lower() for x in (highlight or [])]
    for i, line in enumerate(lines):
        lw = fnt.getlength(line)
        x = (w - lw) / 2 if align == "center" else 0
        y = i * lh
        if not hl:
            d.text((x, y), line, font=fnt, fill=color)
            continue
        for word in line.split(" "):
            c = BRAND["gold"] if any(h_ in word.lower() for h_ in hl) else color
            d.text((x, y), word, font=fnt, fill=c)
            x += fnt.getlength(word + " ")
    return img


def paste_center(canvas, img, cx, cy, scale=1.0, alpha=1.0, rot=0):
    if scale <= 0.01 or alpha <= 0.01:
        return
    im = img
    if scale != 1.0:
        im = im.resize((max(1, int(im.width * scale)), max(1, int(im.height * scale))), Image.LANCZOS)
    if rot:
        im = im.rotate(rot, resample=Image.BICUBIC, expand=True)
    if alpha < 1.0:
        a = im.getchannel("A").point(lambda v: int(v * alpha))
        im = im.copy()
        im.putalpha(a)
    canvas.alpha_composite(im, (int(cx - im.width / 2), int(cy - im.height / 2)))


def rounded(size, radius, fill, outline=None, width=0):
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(img).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=fill, outline=outline, width=width)
    return img


# ---------------------------------------------------------------- frame chrome
_bg_cache = {}


def _gradient(top, bottom):
    key = (top, bottom)
    if key not in _bg_cache:
        arr = np.zeros((H, W, 3), np.uint8)
        for i, c in enumerate(zip(top, bottom)):
            arr[:, :, i] = np.linspace(c[0], c[1], H, dtype=np.float32)[:, None].astype(np.uint8)
        _bg_cache[key] = Image.fromarray(arr).convert("RGBA")
    return _bg_cache[key]


def background(gt, top=None, bottom=None):
    """gt = global time (s). Gradient + slow drifting soft shapes."""
    img = _gradient(top or BRAND["bg_top"], bottom or BRAND["bg_bottom"]).copy()
    layer = Image.new("RGBA", (W // 4, H // 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    blobs = [(0.2, 0.25, 90, 0.07, (96, 165, 250, 46)), (0.8, 0.6, 120, 0.05, (226, 194, 122, 34)),
             (0.35, 0.85, 70, 0.09, (255, 255, 255, 20)), (0.75, 0.15, 60, 0.11, (226, 194, 122, 26))]
    for bx, by, r, sp, col in blobs:
        x = (bx + 0.08 * math.sin(gt * sp * 6.28)) * layer.width
        y = (by + 0.05 * math.cos(gt * sp * 5.1)) * layer.height
        d.ellipse((x - r / 2, y - r / 2, x + r / 2, y + r / 2), fill=col)
    layer = layer.filter(ImageFilter.GaussianBlur(14)).resize((W, H), Image.BILINEAR)
    img.alpha_composite(layer)
    return img


def chrome(img, gt, total):
    d = ImageDraw.Draw(img)
    # progress bar
    d.rounded_rectangle((60, 70, W - 60, 80), 5, fill=(255, 255, 255, 50))
    d.rounded_rectangle((60, 70, 60 + (W - 120) * clamp(gt / total), 80), 5, fill=BRAND["gold"])
    # handle
    f = font("semi", 34)
    t = BRAND["handle"]
    d.text(((W - f.getlength(t)) / 2, H - 130), t, font=f, fill=(255, 255, 255, 170))


# ---------------------------------------------------------------- scenes
class Scene:
    """duration in seconds; draw(img, t) draws on top of the background;
    sfx = list of (t, name, gain)."""
    def __init__(self, duration, draw, sfx=None, bg=None):
        self.duration, self.draw, self.sfx, self.bg = duration, draw, sfx or [], bg or {}


def render_frame(scene, t, gt, total):
    img = background(gt, **scene.bg)
    scene.draw(img, t)
    chrome(img, gt, total)
    return img.convert("RGB")


def render(scenes, out_path, preview_dir=None, tmp_dir=None):
    tmp_dir = tmp_dir or os.path.join(os.path.dirname(out_path), "_tmp")
    os.makedirs(tmp_dir, exist_ok=True)
    total = sum(s.duration for s in scenes)
    if preview_dir:
        preview(scenes, preview_dir)
    parts, gt0 = [], 0.0
    for i, sc in enumerate(scenes):
        part = os.path.join(tmp_dir, f"scene_{i:02d}.mp4")
        n = int(round(sc.duration * FPS))
        p = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
                              "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "veryfast",
                              "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS), part], stdin=subprocess.PIPE)
        for f in range(n):
            t = f / FPS
            p.stdin.write(render_frame(sc, t, gt0 + t, total).tobytes())
        p.stdin.close()
        p.wait()
        parts.append(part)
        gt0 += sc.duration
    lst = os.path.join(tmp_dir, "list.txt")
    with open(lst, "w") as fh:
        fh.writelines(f"file '{os.path.abspath(x)}'\n" for x in parts)
    silent = os.path.join(tmp_dir, "video.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", silent], check=True)
    wav = os.path.join(tmp_dir, "sfx.wav")
    mix_sfx(scenes, wav, total)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", silent, "-i", wav, "-c:v", "copy", "-c:a", "aac",
                    "-b:a", "192k", "-shortest", "-movflags", "+faststart", out_path], check=True)
    return out_path


def preview(scenes, out_dir, points=(0.15, 0.5, 0.95)):
    """Stills of every scene for overlap checks, plus a contact sheet."""
    os.makedirs(out_dir, exist_ok=True)
    total = sum(s.duration for s in scenes)
    gt0, thumbs = 0.0, []
    for i, sc in enumerate(scenes):
        for p_ in points:
            t = sc.duration * p_
            im = render_frame(sc, t, gt0 + t, total)
            im.save(os.path.join(out_dir, f"s{i:02d}_{int(p_*100):02d}.png"))
            thumbs.append(im.resize((W // 5, H // 5)))
        gt0 += sc.duration
    cols = len(points)
    rows = math.ceil(len(thumbs) / cols)
    sheet = Image.new("RGB", (cols * W // 5, rows * H // 5), "white")
    for k, th in enumerate(thumbs):
        sheet.paste(th, ((k % cols) * W // 5, (k // cols) * H // 5))
    sheet.save(os.path.join(out_dir, "_sheet.png"))


# ---------------------------------------------------------------- SFX (numpy synth)
def _env(n, attack=0.005, decay=0.2):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-t / max(decay, 1e-4))


def sfx_sound(name):
    rng = np.random.default_rng(7)
    if name == "whoosh":
        n = int(SR * 0.45); noise = rng.standard_normal(n)
        k = np.linspace(0.02, 0.35, n)  # sweeping one-pole lowpass
        y = np.zeros(n); acc = 0.0
        for i in range(n):
            acc += k[i] * (noise[i] - acc); y[i] = acc
        return y * np.sin(np.linspace(0, math.pi, n)) * 0.9
    if name == "pop":
        n = int(SR * 0.12); t = np.arange(n) / SR
        f = 900 * np.exp(-t * 30) + 300
        return np.sin(2 * math.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.04)
    if name == "ding":
        n = int(SR * 1.2); t = np.arange(n) / SR
        y = sum(a * np.sin(2 * math.pi * f * t) for f, a in ((1318.5, 1), (2637, 0.35), (3955, 0.12)))
        return y * _env(n, 0.002, 0.35) * 0.6
    if name == "buzz":
        n = int(SR * 0.4); t = np.arange(n) / SR
        return np.sign(np.sin(2 * math.pi * 110 * t)) * _env(n, 0.005, 0.18) * 0.35
    if name == "tick":
        n = int(SR * 0.03); return rng.standard_normal(n) * _env(n, 0.0005, 0.005) * 0.8
    if name == "type":
        out = np.zeros(int(SR * 0.6))
        for k in range(6):
            s = int(SR * (k * 0.09 + rng.uniform(0, 0.02))); m = int(SR * 0.02)
            out[s:s + m] += rng.standard_normal(m) * _env(m, 0.0005, 0.004) * 0.5
        return out
    if name == "chime":
        n = int(SR * 1.4); t = np.arange(n) / SR
        a = np.sin(2 * math.pi * 1046.5 * t) * _env(n, 0.003, 0.5)
        b = np.zeros(n); off = int(SR * 0.13)
        b[off:] = np.sin(2 * math.pi * 1568 * t[:n - off]) * _env(n - off, 0.003, 0.5)
        return (a + b) * 0.4
    if name == "thump":
        n = int(SR * 0.35); t = np.arange(n) / SR
        f = 110 * np.exp(-t * 12) + 45
        return np.sin(2 * math.pi * np.cumsum(f) / SR) * _env(n, 0.002, 0.12) * 1.1
    raise ValueError(name)


def mix_sfx(scenes, wav_path, total):
    buf = np.zeros(int(SR * (total + 1.5)))
    gt0 = 0.0
    for sc in scenes:
        for t, name, gain in sc.sfx:
            s = sfx_sound(name) * gain
            i = int((gt0 + t) * SR)
            buf[i:i + len(s)] += s[:max(0, len(buf) - i)]
        gt0 += sc.duration
    buf = buf[: int(SR * total)]
    peak = np.max(np.abs(buf)) or 1
    buf = buf / max(peak, 1.0) * 0.85
    with wave.open(wav_path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((buf * 32767).astype(np.int16).tobytes())


# ---------------------------------------------------------------- shared CTA scene
def cta_scene(lesson_title, duration=3.6, kicker="FREE 5-MINUTE LESSON", extra="+ flashcards that make it stick"):
    logo = Image.open(BRAND["logo"]).convert("RGBA").resize((220, 220), Image.LANCZOS)
    plate = rounded((260, 260), 60, (255, 255, 255, 255))
    plate.alpha_composite(logo, (20, 20))
    kicker = text_block(kicker, "bold", 44, BRAND["gold"])
    title = text_block(lesson_title, "black", 96, BRAND["white"], max_w=920)
    link = text_block("Link in bio", "black", 64, BRAND["white"])
    url = text_block(BRAND["url"], "semi", 44, BRAND["muted"])
    legal = text_block(BRAND["legal"], "semi", 34, BRAND["dim"])
    extra_img = text_block(extra, "bold", 50, BRAND["gold"], max_w=920) if extra else None
    pill = rounded((link.width + 120, link.height + 50), 60, BRAND["gold"] + (255,))
    link_dark = text_block("Link in bio", "black", 64, BRAND["bg_top"])

    def draw(img, t):
        paste_center(img, plate, W / 2, 560, scale=ease_out_back(prog(t, 0, 0.5)))
        paste_center(img, kicker, W / 2, 790, alpha=prog(t, 0.3, 0.3))
        paste_center(img, title, W / 2, 790 + 60 + title.height / 2, scale=ease_out_back(prog(t, 0.4, 0.5)))
        y = 790 + 120 + title.height + 70
        if extra_img:
            paste_center(img, extra_img, W / 2, 790 + 80 + title.height + 30, alpha=prog(t, 0.7, 0.3))
            y += 70
        s = ease_out_back(prog(t, 0.9, 0.45)) * (1 + 0.04 * math.sin(max(0, t - 1.4) * 6))
        paste_center(img, pill, W / 2, y, scale=s)
        paste_center(img, link_dark, W / 2, y - 4, scale=s)
        paste_center(img, url, W / 2, y + 120, alpha=prog(t, 1.2, 0.3))
        paste_center(img, legal, W / 2, H - 250, alpha=prog(t, 1.2, 0.3))

    return Scene(duration, draw, sfx=[(0.0, "whoosh", 0.6), (0.45, "pop", 0.7), (0.9, "chime", 0.8)])


# ================================================================ voice sync + subtitles
SUBS = []          # [(start, end, text)] in global seconds; drawn by chrome()
VOICE = None       # path to narration audio (mixed under SFX)


def detect_breaks(audio_path, n_breaks, min_sil=0.25, noise="-35dB"):
    """Return (boundaries, speech_spans): the n_breaks longest silences (sorted by time)
    split the narration into n_breaks+1 segments."""
    r = subprocess.run(["ffmpeg", "-i", audio_path, "-af", f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sil, start = [], None
    for line in r.stderr.splitlines():
        if "silence_start" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end" in line and start is not None:
            end = float(line.split("silence_end:")[1].split("|")[0])
            sil.append((start, end)); start = None
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio_path],
                               capture_output=True, text=True).stdout.strip())
    inner = [s for s in sil if s[0] > 0.05 and s[1] < dur - 0.05]
    pick = sorted(sorted(inner, key=lambda s: s[1] - s[0], reverse=True)[:n_breaks])
    if len(pick) < n_breaks:
        raise RuntimeError(f"found {len(pick)} pauses, expected {n_breaks}")
    lead = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
    spans, cur = [], lead
    for s, e in pick:
        spans.append((cur, s)); cur = e
    spans.append((cur, dur))
    return pick, spans, dur


def build_subs(segments, spans, max_words=5):
    subs = []
    for text, (s, e) in zip(segments, spans):
        words = text.split()
        chunks = [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]
        total = sum(len(c) for c in chunks) or 1
        t = s
        for c in chunks:
            d = (e - s) * len(c) / total
            subs.append((t, t + d, c)); t += d
    return subs


def draw_subs(img, gt):
    cur = next((x for x in SUBS if x[0] <= gt < x[1]), None)
    if not cur:
        return
    txt = text_block(cur[2], "black", 58, BRAND["white"], max_w=900)
    pill = rounded((txt.width + 70, txt.height + 40), 30, (2, 6, 23, 200))
    pill.alpha_composite(txt, (35, 24))
    paste_center(img, pill, W / 2, H - 420)


_chrome_base = chrome


def chrome(img, gt, total):  # noqa: F811  (adds subtitles on top)
    draw_subs(img, gt)
    _chrome_base(img, gt, total)


_mix_base = mix_sfx


def mix_sfx(scenes, wav_path, total):  # noqa: F811  (voice under SFX)
    _mix_base(scenes, wav_path, total)
    if VOICE:
        tmp = wav_path + ".sfx.wav"
        os.replace(wav_path, tmp)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", VOICE, "-i", tmp, "-filter_complex",
                        "[0:a]aresample=44100,volume=1.0[v];[1:a]volume=0.35[s];[v][s]amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[o]",
                        "-map", "[o]", "-ac", "1", "-ar", "44100", "-t", f"{total:.3f}", wav_path], check=True)


def align_breaks(audio_path, segments, min_sil=0.2, noise="-35dB"):
    """Snap each expected segment boundary (estimated from character count) to the nearest real pause.
    Works when the TTS model ignores <break> tags and pauses naturally."""
    r = subprocess.run(["ffmpeg", "-i", audio_path, "-af", f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
                       capture_output=True, text=True)
    sil, start = [], None
    for line in r.stderr.splitlines():
        if "silence_start" in line:
            start = float(line.split("silence_start:")[1].split()[0])
        elif "silence_end" in line and start is not None:
            sil.append((start, float(line.split("silence_end:")[1].split("|")[0]))); start = None
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio_path],
                               capture_output=True, text=True).stdout.strip())
    lead = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
    inner = [s for s in sil if s[0] > 0.05 and s[1] < dur - 0.05]
    lens = [len(s) for s in segments]
    tot = sum(lens)
    breaks, cum, used = [], 0, set()
    for L in lens[:-1]:
        cum += L
        exp = lead + (dur - lead) * cum / tot
        cand = [(abs((s + e) / 2 - exp), i) for i, (s, e) in enumerate(inner)
                if i not in used and (not breaks or s > breaks[-1][1] - 1e-6)]
        _, i = min(cand)
        used.add(i)
        breaks.append(inner[i])
    spans, cur = [], lead
    for s, e in breaks:
        spans.append((cur, s)); cur = e
    spans.append((cur, dur))
    return breaks, spans, dur


import re as _re


def _phrases(seg):
    """Split on sentence-ish punctuation where TTS voices usually pause (. ? ! :), not commas."""
    parts = [p.strip() for p in _re.split(r"(?<=[.?!:])\s+", seg) if p.strip()]
    return parts or [seg]


def align_phrases(audio_path, segments, noise="-35dB"):
    """Exact alignment when the number of pauses matches the number of phrase gaps.
    Returns (breaks, spans, dur, phrase_spans) with phrase_spans = [(start, end, text)]."""
    for min_sil in (0.25, 0.22, 0.2, 0.18, 0.3, 0.35):
        r = subprocess.run(["ffmpeg", "-i", audio_path, "-af", f"silencedetect=noise={noise}:d={min_sil}", "-f", "null", "-"],
                           capture_output=True, text=True)
        sil, start = [], None
        for line in r.stderr.splitlines():
            if "silence_start" in line:
                start = float(line.split("silence_start:")[1].split()[0])
            elif "silence_end" in line and start is not None:
                sil.append((start, float(line.split("silence_end:")[1].split("|")[0]))); start = None
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                                    audio_path], capture_output=True, text=True).stdout.strip())
        lead = sil[0][1] if sil and sil[0][0] <= 0.05 else 0.0
        inner = [s for s in sil if s[0] > 0.05 and s[1] < dur - 0.05]
        phr = [(si, p) for si, seg in enumerate(segments) for p in _phrases(seg)]
        if len(inner) == len(phr) - 1:
            pspans, cur = [], lead
            for (s, e), (si, p) in zip(inner + [(dur, dur)], phr):
                pspans.append((cur, s, p, si)); cur = e
            breaks, spans = [], []
            for si in range(len(segments)):
                mine = [x for x in pspans if x[3] == si]
                spans.append((mine[0][0], mine[-1][1]))
            for si in range(len(segments) - 1):
                a = spans[si][1]; b = spans[si + 1][0]
                breaks.append((a, b))
            return breaks, spans, dur, [(a, b, p) for a, b, p, _ in pspans]
    b, s, d = align_breaks(audio_path, segments)
    return b, s, d, None


def build_subs_from_phrases(pspans, max_words=5):
    subs = []
    for s, e, text in pspans:
        words = text.split()
        chunks = [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]
        total = sum(len(c) for c in chunks) or 1
        t = s
        for c in chunks:
            d = (e - s) * len(c) / total
            subs.append((t, t + d, c)); t += d
    return subs
