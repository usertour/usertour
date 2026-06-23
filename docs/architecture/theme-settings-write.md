# Theme settings write — design

Open theme **styling** (`settings`, later `variations`) to the v2 API / MCP so an
agent can brand a project, not just create empty themes. Today the theme write
surface is **metadata-only** (`name` / `isDefault`); `settings` is seeded from the
default and only editable in the builder
(`apps/server/src/api/themes/themes.schema.ts:73`, `themes.service.ts:92,105`).

The reason it was deferred: a theme's `settings` is a large (~25 groups, ~130 leaf
paths) cascaded structure whose **constraints** (ranges / enums / required-ness)
live only in the builder's form schema, with no machine-checkable contract on the
server — so accepting `settings` would mean accepting unvalidated data. This design
removes that blocker by making the builder's field schema the **single source of
truth (SSOT)** that the server validates against, instead of hand-mirroring it.

> Status: DESIGN. Decisions locked below; not yet built. Supersedes the "metadata
> only" note in `themes.schema.ts` once shipped.

## 1. Scope

**In scope (phase 1):**
- Write a **partial** `settings` patch on `create_theme` / `update_theme` (REST +
  MCP), field-merged onto the theme's current settings (always a valid base).
- Validate the patch against a zod schema **generated from the builder's field
  schema** (the SSOT), covering the common field kinds (below). Unknown / not-yet-
  covered paths are **rejected**, not silently dropped.
- Re-derive the auto color states (`autoHover` / `autoActive`) on write via the
  shared color helper, so agent-authored themes render correctly in **both** the
  SDK and the builder.

**Out of scope (phase 2):**
- `variations` write (conditions codec already exists; their `settings` reuse the
  same merge + derive path — see §8).
- The niche field kinds (`placement`, `dynamic-number`, `avatar-type`,
  `image-upload`) — their paths stay builder-only until added incrementally (§5).

**Non-goals:** changing the theme data model; a per-scope theme permission (stays
`theme:create` / `theme:update`); exposing `isPrimary`-style admin toggles.

## 2. The enabler — the constraint SSOT is reachable (verified)

The constraint values (ranges / enums / which paths are writable) already exist as
runtime data — but only in the builder's field schema (`builderSections` /
`FieldDef`, web-local), because that's the only thing that needed them. The TS type
`ThemeTypesSetting` is compile-time only, so it can't be turned into a runtime
validation schema. So the constraints have exactly one runtime home today: the
builder.

The resolution is NOT to make the server read that UI schema, nor to relocate it.
Instead, **distill the constraints into a neutral, presentation-free table**
`THEME_SETTING_CONSTRAINTS` in `@usertour/constants` (`path → {kind, min?, max?,
allowAuto?, values?}`) — a domain contract the server validates against — and keep
the **builder exactly where it is, unchanged**. A parity test (web-side, where it can
read the local builder schema) asserts the table still matches the builder, so the
two can't drift. Placement:
- **`@usertour/constants`** — `THEME_SETTING_CONSTRAINTS` (the neutral validation SSOT).
- **builder (`apps/web`)** — `builderSections` / `FieldDef` stay web-local, untouched.
- **`apps/server`** — the zod generator (reads the neutral table).
- **web `__tests__`** — the parity test (reads both: local builder schema + the table).

## 3. Locked decisions

1. **Route = neutral constraint SSOT, kept in sync by a parity test — the server
   never reads the builder's UI schema.** The constraints live in a
   **presentation-free** table `THEME_SETTING_CONSTRAINTS` (`@usertour/constants`,
   `path → {kind, min?, max?, allowAuto?, values?}`); the server generates its
   validation zod from THAT table, and a **parity test (web-side)** projects the
   builder's `builderSections` to constraints and asserts they equal the table — so
   the two authoring surfaces can't drift, yet the server depends only on a domain
   contract, not on a UI form description.
   - **The builder is NOT modified at all** — its field schema stays web-local; the
     server never imports it. The table is the server's contract; the parity test
     (in the web theme `__tests__`, where it can read the local builder schema) is
     the lock. (This is the "Light-C" decision — chosen over "Full-C" where the
     builder reads ranges from the table. Also rejected: the server reading
     `builderSections` directly — that couples the API contract to a presentation
     artifact, which felt wrong on review.)
2. **Write model = partial field-merge** onto the current settings (mirrors the
   content `data` field-merge), so an agent sends only what it changes and the
   long-tail it didn't send is preserved. The merge uses the existing
   `deepmergeCustom` config (`convert-settings.ts:50`); `ThemeTypesSetting` contains
   **no arrays**, so nested-object merge is unambiguous.
