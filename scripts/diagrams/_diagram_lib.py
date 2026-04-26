"""Shared visual primitives for per-content-type lifecycle diagrams.

Each per-type generator imports from here so visual style stays consistent.
Per-type accent colors are looked up from THEMES.
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Neutral palette (shared)
TEXT_HEAD   = "#0f172a"
TEXT_BODY   = "#334155"
TEXT_MUTED  = "#64748b"
CARD_BORDER = "#e2e8f0"

# Per-type accent palettes
THEMES = {
    "flow": {
        "accent": "#2563eb",
        "accent_bg": "#eff6ff",
        "accent_bg_2": "#dbeafe",
        "accent_border": "#bfdbfe",
    },
    "checklist": {
        "accent": "#16a34a",
        "accent_bg": "#f0fdf4",
        "accent_bg_2": "#dcfce7",
        "accent_border": "#bbf7d0",
    },
    "banner": {
        "accent": "#ea580c",
        "accent_bg": "#fff7ed",
        "accent_bg_2": "#fed7aa",
        "accent_border": "#fdba74",
    },
    "resource_center": {
        "accent": "#9333ea",
        "accent_bg": "#faf5ff",
        "accent_bg_2": "#ede9fe",
        "accent_border": "#ddd6fe",
    },
    "launcher": {
        "accent": "#0d9488",
        "accent_bg": "#f0fdfa",
        "accent_bg_2": "#ccfbf1",
        "accent_border": "#99f6e4",
    },
    "tracker": {
        "accent": "#475569",
        "accent_bg": "#f8fafc",
        "accent_bg_2": "#e2e8f0",
        "accent_border": "#cbd5e1",
    },
}


def wrap(text, max_chars):
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        if len(test) > max_chars and line:
            lines.append(line)
            line = w
        else:
            line = test
    if line:
        lines.append(line)
    return lines


def svg_open(W, H):
    L = []
    L.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    L.append("  <style>")
    L.append("    text { font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif; }")
    L.append("  </style>")
    L.append("  <defs>")
    L.append('    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">')
    L.append('      <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.05"/>')
    L.append("    </filter>")
    L.append("  </defs>")
    L.append(f'  <rect width="{W}" height="{H}" fill="#ffffff"/>')
    return L


def header(L, W, title, subtitle, badge=None, accent=None):
    """Title + subtitle, optional pill badge to the right of the title."""
    L.append(f'  <text x="{W//2}" y="56" text-anchor="middle" font-size="26" font-weight="700" fill="{TEXT_HEAD}">{title}</text>')
    if badge and accent:
        bw = len(badge) * 8 + 28
        bx = W//2 + 200
        L.append(f'  <rect x="{bx}" y="36" width="{bw}" height="26" rx="13" fill="{accent}"/>')
        L.append(f'  <text x="{bx + bw//2}" y="54" text-anchor="middle" font-size="11.5" font-weight="700" fill="#ffffff" letter-spacing="0.5">{badge}</text>')
    L.append(f'  <text x="{W//2}" y="86" text-anchor="middle" font-size="14" fill="{TEXT_MUTED}">{subtitle}</text>')


def card(L, x, y, w, h, T, header_h=56):
    L.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#ffffff" stroke="{CARD_BORDER}" stroke-width="1" filter="url(#card-shadow)"/>')
    L.append(f'  <path d="M {x+14} {y} L {x+w-14} {y} Q {x+w} {y} {x+w} {y+14} L {x+w} {y+header_h} L {x} {y+header_h} L {x} {y+14} Q {x} {y} {x+14} {y} Z" fill="{T["accent_bg"]}" stroke="none"/>')
    L.append(f'  <line x1="{x}" y1="{y+header_h}" x2="{x+w}" y2="{y+header_h}" stroke="{T["accent_border"]}" stroke-width="1"/>')


def letter_badge(L, x, y, letter, T, size=34):
    cx, cy = x + size//2, y + size//2
    L.append(f'  <circle cx="{cx}" cy="{cy}" r="{size//2}" fill="{T["accent"]}"/>')
    L.append(f'  <text x="{cx}" y="{cy + 6}" text-anchor="middle" font-size="17" font-weight="700" fill="#ffffff">{letter}</text>')


def number_badge(L, x, y, num, T, size=36):
    cx, cy = x + size//2, y + size//2
    L.append(f'  <circle cx="{cx}" cy="{cy}" r="{size//2}" fill="{T["accent_bg_2"]}" stroke="{T["accent"]}" stroke-width="1.6"/>')
    L.append(f'  <text x="{cx}" y="{cy + 6}" text-anchor="middle" font-size="15" font-weight="700" fill="{T["accent"]}">{num}</text>')


def chain_arrow(L, cx, y_top, length, label, T):
    """Vertical arrow with right-side italic label."""
    L.append(f'  <line x1="{cx}" y1="{y_top}" x2="{cx}" y2="{y_top + length - 4}" stroke="{T["accent"]}" stroke-width="2"/>')
    L.append(f'  <polygon points="{cx-7},{y_top + length - 6} {cx+7},{y_top + length - 6} {cx},{y_top + length + 4}" fill="{T["accent"]}"/>')
    L.append(f'  <text x="{cx + 18}" y="{y_top + length//2 + 4}" font-size="12" font-style="italic" fill="{TEXT_MUTED}">{label}</text>')


def horiz_arrow(L, x_left, cy, length, T):
    L.append(f'  <line x1="{x_left}" y1="{cy}" x2="{x_left + length - 6}" y2="{cy}" stroke="{T["accent"]}" stroke-width="2"/>')
    L.append(f'  <polygon points="{x_left + length - 8},{cy - 6} {x_left + length - 8},{cy + 6} {x_left + length + 2},{cy}" fill="{T["accent"]}"/>')


def path_card(L, x, y, w, h, letter, name, when_title, whens, checks, result, T):
    """Standard A/B/C path card with WHEN | CHECKS | RESULT three-column body."""
    card(L, x, y, w, h, T)
    letter_badge(L, x + 18, y + 11, letter, T)
    L.append(f'  <text x="{x + 64}" y="{y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">PATH {letter}</text>')
    L.append(f'  <text x="{x + 64}" y="{y + 44}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">{name}</text>')

    body_y = y + 76
    col_w = (w - 60) // 3

    # Col 1 — When
    cx1 = x + 22
    L.append(f'  <text x="{cx1}" y="{body_y}" font-size="11" font-weight="700" fill="{T["accent"]}" letter-spacing="0.5">WHEN</text>')
    L.append(f'  <text x="{cx1}" y="{body_y + 18}" font-size="11" fill="{TEXT_MUTED}">{when_title}</text>')
    ly = body_y + 44
    for tr in whens:
        L.append(f'  <text x="{cx1}" y="{ly}" font-size="12.5" fill="{TEXT_BODY}">&#183;  {tr}</text>')
        ly += 20

    # Col 2 — Checks
    cx2 = x + 22 + col_w + 18
    L.append(f'  <text x="{cx2}" y="{body_y}" font-size="11" font-weight="700" fill="{T["accent"]}" letter-spacing="0.5">CHECKS</text>')
    ly = body_y + 26
    for c in checks:
        L.append(f'  <text x="{cx2}" y="{ly}" font-size="12.5" fill="{TEXT_BODY}">&#10003;  {c}</text>')
        ly += 20

    # Col 3 — Result
    cx3 = x + 22 + 2*col_w + 36
    L.append(f'  <text x="{cx3}" y="{body_y}" font-size="11" font-weight="700" fill="{T["accent"]}" letter-spacing="0.5">RESULT</text>')
    ly = body_y + 26
    for line in wrap(result, (col_w - 16) // 7):
        L.append(f'  <text x="{cx3}" y="{ly}" font-size="12.5" fill="{TEXT_BODY}">{line}</text>')
        ly += 18


def bottom_callout(L, x, y, w, h, title, notes, T):
    """Bottom 'What makes X different' callout panel."""
    L.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#ffffff" stroke="{CARD_BORDER}" stroke-width="1" filter="url(#card-shadow)"/>')
    L.append(f'  <path d="M {x+14} {y} L {x+w-14} {y} Q {x+w} {y} {x+w} {y+14} L {x+w} {y+44} L {x} {y+44} L {x} {y+14} Q {x} {y} {x+14} {y} Z" fill="{T["accent_bg"]}" stroke="none"/>')
    L.append(f'  <line x1="{x}" y1="{y+44}" x2="{x+w}" y2="{y+44}" stroke="{T["accent_border"]}" stroke-width="1"/>')
    L.append(f'  <text x="{x + 22}" y="{y + 28}" font-size="14" font-weight="700" fill="{TEXT_HEAD}">{title}</text>')

    half = (len(notes) + 1) // 2
    col_w = (w - 60) // 2
    for i, note in enumerate(notes):
        col = i // half
        row = i % half
        nx = x + 22 + col * (col_w + 16)
        ny = y + 70 + row * 38
        L.append(f'  <text x="{nx}" y="{ny}" font-size="12" fill="{T["accent"]}">&#9670;</text>')
        max_chars = (col_w - 24) // 6
        for j, line in enumerate(wrap(note, max_chars)):
            L.append(f'  <text x="{nx + 18}" y="{ny + j*16}" font-size="12" fill="{TEXT_BODY}">{line}</text>')


def auto_pick_card(L, x, y, w, h, T, sub_cards, intro=None, header_label="Auto-pick from eligible content"):
    """Path C card with horizontal sub-card ladder. sub_cards: [(num, name, desc), ...]"""
    card(L, x, y, w, h, T)
    letter_badge(L, x + 18, y + 11, "C", T)
    L.append(f'  <text x="{x + 64}" y="{y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">PATH C</text>')
    L.append(f'  <text x="{x + 64}" y="{y + 44}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">{header_label}</text>')

    intro_y = y + 86
    intro_lines = []
    if intro:
        # Wrap intro to card width (card_w - 44 padding, ~7 px per char at 13px conservative)
        max_intro_chars = (w - 44) // 7
        intro_lines = wrap(intro, max_intro_chars)
        for i, line in enumerate(intro_lines):
            L.append(f'  <text x="{x + 22}" y="{intro_y + i*18}" font-size="13" fill="{TEXT_BODY}">{line}</text>')

    sub_y = intro_y + (len(intro_lines)*18 + 10 if intro_lines else 0)
    sub_h = h - (sub_y - y) - 22
    sub_pad_x = 22
    sub_arrow_w = 30
    n = len(sub_cards)
    sub_w = (w - 2*sub_pad_x - (n-1)*sub_arrow_w) // n

    for i, (num, name, desc) in enumerate(sub_cards):
        sx = x + sub_pad_x + i * (sub_w + sub_arrow_w)
        L.append(f'  <rect x="{sx}" y="{sub_y}" width="{sub_w}" height="{sub_h}" rx="10" fill="#ffffff" stroke="{CARD_BORDER}" stroke-width="1"/>')
        number_badge(L, sx + 16, sub_y + 18, num, T)
        L.append(f'  <text x="{sx + 64}" y="{sub_y + 41}" font-size="14" font-weight="700" fill="{TEXT_HEAD}">{name}</text>')
        max_chars = (sub_w - 32) // 6
        ly = sub_y + 84
        for line in wrap(desc, max_chars):
            L.append(f'  <text x="{sx + 16}" y="{ly}" font-size="12" fill="{TEXT_BODY}">{line}</text>')
            ly += 17
        if i < n - 1:
            arrow_x = sx + sub_w + 4
            horiz_arrow(L, arrow_x, sub_y + sub_h//2, sub_arrow_w - 8, T)


def run_generator(build_svg_fn, svg_path, png_path, description):
    """Standard CLI runner: build, validate, export PNG, optional copy-to."""
    parser = argparse.ArgumentParser(description=description)
    parser.add_argument("--copy-to", metavar="DIR", help="Also copy SVG and PNG into this directory")
    args = parser.parse_args()

    svg_path.write_text(build_svg_fn())
    print(f"wrote {svg_path}")

    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        v = subprocess.run(["rsvg-convert", str(svg_path), "-o", tmp.name], capture_output=True, text=True)
    if v.returncode != 0:
        print(f"SVG validation failed:\n{v.stderr}", file=sys.stderr)
        sys.exit(1)
    print("svg validated")

    e = subprocess.run(["rsvg-convert", "-w", "1920", str(svg_path), "-o", str(png_path)], capture_output=True, text=True)
    if e.returncode != 0:
        print(f"PNG export failed:\n{e.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"wrote {png_path}")

    if args.copy_to:
        dest = Path(args.copy_to).expanduser().resolve()
        if not dest.is_dir():
            print(f"--copy-to target is not a directory: {dest}", file=sys.stderr)
            sys.exit(1)
        for src in (svg_path, png_path):
            target = dest / src.name
            shutil.copyfile(src, target)
            print(f"copied -> {target}")
