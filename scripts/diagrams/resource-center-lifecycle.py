#!/usr/bin/env python3
"""Generate the Resource Center start decision diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, svg_open, header, path_card, auto_pick_card, chain_arrow,
    bottom_callout, run_generator,
)

W, H = 1400, 1180
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "resource-center-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "resource-center-lifecycle.png"
T = THEMES["resource_center"]


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How a Resource Center Starts",
        "Resource Centers are one-and-done per user — once dismissed, it never starts again for the same user",
        badge="MAX 1 EVER",
        accent=T["accent"],
    )

    margin = 50
    cw = W - 2*margin
    cx_center = W // 2

    a_y = 116
    a_h = 212
    path_card(
        L, margin, a_y, cw, a_h,
        "A", "Explicit start",
        "Something asks for a specific Resource Center",
        [
            "usertour.start(resourceCenterId) call",
            "URL with content_id parameter",
            "Button action targets a Resource Center",
        ],
        [
            "Resource Center is published",
            "Audience targeting matches the user",
            "User has no prior session for it",
            "\"Show only once\" rule still passes",
        ],
        "The Resource Center is available — typically a Help icon appears.",
        T,
    )

    arrow_y = a_y + a_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no specific Resource Center ID was provided", T)

    b_y = arrow_y + 50
    b_h = 172
    path_card(
        L, margin, b_y, cw, b_h,
        "B", "Resume the active Resource Center",
        "User already has a Resource Center available",
        [
            "Page reload",
            "New tab opens",
            "Connection re-established",
        ],
        [
            "An active Resource Center session exists",
        ],
        "SDK reuses the existing session — open / close state preserved across reloads.",
        T,
    )

    arrow_y = b_y + b_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no active Resource Center exists for this user", T)

    c_y = arrow_y + 50
    c_h = 320
    auto_pick_card(
        L, margin, c_y, cw, c_h, T,
        sub_cards=[
            ("①", "Start rule matches now",
             "First eligible Resource Center whose start condition — page, event, or attribute — is true at this moment."),
            ("②", "Track conditions for later",
             "Nothing matches yet, but might once the user navigates or an attribute updates. Set up listeners and revisit on those events."),
        ],
        intro="Usertour scans Resource Centers whose audience matches this user AND that the user has never seen before, then tries these two options in order. (Resource Centers don't support \"sticky to recent\" or wait timers — the start-rule editor hides those for one-shot content.)",
        header_label="Auto-pick from eligible Resource Centers",
    )

    cb_y = c_y + c_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 150,
        "What makes Resource Center different from other content types",
        [
            "Max 1 ever per user. Once dismissed, it never re-starts for that user (same guard as Banner).",
            "Open and close the panel many times — those are events on the same session, not new sessions.",
            "Has tabs, blocks, and items inside. Clicks become RESOURCE_CENTER_CLICKED events on the same session.",
            "RESOURCE_CENTER_STARTED fires when the session is created (Help icon ready); RESOURCE_CENTER_OPENED fires each time the user opens the panel.",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Resource Center start decision diagram")
