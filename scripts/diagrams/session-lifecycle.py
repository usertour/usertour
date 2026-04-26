#!/usr/bin/env python3
"""
Generate the Session Lifecycle diagram.

Produces session-lifecycle.svg + session-lifecycle.png next to this script.
Pass --copy-to <dir> to also drop the SVG and PNG into a docs assets directory.

Re-run whenever ContentType, BizEvents, contentStartReason, or contentEndReason
in packages/types changes, then commit the regenerated artifacts.
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

W, H = 1400, 1100
SCRIPT_DIR = Path(__file__).resolve().parent
SVG_PATH = SCRIPT_DIR / "session-lifecycle.svg"
PNG_PATH = SCRIPT_DIR / "session-lifecycle.png"

START_TRIGGERS = [
    "START_FROM_CONDITION",
    "START_FROM_MANUAL",
    "START_FROM_URL",
    "START_FROM_ACTION",
    "START_FROM_PROGRAM",
    "START_FROM_CONTENT_ID",
    "START_FROM_SESSION (recovery)",
]

# End reasons that the server actually writes (not the full enum — some enum
# values are kept for backward compatibility but never emitted).
END_REASONS = [
    "USER_CLOSED", "CLOSE_BUTTON_DISMISS", "BACKDROP_DISMISS", "DISMISS_BUTTON",
    "ACTION_DISMISS", "TRIGGER_DISMISS", "AUTO_DISMISSED", "TOOLTIP_TARGET_MISSING",
    "ADMIN_ENDED", "END_FROM_PROGRAM", "UNPUBLISHED_CONTENT", "LAUNCHER_DEACTIVATED",
    "STORE_NOT_FOUND",
]

CARDS = [
    {
        "name": "FLOW",
        "tint_bg": "#eff6ff", "tint_border": "#bfdbfe", "accent": "#2563eb",
        "badge": "max 1 active",
        "rows": [
            ("Start",       "Rules &#183; Manual &#183; Action &#183; Program &#183; URL"),
            ("Active",      "FLOW_STARTED &#8594; FLOW_STEP_SEEN&#215;N"),
            ("Complete",    "FLOW_COMPLETED (last step reached)"),
            ("End",         "FLOW_ENDED + state = 1"),
            ("endSession",  "&#10003; supported"),
            ("Concurrency", "1 active session per user (re-creatable after end)"),
        ],
    },
    {
        "name": "CHECKLIST",
        "tint_bg": "#f0fdf4", "tint_border": "#bbf7d0", "accent": "#16a34a",
        "badge": "max 1 active",
        "rows": [
            ("Start",       "Rules &#183; Manual &#183; Action"),
            ("Active",      ["CHECKLIST_STARTED  &#8594;", "CHECKLIST_TASK_COMPLETED&#215;N"]),
            ("Complete",    "CHECKLIST_COMPLETED (all tasks done)"),
            ("End",         "CHECKLIST_DISMISSED + state = 1"),
            ("endSession",  "&#10003; supported"),
            ("Concurrency", "1 active session per user (re-creatable after end)"),
        ],
    },
    {
        "name": "BANNER",
        "tint_bg": "#fff7ed", "tint_border": "#fed7aa", "accent": "#ea580c",
        "badge": "max 1 ever",
        "rows": [
            ("Start",       "Rules (page-load condition)"),
            ("Active",      "BANNER_SEEN"),
            ("Complete",    "&#8212;"),
            ("End",         "BANNER_DISMISSED + state = 1"),
            ("endSession",  "&#10003; supported"),
            ("Concurrency", "1 session ever per user (never re-shown after end)"),
        ],
    },
    {
        "name": "RESOURCE_CENTER",
        "tint_bg": "#faf5ff", "tint_border": "#ddd6fe", "accent": "#9333ea",
        "badge": "max 1 ever",
        "rows": [
            ("Start",       "Manual (Help button) &#183; Rules"),
            ("Active",      ["RESOURCE_CENTER_OPENED  &#8594;", "RESOURCE_CENTER_CLICKED&#215;N"]),
            ("Complete",    "&#8212;"),
            ("End",         "RESOURCE_CENTER_DISMISSED + state = 1"),
            ("endSession",  "&#10003; supported"),
            ("Concurrency", "1 session ever per user (same as Banner)"),
        ],
    },
    {
        "name": "LAUNCHER",
        "tint_bg": "#f0fdfa", "tint_border": "#99f6e4", "accent": "#0d9488",
        "badge": "many concurrent",
        "rows": [
            ("Start",       "Rules (page targeting) &#8212; batch"),
            ("Active",      "LAUNCHER_SEEN &#8594; LAUNCHER_ACTIVATED"),
            ("Complete",    "&#8212;"),
            ("End",         "LAUNCHER_DISMISSED + state = 1"),
            ("endSession",  "&#10003; supported"),
            ("Concurrency", "multiple concurrent sessions per user"),
        ],
    },
    {
        "name": "TRACKER",
        "tint_bg": "#f8fafc", "tint_border": "#e2e8f0", "accent": "#475569",
        "badge": "no session",
        "rows": [
            ("Start",       "TRACK_TRACKER_EVENT message from SDK"),
            ("Active",      "&#8212; (no state machine)"),
            ("Complete",    "&#8212;"),
            ("End",         "&#8212; (no session created)"),
            ("endSession",  "&#10007; not applicable"),
            ("Concurrency", "no session created &#8212; event log only"),
        ],
    },
]


def row_height(value):
    return 38 if isinstance(value, list) else 22


def build_svg():
    lines = []
    lines.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
    lines.append("  <style>")
    lines.append("    text { font-family: 'Helvetica Neue', Helvetica, Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif; }")
    lines.append("  </style>")
    lines.append("  <defs>")
    for cid, color in [("blue", "#2563eb"), ("gray", "#94a3b8")]:
        lines.append(f'    <marker id="arrow-{cid}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">')
        lines.append(f'      <polygon points="0 0, 10 3.5, 0 7" fill="{color}"/>')
        lines.append("    </marker>")
    lines.append('    <filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">')
    lines.append('      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f172a" flood-opacity="0.06"/>')
    lines.append("    </filter>")
    lines.append("  </defs>")
    lines.append(f'  <rect width="{W}" height="{H}" fill="#ffffff"/>')

    lines.append(f'  <text x="{W//2}" y="42" text-anchor="middle" font-size="22" font-weight="600" fill="#1e293b">Session Lifecycle</text>')
    lines.append(f'  <text x="{W//2}" y="68" text-anchor="middle" font-size="13" fill="#64748b">session.state: 0 = active, 1 = ended</text>')

    lines.append('  <text x="50" y="108" font-size="15" font-weight="600" fill="#1e293b">1. Generic Lifecycle &#8212; applies to all session-creating types</text>')

    tx, ty, tw, th = 60, 140, 280, 240
    lines.append(f'  <rect x="{tx}" y="{ty}" width="{tw}" height="{th}" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" filter="url(#card-shadow)"/>')
    lines.append(f'  <text x="{tx + tw//2}" y="{ty + 26}" text-anchor="middle" font-size="14" font-weight="600" fill="#1e293b">Start Triggers</text>')
    lines.append(f'  <text x="{tx + tw//2}" y="{ty + 44}" text-anchor="middle" font-size="11" fill="#64748b">contentStartReason</text>')
    for i, t in enumerate(START_TRIGGERS):
        lines.append(f'  <text x="{tx + 24}" y="{ty + 76 + i*22}" font-size="12" fill="#334155">&#8226; {t}</text>')

    ax, ay, aw, ah = 420, 200, 240, 120
    lines.append(f'  <rect x="{ax}" y="{ay}" width="{aw}" height="{ah}" rx="10" fill="#eff6ff" stroke="#bfdbfe" stroke-width="1.5" filter="url(#card-shadow)"/>')
    lines.append(f'  <text x="{ax + aw//2}" y="{ay + 32}" text-anchor="middle" font-size="16" font-weight="600" fill="#1e3a8a">ACTIVE</text>')
    lines.append(f'  <text x="{ax + aw//2}" y="{ay + 56}" text-anchor="middle" font-size="13" font-weight="600" fill="#2563eb">state = 0</text>')
    lines.append(f'  <text x="{ax + aw//2}" y="{ay + 82}" text-anchor="middle" font-size="11" fill="#475569">Emits SEEN / progress events</text>')
    lines.append(f'  <text x="{ax + aw//2}" y="{ay + 100}" text-anchor="middle" font-size="11" fill="#475569">while session is open</text>')

    ex, ey, ew, eh = 900, 200, 240, 120
    lines.append(f'  <rect x="{ex}" y="{ey}" width="{ew}" height="{eh}" rx="10" fill="#f0fdf4" stroke="#bbf7d0" stroke-width="1.5" filter="url(#card-shadow)"/>')
    lines.append(f'  <text x="{ex + ew//2}" y="{ey + 32}" text-anchor="middle" font-size="16" font-weight="600" fill="#14532d">ENDED</text>')
    lines.append(f'  <text x="{ex + ew//2}" y="{ey + 56}" text-anchor="middle" font-size="13" font-weight="600" fill="#16a34a">state = 1</text>')
    lines.append(f'  <text x="{ex + ew//2}" y="{ey + 82}" text-anchor="middle" font-size="11" fill="#475569">Termination event written</text>')
    lines.append(f'  <text x="{ex + ew//2}" y="{ey + 100}" text-anchor="middle" font-size="11" fill="#475569">with end-reason attribute</text>')

    lines.append('  <line x1="340" y1="260" x2="412" y2="260" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)"/>')
    lines.append('  <line x1="660" y1="260" x2="892" y2="260" stroke="#2563eb" stroke-width="2" marker-end="url(#arrow-blue)"/>')
    lines.append('  <rect x="688" y="246" width="184" height="22" rx="4" fill="#ffffff" opacity="0.95"/>')
    lines.append('  <text x="780" y="262" text-anchor="middle" font-size="11" fill="#334155">endContent() &#183; endSession() API</text>')

    rx, ry, rw, rh = 420, 380, 720, 130
    lines.append(f'  <rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" rx="10" fill="#fffbeb" stroke="#fde68a" stroke-width="1" filter="url(#card-shadow)"/>')
    lines.append(f'  <text x="{rx + 16}" y="{ry + 24}" font-size="13" font-weight="600" fill="#92400e">End Reasons (contentEndReason &#8212; any of these triggers state 0 &#8594; 1)</text>')
    col_w = rw // 4
    for i, reason in enumerate(END_REASONS):
        col = i % 4
        row = i // 4
        cx = rx + col * col_w + 16
        cy = ry + 50 + row * 18
        lines.append(f'  <text x="{cx}" y="{cy}" font-size="11" fill="#334155">&#8226; {reason}</text>')

    lines.append('  <path d="M 780 380 L 780 270" stroke="#94a3b8" stroke-width="1.3" stroke-dasharray="4,3" fill="none" marker-end="url(#arrow-gray)"/>')

    lines.append('  <text x="50" y="548" font-size="15" font-weight="600" fill="#1e293b">2. ContentType-Specific Lifecycle</text>')
    lines.append('  <text x="50" y="568" font-size="12" fill="#64748b">Source enum: ContentDataType (packages/types/src/types/contents.ts)</text>')

    card_w = 420
    gap_x, gap_y = 25, 25
    start_x, start_y = 55, 588
    max_card_h = max(
        44 + 16 + sum(row_height(v) for _, v in c["rows"]) + 16
        for c in CARDS
    )

    for idx, c in enumerate(CARDS):
        col = idx % 3
        row_i = idx // 3
        cxp = start_x + col * (card_w + gap_x)
        cyp = start_y + row_i * (max_card_h + gap_y)
        lines.append(f'  <rect x="{cxp}" y="{cyp}" width="{card_w}" height="{max_card_h}" rx="10" fill="#ffffff" stroke="#e5e7eb" stroke-width="1" filter="url(#card-shadow)"/>')
        lines.append(f'  <path d="M {cxp+10} {cyp} L {cxp+card_w-10} {cyp} Q {cxp+card_w} {cyp} {cxp+card_w} {cyp+10} L {cxp+card_w} {cyp+44} L {cxp} {cyp+44} L {cxp} {cyp+10} Q {cxp} {cyp} {cxp+10} {cyp} Z" fill="{c["tint_bg"]}" stroke="{c["tint_border"]}" stroke-width="1"/>')
        lines.append(f'  <text x="{cxp + 20}" y="{cyp + 28}" font-size="16" font-weight="600" fill="{c["accent"]}">{c["name"]}</text>')
        btext = c["badge"]
        bw = max(78, len(btext) * 7 + 20)
        bx = cxp + card_w - bw - 12
        lines.append(f'  <rect x="{bx}" y="{cyp + 12}" width="{bw}" height="20" rx="10" fill="#ffffff" stroke="{c["accent"]}" stroke-width="1"/>')
        lines.append(f'  <text x="{bx + bw//2}" y="{cyp + 26}" text-anchor="middle" font-size="10" font-weight="600" fill="{c["accent"]}">{btext}</text>')
        body_y = cyp + 60
        label_x = cxp + 20
        value_x = cxp + 115
        for label, val in c["rows"]:
            lines.append(f'  <text x="{label_x}" y="{body_y + 12}" font-size="11" font-weight="600" fill="#475569">{label}</text>')
            if isinstance(val, list):
                for li, line in enumerate(val):
                    lines.append(f'  <text x="{value_x}" y="{body_y + 12 + li*16}" font-size="11" fill="#1f2937">{line}</text>')
                body_y += 38
            else:
                lines.append(f'  <text x="{value_x}" y="{body_y + 12}" font-size="11" fill="#1f2937">{val}</text>')
                body_y += 22

    lines.append("</svg>")
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Generate the Session Lifecycle diagram")
    parser.add_argument(
        "--copy-to",
        metavar="DIR",
        help="Also copy the SVG and PNG into this directory (e.g. ../docs/images/use-cases)",
    )
    args = parser.parse_args()

    SVG_PATH.write_text(build_svg())
    print(f"wrote {SVG_PATH}")

    with tempfile.NamedTemporaryFile(suffix=".png") as tmp:
        validate = subprocess.run(
            ["rsvg-convert", str(SVG_PATH), "-o", tmp.name],
            capture_output=True, text=True,
        )
    if validate.returncode != 0:
        print(f"SVG validation failed:\n{validate.stderr}", file=sys.stderr)
        sys.exit(1)
    print("svg validated")

    export = subprocess.run(
        ["rsvg-convert", "-w", "1920", str(SVG_PATH), "-o", str(PNG_PATH)],
        capture_output=True, text=True,
    )
    if export.returncode != 0:
        print(f"PNG export failed:\n{export.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"wrote {PNG_PATH}")

    if args.copy_to:
        dest = Path(args.copy_to).expanduser().resolve()
        if not dest.is_dir():
            print(f"--copy-to target is not a directory: {dest}", file=sys.stderr)
            sys.exit(1)
        for src in (SVG_PATH, PNG_PATH):
            target = dest / src.name.replace("session-lifecycle", "session-lifecycles")
            shutil.copyfile(src, target)
            print(f"copied -> {target}")


if __name__ == "__main__":
    main()
