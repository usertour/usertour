# Diagrams

Source scripts for technical diagrams that illustrate Usertour's architecture. Generated SVGs and PNGs live alongside their generators so diffs are reviewable.

## Generators

| Diagram | Generator | When to re-run |
| --- | --- | --- |
| Session lifecycle by content type | `session-lifecycle.py` | When `ContentType`, `BizEvents`, `contentStartReason`, or `contentEndReason` in `packages/types` changes, or when `endSession` / single-session enforcement changes server-side. |

## Usage

Requires `rsvg-convert` (from `librsvg`).

```bash
# Generate SVG + PNG into this directory
python3 scripts/diagrams/session-lifecycle.py

# Also copy artifacts into the docs repo
python3 scripts/diagrams/session-lifecycle.py --copy-to ../docs/images/use-cases
```

Both the source script and the generated artifacts are committed. After re-running, review the SVG diff before committing, and open a matching PR in the docs repo if the artifacts changed.
