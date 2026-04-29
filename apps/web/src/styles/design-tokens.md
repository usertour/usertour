# Design tokens — Usertour v2 visual language

This is the design language we extracted from theme-builder v2 and are
gradually rolling out to the rest of `apps/web`. The goal is **language
consistent, dialect variable** — Settings / Content editor / Auth pages
can each have their own register, but they share the same vocabulary
(spacing rhythm, type scale, control hierarchy, radius system).

If you're touching UI in `apps/web`, read this first. If you're adding
something new and the answer isn't here, raise it before inventing
another pattern.

---

## 1. Layout tokens

| Class                                      | Use                                            |
| ------------------------------------------ | ---------------------------------------------- |
| `bg-background`                            | Canvas (page, sidebar, top bar)                |
| `border-border/50`                         | Hairline dividers between regions              |
| `h-15` (60px)                              | Top bar height (extended in tailwind config)   |
| `px-3 py-2.5` / `px-3 py-2`                | Sidebar header / footer padding                |
| `flex-1 overflow-y-auto`                   | Sidebar body scroller                          |

Reference: `apps/web/src/pages/settings/themes/components/theme-builder/ui/tokens.ts`.

**Three-pane chrome pattern**: left sidebar (resizable) + center canvas
+ right inspector (resizable). Each side panel is `bg-background` with a
single hairline border (`border-r border-border/50` / `border-l ...`).
Top bar spans the full width above.

---

## 2. Color hierarchy

The whole language stands on a **passive vs. active** distinction inside
`bg-background`:

| Layer                              | Surface                                                | Reads as       |
| ---------------------------------- | ------------------------------------------------------ | -------------- |
| Canvas                             | `bg-background`                                        | "the page"     |
| Passive controls (input/select)    | `bg-muted` (no border)                                 | "data field"   |
| Active controls (icon buttons)     | `bg-background` + triple-shadow (`DEPTH_SHADOW`)       | "do something" |
| Form inputs (chips / inline edits) | `bg-background` + `border border-input`                | "type here"    |
| Disabled                           | + `opacity-60` (or `opacity-50` for buttons)           |                |

**Why two input styles** (muted vs. bordered): theme builder packs many
form rows densely, so `bg-muted` recedes and lets the depth icon buttons
hero. Conditions / inline edits surface chips that *are* the content,
so they need clear edges. **Don't mix the two in the same pane** — pick
one based on what the surrounding container is doing.

**Foreground:** prefer `slate-700` / `slate-800` for body text over
shadcn's near-black. `text-muted-foreground` for labels and secondary
metadata. Headings stay on `text-foreground`.

---

## 3. Radius system

Tailwind base: `--radius` is 8px → `rounded-lg = 8px`,
`rounded-md = 6px`, `rounded-sm = 4px`.

**Concentric rule**: inner radius = outer radius − padding. Don't put a
4px button inside a 16px card; the corners won't sit right.

| Token             | Value | Used for                                                            |
| ----------------- | ----- | ------------------------------------------------------------------- |
| `rounded`         | 4px   | List rows, pill labels                                              |
| `rounded-md`      | 6px   | Subordinate togglers (vertical AND/OR shrunk one tier)              |
| `rounded-lg`      | 8px   | **Default** for buttons, inputs, chips, popovers, color buttons     |
| `rounded-[10px]`  | 10px  | (Future) modern CTA buttons — earmarked, not in use yet             |
| `rounded-[15px]`  | 15px  | Big floating popovers (rename popper, etc.)                         |

If you need a value not in this list, you're probably about to break
the concentric chain — pause and check.

---

## 4. Spacing rhythm

Tailwind extends standard 4px steps with these for builder use:

| Class          | Value | Why we needed it                                |
| -------------- | ----- | ----------------------------------------------- |
| `h-7.5 / w-7.5`| 30px  | Input / select / hero button height             |
| `h-5.5 / w-5.5`| 22px  | Color swatch size                               |
| `h-15`         | 60px  | Top bar                                         |

Standard rhythm in use:

