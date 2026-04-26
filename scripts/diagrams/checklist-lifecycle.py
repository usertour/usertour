#!/usr/bin/env python3
"""Generate the Checklist start decision diagram."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _diagram_lib import (
    THEMES, svg_open, header, path_card, auto_pick_card, chain_arrow,
    bottom_callout, run_generator,
)

W, H = 1400, 1180
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "checklist-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "checklist-lifecycle.png"
T = THEMES["checklist"]


def build_svg():
    L = svg_open(W, H)
    header(
        L, W,
        "How a Checklist Starts",
        "When something asks Usertour to show a checklist, three paths are tried in order — first match wins",
        badge="MAX 1 ACTIVE",
        accent=T["accent"],
    )

    margin = 50
    cw = W - 2*margin
    cx_center = W // 2

    a_y = 116
    a_h = 192
    path_card(
        L, margin, a_y, cw, a_h,
        "A", "Explicit start",
        "Something asks for a specific checklist",
        [
            "usertour.start(checklistId) call",
            "URL with content_id parameter",
            "Button action targets a checklist",
        ],
        [
            "Checklist is published",
            "\"Show only once\" rule still passes",
            "Audience targeting matches the user",
        ],
        "The requested checklist appears, with task progress trackable.",
        T,
    )

    arrow_y = a_y + a_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no specific checklist ID was provided", T)

    b_y = arrow_y + 50
    b_h = 172
    path_card(
        L, margin, b_y, cw, b_h,
        "B", "Resume the active checklist",
        "User already has a checklist running",
        [
            "Page reload",
            "New tab opens",
            "Connection re-established",
        ],
        [
            "An active checklist session exists",
        ],
        "SDK reuses the existing session — task progress preserved, no duplicated events.",
        T,
    )

    arrow_y = b_y + b_h + 4
    chain_arrow(L, cx_center, arrow_y, 36, "if no active checklist exists for this user", T)

    c_y = arrow_y + 50
    c_h = 360
    auto_pick_card(
        L, margin, c_y, cw, c_h, T,
        sub_cards=[
            ("①", "Sticky to recent",
             "If the user was just engaged with a checklist and its rules still match, restart it to preserve their task progress."),
            ("②", "Start rule matches now",
             "First checklist whose start condition — page, event, attribute, or timer — is true at this moment."),
            ("③", "Wait timer pending",
             "A checklist needs e.g. \"5 seconds after page load\". Schedule the timer; re-evaluate when it fires."),
            ("④", "Track conditions for later",
             "No checklist matches yet, but some might once the user interacts. Set up listeners and revisit on those events."),
        ],
        intro="Usertour scans checklists whose audience targeting matches this user, then tries these four options in order. The first one that produces a checklist wins.",
        header_label="Auto-pick from eligible checklists",
    )

    cb_y = c_y + c_h + 30
    bottom_callout(
        L, margin, cb_y, cw, 150,
        "What makes Checklist different from other content types",
        [
            "Multi-task list — task clicks and completions are events on the same session, not new sessions.",
            "Completion is not the end. CHECKLIST_COMPLETED fires when all tasks are done, but the checklist stays visible until dismissed.",
            "Visible vs hidden is just a display state (CHECKLIST_HIDDEN), not a session lifecycle change.",
            "Only one checklist at a time per user. Re-creatable after end (unlike Banner / Resource Center).",
        ],
        T,
    )

    L.append("</svg>")
    return "\n".join(L)


if __name__ == "__main__":
    run_generator(build_svg, SVG_PATH, PNG_PATH, "Generate the Checklist start decision diagram")
