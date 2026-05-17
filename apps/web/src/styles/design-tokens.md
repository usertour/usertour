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

## 0. Two registers, one vocabulary

The codebase runs **two density registers** that share the same
type / color / focus / radius vocabulary. Pick the register from
context — don't introduce a third.

The boundary is **inspector / panel surfaces vs. everything else**, not
"is this page a takeover." All page chrome — list pages, detail pages,
modals, **and** the top bars of takeover editors (content builder) —
uses shadcn default. v2 chrome only takes over inside inspector /
property-panel surfaces (theme builder's variations sidebar + sections
accordion + its own field controls, Conditions chips + popovers).

| Register                  | Where it lives                                                                                                                          | Control height | Radius        | Surface                                              | Border             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------- | ---------------------------------------------------- | ------------------ |
| **shadcn default**        | All page chrome — list / detail headers (incl. theme builder, which sits in the sidebar shell as theme's detail), content builder takeover top bar, modals, settings, content tables, auth | h-9 / h-10     | `rounded-md`  | single (`bg-transparent` + border)                   | `border-input`     |
| **v2 chrome / inspector** | Inspector / panel surfaces — theme builder's variations sidebar + sections accordion + property fields, Conditions chips + popovers + chip editors | h-7.5 / h-6    | `rounded-lg`  | dual (`bg-muted` passive / `bg-background` active)   | `border-input/60`  |

**Both registers share** (this is the "language" half — never break
these across a register boundary):

- **Type scale**: 14px body (`text-sm`) + 11px metadata (`text-[11px]`)
- **Focus ring**: 3px ring + `border-ring` for form triggers (Input, Select, Button, FontPicker, ColorButton, EditableTitle)
- **Color tokens**: `text-foreground` / `text-muted-foreground` / `bg-muted` / `border-input` (palette is identical)
- **Font weight rules**: `font-medium` for labels and emphasis; no `font-bold` in chrome

**The two registers are cva variants on the same atomic primitives**
(`<Input variant="default" />` vs. `<Input variant="compact" />`,
`<Button variant="...compact-*" size="compact" />` vs. shadcn defaults).
No separate "compact-family" or "conditions-family" component layer
exists — picking a variant picks the register.

**Why two registers and not one**: the density gap (30 vs 36px, 8 vs
6px radius, dual vs single surface) signals "you're inside an
inspector / properties pane, mind its rhythm" — same way Notion's
properties panel reads denser than the main document. Don't fight it;
**don't mix the two registers in the same pane**.

**Top-bar atoms** shared across every page (list, detail, takeover):
ghost `size="icon-sm"` Back button, `<MoreButton>` (32px square),
`<EditableTitle>` for inline rename, `h-14 sticky top-0 z-10
border-b border-border/50 bg-background` strip. Theme builder's top
bar uses these same atoms; its dense inner panes are what mark it as
a builder, not a different top-bar register.

**Structural placement (sidebar shell vs takeover)** — this is a
separate decision from chrome register, made by asking "is there a
separate detail page upstream?":
- **No upstream detail / this page *is* the detail** → `AdminShellMuted`
  (sidebar shell). Covers user / company / session / content detail
  + theme builder (theme has no separate read-only detail page; the
  builder doubles as detail).
- **Upstream detail exists, this page is the focused-edit mode launched
  from it** → `AdminBuilderLayout` (takeover). Currently **only**
  content builder qualifies: `/env/X/flow/Y/detail` is the real detail
  page (in the sidebar shell), `/builder/Z` is the takeover entered via
  "Edit in Builder". Don't try to align content builder with theme
  builder's structure — three inner panes + admin sidebar is too
  cramped, and the upstream detail already carries the navigation /
  metadata role.

If a feature genuinely belongs in neither register (e.g., marketing
hero, content viewer with reading typography), document it before
inventing a third register.

---

## 1. Layout tokens

| Class                                      | Use                                            |
| ------------------------------------------ | ---------------------------------------------- |
| `bg-background`                            | Canvas (page, sidebar, top bar)                |
| `border-border/50`                         | Hairline dividers between regions              |
| `h-14` (56px)                              | Top bar height (used by every detail header — list / detail / takeover) |
| `px-3 py-2.5` / `px-3 py-2`                | Sidebar header / footer padding                |
| `flex-1 overflow-y-auto`                   | Sidebar body scroller                          |

Reference: `apps/web/src/pages/settings/themes/components/theme-builder/ui/tokens.ts`.

**Three-pane chrome pattern**: left sidebar (resizable) + center canvas
+ right inspector (resizable). Each side panel is `bg-background` with a
single hairline border (`border-r border-border/50` / `border-l ...`).
Top bar spans the full width above.

---

## 2. Color hierarchy

The **v2 register** stands on a **passive vs. active** distinction
inside `bg-background`. The **shadcn default register** uses a single
bordered-transparent layer (no muted/depth split).

| Layer                              | Surface                                                | Reads as       | Register              |
| ---------------------------------- | ------------------------------------------------------ | -------------- | --------------------- |
| Canvas                             | `bg-background`                                        | "the page"     | both                  |
| Passive controls (input/select)    | `bg-muted` (with soft border)                          | "data field"   | v2 chrome only        |
| Active controls (icon buttons)     | `bg-background` + triple-shadow (`DEPTH_SHADOW`)       | "do something" | v2 chrome only        |
| Form inputs (chips / inline edits) | `bg-background` + `border border-input`                | "type here"    | v2 chrome             |
| Default form inputs                | `bg-transparent` + `border border-input`               | "type here"    | shadcn default        |
| Disabled                           | + `opacity-60` (or `opacity-50` for buttons)           |                | both                  |

**Why two input styles inside v2** (muted vs. bordered): theme builder
packs many form rows densely, so `bg-muted` recedes and lets the depth
icon buttons hero. Conditions / inline edits surface chips that *are*
the content, so they need clear edges. **Don't mix the two in the
same pane** — pick one based on what the surrounding container is
doing.

Both v2 surfaces are exposed as cva variants on the same atomic
primitives (`<Input variant="compact-muted" />` vs.
`<Input variant="compact" />`) — there's no separate Compact-family /
Conditions-family layer.

**Foreground:** prefer `slate-700` / `slate-800` for body text over
shadcn's near-black. `text-muted-foreground` for labels and secondary
metadata. Headings stay on `text-foreground`. (Foreground rules apply
to both registers.)

---

## 3. Radius system

Tailwind base: `--radius` is 8px → `rounded-lg = 8px`,
`rounded-md = 6px`, `rounded-sm = 4px`.

**Concentric rule**: inner radius = outer radius − padding. Don't put a
4px button inside a 16px card; the corners won't sit right.

| Token             | Value | Used for                                                                    |
| ----------------- | ----- | --------------------------------------------------------------------------- |
| `rounded-sm`      | 4px   | List rows, pill labels, dropdown items                                      |
| `rounded-md`      | 6px   | **shadcn default** for buttons / inputs / cards (rest-of-site forms)        |
| `rounded-lg`      | 8px   | **v2 chrome default** for buttons, inputs, chips, popovers, color buttons   |
| `rounded-[10px]`  | 10px  | (Future) modern CTA buttons — earmarked, not in use yet                     |
| `rounded-[15px]`  | 15px  | Big floating popovers (rename popper, etc.)                                 |

If you need a value not in this list, you're probably about to break
the concentric chain — pause and check.

---

## 4. Spacing rhythm

Tailwind extends standard 4px steps with these v2-chrome-only sizes
(rest-of-site uses shadcn defaults `h-9` / `h-10`):

| Class          | Value | Why we needed it                                |
| -------------- | ----- | ----------------------------------------------- |
| `h-7.5 / w-7.5`| 30px  | v2 input / select / compact button height       |
| `h-6`          | 24px  | v2 compact-sm button (chip popover inline tags) |
| `h-5.5 / w-5.5`| 22px  | Color swatch size                               |

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

V2 chrome and the rest of `apps/web` share **shadcn's 14px baseline**
(`text-sm`). Metadata sits one tier below at 11px. Labels live at the
body tier (same size as the control they label) — hierarchy comes from
`font-medium` + `text-muted-foreground`, **not** from size difference.
Same convention as shadcn's `<Label>` component, which stays at
`text-sm` to match input text.

| Class           | Size     | Used for                                                                                                |
| --------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `text-[10px]`   | 10px     | All-caps pill labels (System pill)                                                                      |
| `text-[11px]`   | 11px     | **Metadata only** — "and"/"or" connectors, combobox option hints, priority badges, small-mode pill summary |
| `text-sm`       | 14px     | **Default everywhere** — chip text, input / select / button text, popover body, field labels, editor titles, tooltips, and the same `default` cva tier rest-of-site forms already use |
| `text-base+`    | 16px+    | Marketing surfaces only (auth, onboarding) — not in editor chrome                                       |

Compact controls (`h-7.5` / `h-6`) keep `text-sm`'s native 20px
line-height — the 30px/24px boxes have just enough room for the 14/20
text without explicit `leading-*` overrides.

Weight: `font-medium` (500) for labels, sub-titles, and emphasis;
regular for body. The canon "this is a label" treatment is
`text-sm font-medium text-muted-foreground`. **Don't use**
`font-semibold` / `font-bold` in chrome — visual hierarchy comes from
color and weight, not aggressive bold.

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

Compact-context primitives are **cva variants on the atomic shadcn
packages** in `@usertour/<input|select|switch|tabs|button|dropdown-menu>`.
There is no separate styled-primitive layer — the variants pick the
density and surface treatment directly:

| Atomic primitive  | Variant key                                       | Purpose                                                 |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `Input`           | `variant="default" \| "compact" \| "compact-muted"` | shadcn default / chip-popover form / inspector form     |
| `SelectTrigger`   | `variant="default" \| "compact" \| "compact-muted"` | same surface choices                                    |
| `SelectItem`      | `variant="default" \| "compact"`                  | item rhythm                                             |
| `Switch`          | `variant="default" \| "muted"`                    | unchecked state surface                                 |
| `UnderlineTabsTrigger` | `variant="default" \| "compact"`              | both `text-sm`; `compact` differs only in surrounding chrome |
| `DropdownMenuContent` | `variant="default" \| "compact"`               | `min-w-[8rem]` vs no floor + `rounded-lg`               |
| `DropdownMenuItem` | `variant="default" \| "compact"`                  | tighter padding (`text-sm` in both)                     |
| `Button`          | `variant="...compact-ghost \| compact-outline \| compact-secondary \| depth"` + `size="compact \| compact-icon{,-sm,-lg}"` | compact text/icon buttons (replaces former CompactIconButton family) |

**Composition wrappers** in `@usertour/ui/compact/` (these
package multiple atomic primitives or are self-contained components,
not just styled primitives):

| Wrapper                  | What it composes                                                           |
| ------------------------ | -------------------------------------------------------------------------- |
| `CompactSelect`          | All-in-one Select for `value`/`onChange`/`options` enum pickers            |
| `CompactDropdownMenu*`   | DropdownMenu variants pinned to `compact` + `min-w-[10rem]` floor          |
| `CompactTabs*`           | Underline tabs with Trigger pinned to `compact`                            |
| `CompactPanel`           | Sidebar / inspector chrome (header / body / footer + optional resize)      |
| `CompactColorButton`     | Swatch + label trigger button (used inside ColorField)                     |
| `ResizeHandle`           | 6px invisible drag handle for panel edges                                  |
| `InlineAlert`            | Single-line alert for dense form rows                                      |
| Layout tokens            | `panelClass` / `headerClass` / `bodyClass` / `pillClass` / etc.            |

**Conditions surface** — lives in `@usertour/business-components/conditions/ui/`.
Only the runtime-context-needing wrappers stay here; plain styled
primitives went away in favor of atomic variants:

| Wrapper                         | Why it's still needed                                                 |
| ------------------------------- | --------------------------------------------------------------------- |
| `ConditionSelect`               | DropdownMenu-based select (avoids Radix-Select-in-Popover layer trap) |
| `ConditionInlineSelect`         | Link-style picker: ghost + `text-primary` + chevron                   |
| `ConditionCombobox`             | cmdk + popover, anchored to `--radix-popper-anchor-width`             |
| `ConditionPopover{,Content}`    | Popover with z-index injection from ConditionsContext                 |
| `ConditionDropdownMenu{,Content,Item}` | DropdownMenu with z-index injection from ConditionsContext     |
| `ConditionErrorTooltip*`        | Error tooltip with z-index injection + `text-sm` override             |

**Theme-builder local wrappers** that intentionally aren't shared
because they couple to app-level state:

| Wrapper                      | Why it stays in apps/web                                          |
| ---------------------------- | ----------------------------------------------------------------- |
| `BuilderFontPicker`          | Depends on the apps/web font catalog and translation              |
| `BuilderSaveButton`          | Renders dirty / saving / saved state with translated labels       |
| `EditableTitle`              | Inline rename pattern (click to flip span ↔ input)                |

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
- **Bumping a label one tier smaller than its content**: labels stay at
  the same size as the control they label (14px). Going to 11 reads as
  "this is metadata", not "this is a label" — readers lose the visual
  cue that the row is a labeled field.
- **`break-all` for chip text**: chops English mid-word. Use
  `break-words` (`overflow-wrap: break-word`).
- **`truncate` on inline `<a>` / `<span>`**: doesn't work — inline
  elements ignore `overflow:hidden`, and truncate's
  `white-space:nowrap` *also* cancels the parent's `break-words`, so
  long unbroken strings spill straight past their container. Promote
  the link to `block truncate` (or wrap it in `inline-flex` so the
  inner span becomes a flex item with proper sizing). Burn from
  session detail's Session info card.
- **No width cap on a breadcrumb / title slot**: `EditableTitle`'s
  inner truncate only fires once the parent flex item is forced to
  shrink, so without a `max-w` cap a 100-char name eats half the
  header before truncating. Cap the breadcrumb container at
  `max-w-sm`, and add `min-w-0 max-w-full` on the inline edit input
  so HTML `size` doesn't blow past the cap in edit mode.

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
