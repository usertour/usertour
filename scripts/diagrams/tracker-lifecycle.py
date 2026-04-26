#!/usr/bin/env python3
"""Generate the Event Tracker pipeline diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, TEXT_HEAD, TEXT_BODY, TEXT_MUTED, CARD_BORDER,
    svg_open, header, card, number_badge, horiz_arrow, bottom_callout,
    wrap, run_generator,
)

W, H = 1400, 760
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "tracker-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "tracker-lifecycle.png"
T = THEMES["tracker"]


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How an Event Tracker Works",
        "Trackers aren't sessions — they're event listeners the SDK installs and fires when conditions match",
        badge="NO SESSION",
        accent=T["accent"],
    )

    margin = 50
    cw = W - 2*margin

    # ===== Pipeline: 4 steps with arrows between =====
    pipe_y = 120
    pipe_h = 220
    arrow_w = 36
    n = 4
    box_w = (cw - (n-1) * arrow_w) // n

    steps = [
        ("①", "Server distributes definitions",
         "On SDK connect, the server sends every published tracker — the rules, conditions, and event names — down to the client."),
        ("②", "SDK evaluates locally",
         "The SDK watches user behavior and continuously checks each tracker's condition. No server round-trip per check."),
        ("③", "Condition becomes active",
         "When a tracker's condition flips from inactive to active (e.g. the user clicks an element that matches the rule), the SDK fires."),
        ("④", "Event recorded",
         "The SDK reports the configured event back to the server. The server stores a BizEvent record tagged with the tracker's content and version id."),
    ]

    for i, (num, title, desc) in enumerate(steps):
        x = margin + i * (box_w + arrow_w)
        L.append(f'  <rect x="{x}" y="{pipe_y}" width="{box_w}" height="{pipe_h}" rx="14" fill="#ffffff" stroke="{CARD_BORDER}" stroke-width="1" filter="url(#card-shadow)"/>')
        L.append(f'  <path d="M {x+14} {pipe_y} L {x+box_w-14} {pipe_y} Q {x+box_w} {pipe_y} {x+box_w} {pipe_y+14} L {x+box_w} {pipe_y+56} L {x} {pipe_y+56} L {x} {pipe_y+14} Q {x} {pipe_y} {x+14} {pipe_y} Z" fill="{T["accent_bg"]}" stroke="none"/>')
        L.append(f'  <line x1="{x}" y1="{pipe_y+56}" x2="{x+box_w}" y2="{pipe_y+56}" stroke="{T["accent_border"]}" stroke-width="1"/>')
        number_badge(L, x + 18, pipe_y + 11, num, T)
        L.append(f'  <text x="{x + 64}" y="{pipe_y + 22}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">STEP</text>')
        L.append(f'  <text x="{x + 64}" y="{pipe_y + 44}" font-size="14" font-weight="700" fill="{TEXT_HEAD}">{title}</text>')
        ly = pipe_y + 84
        for line in wrap(desc, (box_w - 32) // 6):
            L.append(f'  <text x="{x + 16}" y="{ly}" font-size="12" fill="{TEXT_BODY}">{line}</text>')
            ly += 17
        if i < n - 1:
            ax = x + box_w + 4
            horiz_arrow(L, ax, pipe_y + pipe_h//2, arrow_w - 8, T)

    # ===== Insight: no session model =====
    in_y = pipe_y + pipe_h + 30
    in_h = 170
    card(L, margin, in_y, cw, in_h, T)
    L.append(f'  <text x="{margin + 22}" y="{in_y + 28}" font-size="11.5" font-weight="700" fill="{TEXT_MUTED}" letter-spacing="1">KEY DIFFERENCE</text>')
    L.append(f'  <text x="{margin + 22}" y="{in_y + 50}" font-size="18" font-weight="700" fill="{TEXT_HEAD}">There is no session model for trackers</text>')

    diffs = [
        ("No BizSession",     "The server never creates a session record for a tracker."),
        ("No state machine",  "Each fire is instantaneous — there's no active / ended state to track."),
        ("No lifecycle events", "No started / completed / dismissed events. Only the configured custom event."),
        ("No endSession() API", "Trackers can't be ended — they're just listeners. Unpublishing the tracker stops new fires."),
    ]
    half = (len(diffs) + 1) // 2
    col_w = (cw - 60) // 2
    for i, (label, body) in enumerate(diffs):
        col = i // half
        row = i % half
        rx = margin + 22 + col * (col_w + 16)
        ry = in_y + 84 + row * 38
        L.append(f'  <text x="{rx}" y="{ry}" font-size="12" fill="{T["accent"]}">&#9670;</text>')
        L.append(f'  <text x="{rx + 18}" y="{ry}" font-size="12" font-weight="700" fill="{TEXT_HEAD}">{label}</text>')
        L.append(f'  <text x="{rx + 18}" y="{ry + 16}" font-size="11.5" fill="{TEXT_BODY}">{body}</text>')

    # Bottom callout
    cb_y = in_y + in_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 130,
        "What makes Event Tracker different from other content types",
        [
            "Pure event-tracking. Use it for conversions, custom feature usage, or click tracking — not for showing UI.",
            "All evaluation happens client-side. The server doesn't poll; it just receives the resulting events.",
            "Multiple trackers can be active at the same time per user — no limit, no concurrency model.",
            "Distribution refreshes when trackers change (publish, unpublish, edit) so the SDK always has current rules.",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Event Tracker pipeline diagram")