3. **Server re-derives auto colors on write.** `convertSettings` resolves
   `hover: 'Auto'` by reading the **stored** `autoHover` (for `brandColor` /
   `mainColor` it does *not* recompute — `convert-settings.ts:88-102`), filling from
   `defaultSettings` when absent. So a changed base color with `'Auto'` states and
   no `autoHover` would render the **default theme's** (stale) hover in both SDK and
   builder. The server therefore runs the shared derivation after merge. **This is
   required for correctness, not cosmetic.**
4. **Derivation logic is shared, not reimplemented.** `generateStateColors`
   (`packages/helpers/src/color.ts:232`) is already a pure, importable helper used
   by both builder and SDK. Extract the builder's cascade
   (`use-theme-draft.ts:19-143`, 8 rules) into a pure
   `deriveThemeAutoColors(settings)` in `@usertour/helpers`; both the builder and
   the server call it.
5. **Coverage is incremental but honest.** Phase 1 generates zod for the common
   field kinds; not-yet-covered paths are **rejected with a clear error**, never
   silently dropped (per [[v2-validation-strict]]). What's excluded is documented.

## 4. Architecture

The builder is untouched; the only shared addition is the neutral table:

```
apps/web/.../theme-builder/schema/   (UNCHANGED — stays web-local)
  sections.ts / types.ts / registered-paths.ts   builder field schema (UI authoring)

packages/constants/src/constants/
  theme-settings-constraints.ts  NEW  THEME_SETTING_CONSTRAINTS — the neutral SSOT

packages/helpers/
  color.ts                   generateStateColors (exists)
  derive-theme.ts      NEW   deriveThemeAutoColors(settings) — runs the 8 cascade rules
  convert-settings.ts        export a generic deepMergeThemeSettings(base, patch)

apps/server/src/api/themes/
  settings.schema.ts   NEW  zod generated from THEME_SETTING_CONSTRAINTS (the contract)
  themes.service.ts         create/update: merge patch -> derive -> validate -> store
  themes.schema.ts          createThemeBody/updateThemeBody gain optional `settings`

apps/web/.../themes/__tests__/
  theme-constraints-parity.test.ts  NEW  asserts the table == builder schema projection
```

## 5. Field-kind coverage (phase 1)

Because the neutral table covers **all** common-kind fields across every widget
(base colors, font, border, buttons, modal, tooltip, bubble, backdrop **and**
banner / checklist / launcher / survey / progress — 136 paths), the earlier "which
widgets to open" question dissolves. Only the **niche kinds** below defer,
regardless of which widget they belong to.

`FieldDef` has ~15 kinds. The projection (used to produce the table, and re-run by
the parity test) maps each leaf path to a constraint; `sub-section` recurses;
`inline-alert` / niche kinds emit nothing.

| Kind | Phase 1 | zod |
|---|---|---|
| `color` / `triple-color` | ✅ | hex string; `'Auto'` allowed where `allowAuto` (the `hover`/`active`/flagged leaves) |
| `number` / `slider` | ✅ | `z.number()` + `min`/`max` from FieldDef |
| `select` | ✅ | `z.enum` of `options` (number literals when `valueAsNumber`) |
| `boolean` | ✅ | `z.boolean()` |
| `text` / `font-family` | ✅ | `z.string()` (font-family: known-family check optional) |
| `code` | ✅ | `z.string()` — `customCss` (see §7) |
| `sub-section` | ✅ | recurse into `fields` |
| `inline-alert` | n/a | no path — skipped |
| `placement` | ⛔ phase 2 | offset/position object |
| `dynamic-number` | ⛔ phase 2 | progress-bar per-variant heights |
| `avatar-type` / `image-upload` | ⛔ phase 2 | avatar/logo upload |

Leaf colors are flat strings for some fields (`font.linkColor`, `border.borderColor`)
and object members for others (`brandColor.background` …) — the generator builds the
nested object from the **dotted leaf paths**, so both fall out naturally. Color
format (hex; `'Auto'` sentinel) and enums come from `@usertour/types` (the type
SSOT), ranges from the `FieldDef` data.

Excluded-kind paths are simply **not in the generated zod** → rejected as unknown
(§6); field-merge keeps whatever the base holds for them.

## 6. Write flow

```
create_theme(settings?) / update_theme(settings?)
  base = create ? defaultSettings : currentTheme.settings   // always valid
  merged = deepMergeThemeSettings(base, patch)               // helpers
  validate(patch) against generated zod                      // reject unknown/out-of-range -> E1017
  derived = deriveThemeAutoColors(merged)                    // helpers, fills auto*
  store derived; return mapped theme
```

- Validate the **patch** (not the merged whole) so the error points at what the
  caller sent; the merged+derived object is what's stored.
