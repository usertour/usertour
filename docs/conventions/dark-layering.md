# Dark-mode layering

How surfaces stack in dark mode. One model, applied everywhere — not a
per-component decision. If a new panel / card / control tempts you to pick a
shade, find its role in the table below instead of inventing one. Light mode
is unaffected by all of this (see "Light" at the end).

> **Supersedes** an earlier version where content *floated up* to
> `surface-raised` and controls *sank* to `muted`. That inverted model put a
> grouped card and the select inside it on the **same** `surface-raised` shade
> — they merged into one flat block. This version flips it: the **card
> recedes**, the **control floats**, and the control fill is **translucent so
> it self-adjusts to whatever it sits on**.

## The ladder (dark token lightness)

```
background 8%  ·  surface 11%  ·  muted 14%  ·  card 16%  ·  popover 21%  ·  surface-raised 22%  ·  input 24%
```

HSL `L` values from `packages/assets/web/base.css`. In **light** every one of
these is near-white, which is the whole reason none of this matters in light —
the lightness gaps only open up in dark.

## The model: three roles + one knob

| Role | Dark fill | Who |
|---|---|---|
| **Panel** — outermost shell | `card` (16%) — **don't go darker** | `FloatingSidebarPanel` |
| **Section card** — grouped settings nested in the panel | `surface/50` (≈13.5%, recesses ~2.5% under the panel) | builder section `div`s (`content-trigger`, `launcher-*`, `banner-*`, `flow-placement`…), `FieldCard` |
| **Overlay** — top-level, not nested in a panel | `card` (16%) | `DialogContent`, `PopoverContent`, editor block popovers |
| **Control** — input / select / chip / toggle track | `surface-raised/50` (translucent — floats ~+3–4 over its container) | `Input` compact-surface, `SelectField`, `CompactSelect`, condition/action chip, segmented `TabsList` |

### The two ideas that hold it together

1. **Controls use a translucent fill (`/50`), never a solid token.** `/50`
   blends with whatever is under it, so a control always lands a few % *above*
   its parent — automatically, whatever the parent is. A solid token reads
   flat and grey and stops adjusting: `bg-input` (24%) looks like a dead grey
   slab; `muted` (14%) sinks too far on some parents and merges on others.

2. **Containers cap at `card` (16%).** Anything brighter (`surface-raised`
   22%) leaves a `/50` control nowhere to float — it blends to the same shade
   and merges. This is the single most common mistake (see anti-patterns).

## Why a section card RECEDES (the counter-intuitive bit)

The panel is `card` (16%). A grouped settings card sitting on it:

- can't also be `card` → it'd merge with the panel;
- can't float to `surface-raised` (22%) → then *its own* controls (`/50`,
  ≈22% on a 22% parent) have no headroom and merge — the original bug.

So it goes the **other** direction: `surface/50` ≈ 13.5%, a shallow recess.
Its controls (`/50`) then blend up to ≈ 17% and float clearly inside it:

```
panel 16%   >   section card ~13.5% (recessed)   <   control ~17% (floats in the card)
```

Recede, don't float — floating runs out of headroom; receding gives the
control its room back.

## Overlays are `card` — concretely

Top-level overlays aren't nested in a panel, so they don't have the
"can't-match-the-panel" problem — they stay at `card` (16%), and their
controls (`/50` → ~19%) float +3:

- `DialogContent` / `AlertDialogContent` — `bg-popover dark:bg-card`
- `PopoverContent` — `bg-popover dark:bg-card`
- editor block setting popovers (scale / button / image / embed / column / …) — `bg-card`

**Not containers** (independent primitives, no nested inputs — leave as-is):
`DropdownMenuContent` items, `CompactSelectContent` lists, `Tooltip`, and the
segmented-tab **active pill** (intentionally `surface-raised` floating over
its own `muted` track — that's a 2-layer control, not a container).

## How to write it (light stays put)

`card` / `popover` / `surface` are all near-white in light, so a `dark:`
override changes dark only:

- Overlay: `bg-popover dark:bg-card` — light unchanged, dark 16%.
- Section card: `bg-surface dark:bg-surface/50` — light keeps slate-50, dark recesses.
- Control: `… dark:bg-surface-raised/50` — light keeps its surface, dark floats.

Never hardcode `bg-background` (8%) on anything inside a container — it's
darker than every container and reads as a black hole.

## Pre-flight (before adding any background)

Ask which of the four roles it is, then take that row's token. Don't
co-locate-and-guess — that's exactly how `FieldCard` shipped a solid
`surface-raised` and merged with its selects undetected until checklist.

## Anti-patterns — each one we actually shipped and reverted

- ❌ **Container at `surface-raised` (22%).** A `/50` control on it blends to
  ~22% — same shade, merges. `FieldCard` shipped this; checklist settings
  read as one flat block. Containers cap at `card`.
- ❌ **Solid `bg-input` (24%) controls.** They float, but read flat and grey,
  no air. Use translucent `/50`.
- ❌ **Panel dropped to `surface` (11%)** to make section cards float — the
  whole panel goes too dark. Keep the panel at `card`; recede the section.
- ❌ **`bg-background` (8%) inner card** — darker than every container, black
  hole.
- ❌ **Section card floating up to `surface-raised`** — its own controls then
  have no headroom and merge. Recede to `surface/50` instead.
- ❌ **Reaching for a `dark:border` to separate a same-coloured card from its
  panel.** Works, but the recess (`surface/50`) gives the separation for free
  and matches the rest — prefer it over a border.

## Intentional exceptions (not in the system)

QR codes (must be white to scan), widget / page-preview canvases, the
billing / marketing zinc pages.
