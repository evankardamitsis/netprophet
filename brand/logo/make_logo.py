"""Build NetProphet logo C ("the net") as SVG files with the wordmark outlined.

usage: python3 make_logo.py <fonts_dir> <out_dir>
"""
import os
import sys

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

FONTS, OUT = sys.argv[1], sys.argv[2]
INK, PAPER, LIME = "#0F2019", "#F3F5EE", "#D9F03F"


def text_path(text, ttf, size, x, baseline, tracking_em=-0.02):
    """Outline `text` at `size` px with its left edge at x and baseline at y; returns (d, end_x)."""
    font = TTFont(ttf)
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    scale = size / upm
    hmtx = font["hmtx"]
    parts = []
    for ch in text:
        name = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        parts.append(pen.getCommands())
        x += hmtx[name][0] * scale + tracking_em * size
    return " ".join(parts), x


def symbol(fg, ball, opacity=(1, 0.55, 0.25), ox=0, oy=0, s=1.0):
    """The net (three bars fading down) and the ball, in a 100x100 box."""
    def r(x, y, w, h, rx):
        return f'x="{ox + x * s:.2f}" y="{oy + y * s:.2f}" width="{w * s:.2f}" height="{h * s:.2f}" rx="{rx * s:.2f}"'
    return (
        f'<rect {r(8, 56, 84, 7, 3.5)} fill="{fg}" opacity="{opacity[0]}"/>'
        f'<rect {r(8, 70, 84, 7, 3.5)} fill="{fg}" opacity="{opacity[1]}"/>'
        f'<rect {r(8, 84, 84, 7, 3.5)} fill="{fg}" opacity="{opacity[2]}"/>'
        f'<circle cx="{ox + 66 * s:.2f}" cy="{oy + 26 * s:.2f}" r="{15 * s:.2f}" fill="{ball}"/>'
    )


def svg(w, h, body, bg=None, title="NetProphet"):
    back = f'<rect width="{w}" height="{h}" fill="{bg}"/>' if bg else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">'
        f"<title>{title}</title>{back}{body}</svg>\n"
    )


def write(name, content):
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(content)


medium = os.path.join(FONTS, "500Medium", "Commissioner_500Medium.ttf")
bold = os.path.join(FONTS, "700Bold", "Commissioner_700Bold.ttf")
os.makedirs(OUT, exist_ok=True)


def wordmark(color, x, baseline, size):
    d1, x = text_path("net", medium, size, x, baseline)
    d2, x = text_path("prophet", bold, size, x, baseline)
    return f'<path d="{d1}" fill="{color}"/><path d="{d2}" fill="{color}"/>', x


# lockups: symbol 100px tall, wordmark 50px, 22px gap (as on the canvas)
for name, fg, ball, bg in [
    ("lockup-on-ink.svg", PAPER, LIME, INK),
    ("lockup-on-paper.svg", INK, INK, PAPER),
    ("lockup-on-ink-transparent.svg", PAPER, LIME, None),
    ("lockup-on-paper-transparent.svg", INK, INK, None),
]:
    pad = 24
    words, end = wordmark(fg, pad + 100 + 22, pad + 50 + 18, 50)
    body = symbol(fg, ball, ox=pad, oy=pad) + words
    write(name, svg(round(end + pad), 100 + 2 * pad, body, bg, "NetProphet logo"))

# wordmark alone
for name, color in [("wordmark-paper.svg", PAPER), ("wordmark-ink.svg", INK)]:
    words, end = wordmark(color, 0, 50, 50)
    write(name, svg(round(end) + 2, 64, words, None, "NetProphet"))

# symbol alone
write("symbol-on-ink.svg", svg(100, 100, symbol(PAPER, LIME), None, "NetProphet symbol"))
write("symbol-ink.svg", svg(100, 100, symbol(INK, INK), None, "NetProphet symbol"))
write("symbol-paper.svg", svg(100, 100, symbol(PAPER, PAPER), None, "NetProphet symbol"))

# app icon: full-bleed square (iOS and Android round it themselves); symbol at about 62%
write("app-icon-1024.svg", svg(1024, 1024, symbol(PAPER, LIME, ox=194, oy=194, s=6.36), INK, "NetProphet app icon"))
# Android adaptive foreground: symbol inside the 66% safe zone, transparent
write("app-icon-foreground-1024.svg", svg(1024, 1024, symbol(PAPER, LIME, ox=262, oy=262, s=5.0), None, "NetProphet icon foreground"))

# favicon: two shapes only, they survive 16px
fav = (
    f'<rect width="32" height="32" rx="8" fill="{INK}"/>'
    f'<rect x="2" y="18.5" width="28" height="4.5" rx="2.25" fill="{PAPER}"/>'
    f'<circle cx="19.5" cy="9.5" r="6.2" fill="{LIME}"/>'
)
write("favicon.svg", svg(32, 32, fav, None, "NetProphet"))
print("ok", sorted(os.listdir(OUT)))
