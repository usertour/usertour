# Dark-mode layering

How surfaces stack in dark mode. One rule, applied everywhere — not a
per-component decision. If a new overlay/panel/control tempts you to pick a
different background, reach for the role table below instead of inventing a
shade. Light mode is unaffected by all of this (see "Light" at the end).

## The ladder (dark tokens)

```
canvas 5%  <  background 8%  <  surface 11%  <  muted 14%  <  card 16%  <  surface-raised 22%
  (builder      (page floor)     (ground /        (control          (FLOATING-      (content that
   canvas)                        recessed band)    fill, recessed)   PANEL base)     floats on a panel)
```

`popover` (21%) also exists but is **legacy** for layering — see below. Don't
reach for it on new surfaces.

## The one rule

**A floating container is `card`. Inside it, content floats one step up
(`surface-raised`); a control sinks one step down (`muted`).**

| Role | What | Dark background |
|---|---|---|
| **Ground** | page body, builder canvas | `background` / `surface` / `canvas` |
| **Floating container** | panel · dialog · popover · sheet · any popped-out surface | **`card` (16%)** |
| **Content in a container** | grouped card · select | float → **`surface-raised` (22%)** |
| **Control in a container** | text input · outline button | sink → **`muted` (14%)** |
| **Switch** | toggle | `bg-input` |

Why it matters: a container brighter than its content reads as *recessed /
black* in dark — content must float **above** the container, not sink into it.
The reason this only shows in dark: in light, `surface`/`muted`/`card`/`popover`
all sit near-white, so the gaps are invisible. In dark the lightness gaps are
real, so direction matters.

## Containers are `card` — concretely

These all resolve to `card` (16%) in dark:

- `DialogContent` / `AlertDialogContent` (`primitives/dialog.tsx`, `alert-dialog.tsx`) — `bg-popover dark:bg-card`
- `PopoverContent` (`primitives/popover.tsx`) — `bg-popover dark:bg-card`
- `SheetContent` — `bg-background dark:bg-card`
- builder `FloatingSidebarPanel`, admin layout content — `bg-background dark:bg-card`
- editor block setting popovers — `bg-card`

A control inside any of these is then **only −2% recessed** (`muted` 14% under
`card` 16%) — a subtle dent, not a black hole. That's the whole point of
standardising the container: you don't retune the input, you fix the container.

**Not containers** (independent primitives, no nested inputs — leave as-is):
`DropdownMenuContent` menu items, `CompactSelectContent` option lists, `Tooltip`.
Their item hover uses `accent`; they don't host inputs, so the recess problem
doesn't apply.

## Controls

| Control | Dark | Note |
|---|---|---|
| text input (`Input`) | `muted` (`compact-muted` variant) | sinks ~2% under a card container |
| select (`SelectField`, `CompactSelect`, `SelectPopover`) | `surface-raised` | floats above the container |
| outline button | `muted` (button `outline` variant) | sinks, like an input |
| switch | `bg-input` unchecked | |
| content card / grouped block | `surface-raised` | `bg-surface dark:bg-surface-raised` (light keeps `surface`) |

## How to write it (light stays put)

`card` and `popover` are both pure white in light, so:

- Container: `bg-popover dark:bg-card` — light unchanged, dark drops to 16%.
- Content card: `bg-surface dark:bg-surface-raised` — light keeps slate-50, dark floats to 22%.

Never hardcode `bg-background` (8%, near-black) on something inside a container —
it's darker than every container and reads as a black hole in dark.

## Anti-patterns

- ❌ A `bg-surface` (11%) grouped card sitting inside a `card` (16%) panel — it
  sinks. Use `dark:bg-surface-raised` so it floats.
- ❌ A select on `dark:bg-muted` inside a popover — recessed 7%. Selects float
  (`surface-raised`).
- ❌ `bg-background` / `bg-white` on container-nested content with no `dark:`
  override — goes near-black in dark.
- ✅ Exceptions that are intentionally not in the system: QR codes (must be
  white to scan), widget/page-preview canvases, the billing/marketing zinc
  pages.