| Gap class | Used for                                                |
| --------- | ------------------------------------------------------- |
| `gap-1`   | Tight inline groups (chip icon ↔ text)                  |
| `gap-1.5` | Chip / connector rhythm in flex-wrap rows               |
| `gap-2`   | Default row item spacing                                |
| `gap-3`   | Inter-section spacing inside a panel                    |
| `gap-4+`  | Inter-section spacing on the page level                 |

Padding presets:

| Class                | Used for                                |
| -------------------- | --------------------------------------- |
| `px-2 py-1`          | Small dropdown items                    |
| `px-2 py-1.5`        | Sidebar list rows                       |
| `px-3 py-1.5`        | Buttons (chip trigger, save, link)      |
| `p-2`                | Tight container padding (group inner)   |
| `p-3`                | Popover content padding                 |
| `px-3` (panel sides) | Sidebar / top-bar horizontal padding    |

---

## 5. Typography scale

Two-thirds of v2 is at **12px**. Stick to the scale below.

| Class           | Size     | Used for                                                                |
| --------------- | -------- | ----------------------------------------------------------------------- |
| `text-[10px]`   | 10px     | All-caps pill labels (System pill)                                      |
| `text-[11px]`   | 11px     | Small label rows (vertical AND/OR shrunk; "If" pill)                    |
| `text-xs`       | 12px     | **Default** — chip text, input text, button text, list rows, tooltips   |
| `text-sm`       | 14px     | **Avoid in v2 chrome.** Override shared defaults (e.g. ErrorTooltip)    |
| `text-base+`    | 16px+    | Marketing surfaces only (auth, onboarding) — not in editor chrome       |

Weight: `font-medium` (500) for labels and titles, regular for body.
**Don't use** `font-semibold` / `font-bold` in chrome — the type scale
is small enough that the visual hierarchy comes from color, not weight.

---

## 6. Shadow system

Defined in `packages/tailwind/src/extend.ts`:

| Class              | Value                                                                        | Use                                       |
| ------------------ | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `shadow-sm`        | Tailwind default                                                             | Inputs, selects, soft-bordered controls   |
| `shadow-popper`    | `0 10px 30px rgba(0,0,0,.1), 0 1px 4px rgba(0,0,0,.02)`                      | Floating popovers (rename, color picker)  |
| `shadow-lg`        | Tailwind default                                                             | Condition popover content                 |
| `DEPTH_SHADOW` *   | `0 0 0 1px rgba(0,0,0,.02), 0 1px 0 0 rgba(0,0,0,.05), 0 2px 4px rgba(0,0,0,.1)` | Hero icon buttons (back, etc.)        |
| `shadow-toolbar`   | Layered hsl-based                                                            | Floating toolbars                         |

\* `DEPTH_SHADOW` is currently inlined in `builder-icon-button.tsx`. If
this language goes site-wide, lift it into the tailwind preset as
`shadow-depth`.

**Card pattern**: cards use *only* the triple-shadow (or `shadow-popper`
on lifted surfaces). **Don't add `border` utilities to cards** — the
shadow does the visual lift; a hairline border on top reads as clutter.

---

## 7. Control inventory

Live in `apps/web/src/pages/settings/themes/components/theme-builder/ui/`,
prefixed `Builder*`. To go site-wide, lift to a shared package and drop
the prefix.

| Component                                  | Spec                                                              |
| ------------------------------------------ | ----------------------------------------------------------------- |
| `BuilderInput`                             | `h-7.5 rounded-lg bg-muted text-xs shadow-sm`                     |
| `BuilderSelect`                            | matching trigger, `text-xs` items                                 |
| `BuilderColorButton`                       | `h-7.5 rounded-lg bg-muted` + 22px swatch ring-1                  |
| `BuilderIconButton`                        | variants: `ghost` / `outline` / `secondary` (muted) / `depth`     |
| `BuilderSaveButton`                        | hero button ↔ "Saved" pill (idle)                                 |
| `BuilderSwitch`                            | `data-[state=unchecked]:bg-muted`                                 |
| `BuilderTabs*`                             | underline tabs pinned to `text-xs`                                |
| `BuilderDropdownMenu*`                     | items: `gap-2 px-2 py-1 text-xs leading-tight`                    |
| `BuilderFontPicker`                        | combobox + system / custom split                                  |
| `EditableTitle`                            | inline edit pattern (click to flip span ↔ input)                  |

