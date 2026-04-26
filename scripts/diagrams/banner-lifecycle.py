#!/usr/bin/env python3
"""Generate the Banner start decision diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, svg_open, header, path_card, auto_pick_card, chain_arrow,
    bottom_callout, run_generator,
)

W, H = 1400, 1180
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "banner-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "banner-lifecycle.png"
T = THEMES["banner"]


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How a Banner Starts",
        "Banners are one-and-done per user — once a banner ends, it never starts again for the same user",
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
        "Something asks for a specific banner",
        [
            "usertour.start(bannerId) call",
            "URL with content_id parameter",
            "Button action targets a banner",
        ],
        [
            "Banner is published",
            "Audience targeting matches the user",
            "User has no prior session for this banner",
            "\"Show only once\" rule still passes",
        ],
        "The banner appears at the top or bottom of the page.",
        T,
    )

    arrow_y = a_y + a_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no specific banner ID was provided", T)

    b_y = arrow_y + 50
    b_h = 192
    path_card(
        L, margin, b_y, cw, b_h,
        "B", "Resume the active banner",
        "User already has a banner showing",
        [
            "Page reload",
            "New tab opens",
            "Connection re-established",
        ],
        [
            "An active banner session exists",
            "Banner display rules still active (else canceled)",
        ],
        "SDK reuses the existing session. If show rules went stale, the banner is dismissed.",
        T,
    )

    arrow_y = b_y + b_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no active banner exists for this user", T)

    c_y = arrow_y + 50
    c_h = 320
    auto_pick_card(
        L, margin, c_y, cw, c_h, T,
        sub_cards=[
            ("①", "Start rule matches now",
             "First eligible banner whose start condition — page, event, or attribute — is true at this moment."),
            ("②", "Track conditions for later",
             "No banner matches yet, but some might once the user navigates or an attribute updates. Set up listeners and revisit on those events."),
        ],
        intro="Usertour scans banners whose audience matches this user AND that the user has never seen before, then tries these two options in order. (Banners don't support \"sticky to recent\" or wait timers — the start-rule editor hides those for one-shot content.)",
        header_label="Auto-pick from eligible banners",
    )

    cb_y = c_y + c_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 150,
        "What makes Banner different from other content types",
        [
            "Max 1 ever per user. Once a banner is dismissed (by anyone — user or admin), it never re-starts for that user.",
            "Single active session at a time. A new banner can't show while another banner is active.",
            "Dismissal IS completion — there is no separate \"completed\" event. BANNER_DISMISSED ends the lifecycle.",
            "When start rules go stale (e.g. user navigates away from the matching page), the banner is auto-canceled.",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Banner start decision diagram")