- `visibleWhen` conditional validity (e.g. `border.borderWidth` only meaningful when
  `border.borderWidthEnabled`) runs as a zod refinement against the merged settings.
- System themes stay rejected (`themes.service.ts:107`).
- Unknown / out-of-range → `ValidationError` (**E1017**), the documented v2 envelope.

## 7. customCss

`customCss` is a writable string. The runtime already strips it for non-premium
plans at session build (`session-builder.service.ts:225` via `stripThemeCustomCss`,
incl. variations). So: **accept on write, gate at runtime** (unchanged) — no
write-time plan check needed. Document that it only renders on plans with custom CSS.

## 8. Variations (phase 2)

`ThemeVariation = { id, name, conditions, settings }`. The hard parts are already
solved: `conditions` round-trip through the rules codec (`themes.mapper.ts:26`,
id↔code). A variation's `settings` reuse the **same** zod + merge + derive as the
base (merged onto the base settings to produce the full variation settings, since
the SDK applies a matched variation's settings **wholesale** —
`sdk/.../usertour-theme.ts:63`). Deferred only to keep phase 1 focused.

## 9. Read shape

Unchanged: `settings` / `variations` stay readable via `?expand=settings,variations`
as pass-through objects (`themes.schema.ts:24`). The generated zod governs **writes**
only; reads return the full stored settings.

## 10. MCP + guide

- `create_theme` / `update_theme` inputSchema gains the generated `settings` object
  (a real nested object schema → MCP clients can pass it; cf. the `data` z.unknown
  fix). Update both tool descriptions (drop "not editable via the API").
- `get_authoring_guide`: add a short "Theming" note — partial merge, `'Auto'`
  colors auto-derive, what's builder-only.

## 11. Phasing

1. `THEME_SETTING_CONSTRAINTS` neutral table in `@usertour/constants` (distilled
   from the builder field schema; the builder stays web-local & untouched). **[done]**
2. `settings.schema.ts` generator (reads the table) + generator unit tests +
   web-side builder↔table **parity test**. **[done]**
3. `deriveThemeAutoColors` + generic `deepMergeThemeSettings` in helpers. (Builder
   keeps its own cascade — not switched, to avoid touching the builder.)
4. Wire `themes.service` create/update (merge → validate → derive → store) +
   `themes.schema` bodies + MCP tools + authoring guide.
5. e2e + docs (OpenAPI snapshot, still Beta).
6. (phase 2) variations write; the deferred field kinds.

## 12. Testing matrix

- **Generator unit** (`settings.schema.spec.ts`): each covered kind → expected zod
  (range reject, enum reject, unknown-path reject, niche-kind path reject). **[done]**
- **Parity** (`theme-constraints-parity.spec.ts`): `THEME_SETTING_CONSTRAINTS` equals
  the `builderSections` projection — fails if the builder changes a range/enum/field
  without the table being updated. **[done]**
- **Write e2e**: partial `settings` merges (untouched groups preserved); out-of-range
  / unknown path → E1017; auto colors derived (change `brandColor.background` →
  `brandColor.autoHover` recomputed, not the default's).
- **Round-trip**: write settings → read `?expand=settings` reflects it.
- **MCP**: `update_theme` with a nested `settings` object round-trips (regression vs
  the untyped-object class of bug).
- **Builder no-regression**: existing `coverage.test.ts` / `round-trip.test.ts` stay
  green (builder untouched by this work).

## 13. Resolved details

- **`font-family` → `z.string()`** (not a known-family list). The family list isn't
  cleanly shareable to the server — the Google-font options live UI-side — and an
  unknown value degrades gracefully: `convert-settings.ts:19` treats anything other
  than `System font` / `Custom font` as a Google font to load. Revisit only if we
  later share a font catalog.
- **`validate` custom fns** — only a couple exist in the covered set (e.g. tooltip
  `missingTargetTolerance` ≤ 10). Port those as zod refinements with neutral
  messages; no general porting mechanism.
- **Derived paths need no reject list.** The `auto*` colors (the builder's
  `DERIVED_PATHS`) are NOT `builderSections` form fields, so they never enter
  `THEME_SETTING_CONSTRAINTS` → a caller that sends one is rejected as an unknown
  path automatically. The server fills them via `deriveThemeAutoColors`.

## 14. API surface summary

| Tool / endpoint | Change |
|---|---|
| `POST /v2/projects/:p/themes` (`create_theme`) | body gains optional `settings` (partial, generated zod) |
| `PATCH /v2/projects/:p/themes/:id` (`update_theme`) | body gains optional `settings` (partial, merged onto current) |
| read (`GET …/themes/:id?expand=settings`) | unchanged (pass-through) |
| capability | unchanged (`theme:create` / `theme:update`) |