**Conditions surface (separate pane, separate vocabulary)** — lives in
`@usertour-packages/shared-components/conditions/ui/`:

| Component                       | Spec                                                                  |
| ------------------------------- | --------------------------------------------------------------------- |
| `ConditionInput`                | `h-7.5 rounded-lg border border-input bg-background text-xs`          |
| `ConditionSelect`               | DropdownMenu under the hood (avoids Radix-Select-in-Popover trap)     |
| `ConditionInlineSelect`         | Link-style: ghost + `text-primary` + chevron                          |
| `ConditionCombobox`             | cmdk + popover, `w-[var(--radix-popper-anchor-width)]`                |
| `ConditionPopover{,Content}`    | `w-auto rounded-lg p-3 text-xs shadow-lg`                             |
| `ConditionErrorTooltip*`        | `text-xs` (override of shared `text-sm`)                              |

---

## 8. Interaction patterns

- **Inline-edit**: short text fields (titles, names) flip a span into an
  input on click; Enter/blur commits, Esc reverts. **Don't put a
  popover around a single text input.**
- **Hover gutter**: dedicate a fixed 24-32px right column on a container
  for hover-revealed actions (group remove button). Notion / Linear
  pattern. Use `pr-7` / `pr-8` to reserve the space.
- **Auto-open popover after add**: when adding a structured item (a
  rule chip, a variation row), auto-open its editor so the user lands
  in flow without an extra click.
- **Mode-aware components**: components used in both horizontal flex-wrap
  and vertical column layouts (`Conditions`, AND/OR togglers) size
  themselves differently per layout — co-equal pill in horizontal,
  one-tier-shrunk subordinate in vertical.
- **Concentric items-start**: flex-wrap rows that may contain wrapped
  multiline children always use `items-start`, never `items-center`.
  Otherwise connectors / siblings drift to the wrong baseline.
- **Save / dirty state**: track via `hasUnsavedChanges` (deep equality
  vs. baseline, **never `JSON.stringify`** — JSONB roundtripping
  reorders keys). Button toggles between hero "Save" and pill "Saved".

---

## 9. Anti-patterns (lessons learned)

These all caused real bugs we already fixed — don't reintroduce them.

- **`JSON.stringify` for value equality**: order-sensitive, fails on
  Postgres JSONB roundtrip. Use `fast-deep-equal`.
- **Radix `Select` inside a `Popover`**: dismisses the parent layer.
  Use `DropdownMenu` (shares the parent's DismissableLayer).
- **`max-h-N` on `ScrollArea` viewport**: viewport `h-full` needs a
  definite parent height; `max-h` doesn't qualify. Use cmdk's
  `CommandList` (native overflow) for combobox lists.
- **Hard-coded popover widths**: bind to `--radix-popper-anchor-width`
  so the dropdown matches the trigger when the trigger lives in a wider
  panel.
- **`text-sm` in chrome**: shared library defaults often use 14px;
  override to `text-xs` for v2 surfaces so type rhythm holds.
- **`break-all` for chip text**: chops English mid-word. Use
  `break-words` (`overflow-wrap: break-word`).

---

## 10. What's not yet decided

Open questions for when a phase needs them:

- **Modal / dialog visual style**: theme builder doesn't use modals;
  Settings does. Need to align.
- **Toast notification style**: still on shadcn defaults across the app.
- **Empty / loading / error states**: no canonical illustration or
  messaging style yet. Likely deserves its own primitive.
- **DataTable** (TanStack table): no v2 wrapper exists. Will be defined
  in Phase 3 of the migration plan.
- **Marketing / Auth aesthetic**: how warm / how branded vs. tool-like.
  Will be settled in Phase 6.

When picking these, the burden of proof is on the new pattern — it
should compose with what's already here, not introduce a third
vocabulary.
