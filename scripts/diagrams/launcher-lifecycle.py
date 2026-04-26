#!/usr/bin/env python3
"""Generate the Launcher start decision diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, TEXT_HEAD, TEXT_BODY, TEXT_MUTED, CARD_BORDER,
    svg_open, header, card, letter_badge, number_badge,
    bottom_callout, wrap, run_generator,
)

W, H = 1400, 1010
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "launcher-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "launcher-lifecycle.png"
T = THEMES["launcher"]


def outcome_card(L, x, y, w, h, num, title, when_label, when_text, what_lines):
    L.append(f'  <rect x="{x}" y="{y}" width="{w}" height="{h}" rx="14" fill="#ffffff" stroke="{CARD_BORDER}" stroke-width="1" filter="url(#card-shadow)"/>')
    L.append(f'  <path d="M {x+14} {y} L {x+w-14} {y} Q {x+w} {y} {x+w} {y+14} L {x+w} {y+56} L {x} {y+56} L {x} {y+14} Q {x} {y} {x+14} {y} Z" fill="{T["accent_bg"]}" stroke="none"/>')
    L.append(f'  <line x1="{x}" y1="{y+56}" x2="{x+w}" y2="{y+56}" stroke="{T["accent_border"]}" stroke-width="1"/>')
    number_badge(L, x + 18, y + 11, num, T)
    L.append(f'  <text x="{x + 64}" y="{y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">OUTCOME</text>')
    L.append(f'  <text x="{x + 64}" y="{y + 44}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">{title}</text>')

    body_y = y + 80
    L.append(f'  <text x="{x + 22}" y="{body_y}" font-size="11" font-weight="700" fill="{T["accent"]}" letter-spacing="0.5">{when_label}</text>')
    ly = body_y + 22
    for line in wrap(when_text, (w - 44) // 7):
        L.append(f'  <text x="{x + 22}" y="{ly}" font-size="12.5" fill="{TEXT_BODY}">{line}</text>')
        ly += 18
    ly += 12
    L.append(f'  <text x="{x + 22}" y="{ly}" font-size="11" font-weight="700" fill="{T["accent"]}" letter-spacing="0.5">WHAT HAPPENS</text>')
    ly += 22
    for line in what_lines:
        L.append(f'  <text x="{x + 22}" y="{ly}" font-size="12.5" fill="{TEXT_BODY}">&#8226;  {line}</text>')
        ly += 20


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How Launchers Start",
        "Many launchers can show at once for the same user — each one evaluated independently",
        badge="MANY CONCURRENT",
        accent=T["accent"],
    )

    margin = 50
    cw = W - 2*margin
    cx_center = W // 2

    # Intro: Step 1
    intro_y = 116
    intro_h = 130
    card(L, margin, intro_y, cw, intro_h, T)
    letter_badge(L, margin + 18, intro_y + 11, "1", T)
    L.append(f'  <text x="{margin + 64}" y="{intro_y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">STEP 1</text>')
    L.append(f'  <text x="{margin + 64}" y="{intro_y + 44}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">Find every launcher eligible for this user</text>')
    intro_text = "Look at every published launcher whose audience targeting matches the user. Unlike flows / checklists / banners / Resource Centers, there's no first-match-wins — every match is evaluated independently and can become active in parallel."
    intro_max_chars = (cw - 44) // 7
    for i, line in enumerate(wrap(intro_text, intro_max_chars)):
        L.append(f'  <text x="{margin + 22}" y="{intro_y + 78 + i*18}" font-size="13" fill="{TEXT_BODY}">{line}</text>')

    # Split: from intro bottom-center diagonally to two outcome cards
    out_y = intro_y + intro_h + 60
    out_h = 240
    out_gap = 30
    out_w = (cw - out_gap) // 2
    a_cx = margin + out_w // 2
    b_cx = margin + out_w + out_gap + out_w // 2

    # Diagonal arrows
    src_y = intro_y + intro_h + 2
    L.append(f'  <line x1="{cx_center}" y1="{src_y}" x2="{a_cx}" y2="{out_y - 6}" stroke="{T["accent"]}" stroke-width="2"/>')
    L.append(f'  <polygon points="{a_cx-7},{out_y - 8} {a_cx+7},{out_y - 8} {a_cx},{out_y + 2}" fill="{T["accent"]}"/>')
    L.append(f'  <line x1="{cx_center}" y1="{src_y}" x2="{b_cx}" y2="{out_y - 6}" stroke="{T["accent"]}" stroke-width="2"/>')
    L.append(f'  <polygon points="{b_cx-7},{out_y - 8} {b_cx+7},{out_y - 8} {b_cx},{out_y + 2}" fill="{T["accent"]}"/>')
    # Labels above the diagonal arrows
    L.append(f'  <text x="{(cx_center + a_cx)//2}" y="{out_y - 22}" text-anchor="middle" font-size="12" font-style="italic" fill="{TEXT_MUTED}">start condition true</text>')
    L.append(f'  <text x="{(cx_center + b_cx)//2}" y="{out_y - 22}" text-anchor="middle" font-size="12" font-style="italic" fill="{TEXT_MUTED}">start condition not yet true</text>')

    # Outcome A: Activate now
    outcome_card(
        L, margin, out_y, out_w, out_h,
        "①", "Activate now",
        "WHEN", "The launcher's start condition is true at this moment.",
        [
            "Create (or reuse) a session for this launcher",
            "LAUNCHER_SEEN event fires",
            "Launcher renders — hotspot, icon, beacon, or button",
            "User can click it to trigger LAUNCHER_ACTIVATED",
        ],
    )

    # Outcome B: Track for later
    outcome_card(
        L, margin + out_w + out_gap, out_y, out_w, out_h,
        "②", "Track for later",
        "WHEN", "Audience matches, but start condition is not yet true.",
        [
            "No session is created yet",
            "SDK sets up listeners for the start condition",
            "When the condition flips to true &#8594; jump to Outcome ①",
            "Listeners are kept across page navigations",
        ],
    )

    # How a launcher ends
    end_y = out_y + out_h + 30
    end_h = 170
    card(L, margin, end_y, cw, end_h, T)
    letter_badge(L, margin + 18, end_y + 11, "2", T)
    L.append(f'  <text x="{margin + 64}" y="{end_y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">STEP 2</text>')
    L.append(f'  <text x="{margin + 64}" y="{end_y + 44}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">How an active launcher ends</text>')

    end_reasons = [
        ("User dismisses",       "LAUNCHER_DISMISSED with USER_CLOSED reason"),
        ("User clicks (activates)", "LAUNCHER_ACTIVATED event &#8212; but session stays open until later dismissed"),
        ("Tooltip auto-dismisses", "LAUNCHER_DISMISSED with LAUNCHER_DEACTIVATED reason &#8212; only if \"dismiss after first activation\" is enabled"),
        ("Admin ends via dashboard", "LAUNCHER_DISMISSED with ADMIN_ENDED reason"),
    ]
    half = (len(end_reasons) + 1) // 2
    col_w = (cw - 60) // 2
    for i, (cause, effect) in enumerate(end_reasons):
        col = i // half
        row = i % half
        rx = margin + 22 + col * (col_w + 16)
        ry = end_y + 80 + row * 38
        L.append(f'  <text x="{rx}" y="{ry}" font-size="12" fill="{T["accent"]}">&#9670;</text>')
        L.append(f'  <text x="{rx + 18}" y="{ry}" font-size="12" font-weight="700" fill="{TEXT_HEAD}">{cause}</text>')
        L.append(f'  <text x="{rx + 18}" y="{ry + 16}" font-size="11.5" fill="{TEXT_BODY}">{effect}</text>')

    # Bottom callout
    cb_y = end_y + end_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 130,
        "What makes Launcher different from other content types",
        [
            "Many launchers active simultaneously — each evaluated and managed independently.",
            "Identified by content ID for SDK re-render. Adding the same launcher again updates in place.",
            "LAUNCHER_ACTIVATED is a milestone (user clicked it), not a session terminator.",
            "Optional setting \"dismiss after first activation\" auto-closes the launcher when its tooltip is closed.",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Launcher start decision diagram")
