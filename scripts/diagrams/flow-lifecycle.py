#!/usr/bin/env python3
"""Generate the Flow start decision diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, svg_open, header, path_card, auto_pick_card, chain_arrow,
    bottom_callout, run_generator,
)

W, H = 1400, 1180
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "flow-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "flow-lifecycle.png"
T = THEMES["flow"]


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How a Flow Starts",
        "When something asks Usertour to show a flow, three paths are tried in order — first match wins",
        badge="MAX 1 ACTIVE",
        accent=T["accent"],
    )

    margin = 50
    cw = W - 2*margin
    cx_center = W // 2

    # Path A
    a_y = 116
    a_h = 192
    path_card(
        L, margin, a_y, cw, a_h,
        "A", "Explicit start",
        "Something asks for a specific flow",
        [
            "usertour.start(flowId) call",
            "URL with content_id parameter",
            "Button action targets a flow",
        ],
        [
            "Flow is published",
            "\"Show only once\" rule still passes",
            "Audience targeting matches the user",
        ],
        "The requested flow starts (optionally on a specified step).",
        T,
    )

    arrow_y = a_y + a_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no specific flow ID was provided", T)

    # Path B
    b_y = arrow_y + 50
    b_h = 172
    path_card(
        L, margin, b_y, cw, b_h,
        "B", "Resume the active flow",
        "User already has a flow running",
        [
            "Page reload",
            "New tab opens",
            "Connection re-established",
        ],
        [
            "An active flow session exists",
        ],
        "SDK reuses the existing session — no new session, no duplicated events.",
        T,
    )

    arrow_y = b_y + b_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no active flow exists for this user", T)

    # Path C
    c_y = arrow_y + 50
    c_h = 360
    auto_pick_card(
        L, margin, c_y, cw, c_h, T,
        sub_cards=[
            ("①", "Sticky to recent",
             "If the user was just engaged with a flow and its rules still match, restart that one to avoid dropping them mid-experience."),
            ("②", "Start rule matches now",
             "First flow whose start condition — page, event, attribute, or timer — is true at this moment."),
            ("③", "Wait timer pending",
             "A flow needs e.g. \"5 seconds after page load\" or \"2 minutes idle\". Schedule the timer; re-evaluate when it fires."),
            ("④", "Track conditions for later",
             "No flow matches yet, but some might once the user clicks, scrolls, or answers something. Set up listeners and revisit."),
        ],
        intro="Usertour scans flows whose audience targeting matches this user, then tries these four options in order. The first one that produces a flow wins.",
        header_label="Auto-pick from eligible flows",
    )

    cb_y = c_y + c_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 150,
        "What makes Flow different from other content types",
        [
            "Only one flow shows on screen at a time per user — starting another stops the previous one.",
            "Flows can re-start after ending. Banner and Resource Center can never re-start for the same user.",
            "Many ways to begin: SDK call, audience rule tick, button action, URL match, recovery on reconnect.",
            "When a trigger asks for a specific step, the SDK can jump straight to it instead of starting from the beginning.",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Flow start decision diagram")
