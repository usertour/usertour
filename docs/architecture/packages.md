# Package layering

This document defines how packages in this repository are layered and how
dependencies flow between them. It is a guideline for new packages and
refactors, not strict enforcement — but a package whose contents drift
outside its layer is a signal that something needs splitting.

This is a living document. Update it when package responsibilities
genuinely shift.

## Why this document

The repository accumulated several packages with names that hint at
"shared / generic / common" but actually mix unrelated concerns. Every
time we revisit a refactor (e.g., `shared-components` historically
bundled atomic UI primitives, business components, and rule chip
editors together), the discussion has to start from scratch. The
layering below fixes a shared vocabulary so future cleanup work
doesn't relitigate the basics.

## Layers at a glance

```
                       ┌──────────────────┐
                       │      L5 Apps     │
                       │ web · sdk · server│
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │     L4 Pages     │
                       │     builder      │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │    L3 Domain     │
                       │     editor       │
                       │business-components│
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │ L2 Infrastructure│
                       │  hooks · contexts│
                       │   gql · i18n     │
                       │  finder · widget │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │      L1 UI       │
                       │ atomic + compose │
                       │  packages/ui     │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │  L0 Primitives   │
                       │  types · helpers │
                       │ constants · dom  │
                       │ tailwind · icons │
                       └──────────────────┘
```

Each layer may depend on lower layers. Reverse direction is forbidden.
Same-layer cross-package dependencies should be rare — when they appear,
the shared logic usually belongs one layer down.

## L0 — Pure primitives (framework-free)

Foundation packages with no React, no JSX, no DOM access.

- `@usertour/types` — TypeScript types and enums
- `@usertour/helpers` — pure JS utilities
- `@usertour/constants` — z-index, storage keys, plan-feature
  matrices, and other shared runtime values
- `@usertour/tailwind` — `cn()` helper and Tailwind config
- `@usertour/dom` — DOM-only utilities (no React)
- `@usertour/icons` — icon components (re-exports remixicon + custom SVG)
- `@usertour/license` — license utilities

**Rule of thumb**: if the implementation contains `useState` or JSX, it
is not L0.

### Namespace

Every workspace package lives under `@usertour/*`. New packages
inherit the same scope — there's no audience / shape signal in the
name, so the choice never needs revisiting.

### `@usertour/types` vs `@usertour/constants`

These two are easy to confuse and have drifted in the past, so the
split is spelled out:

| Goes in `@usertour/types` | Goes in `@usertour/constants` |
|---|---|
| `type` / `interface` aliases | `export const NAME = …` runtime values |
| `enum` declarations | Lookup tables / matrices instantiating a type (`PLAN_FEATURES: Record<PlanType, PlanFeatures>`) |
| Discriminated unions, generics, type-level utilities | Magic numbers, storage keys, z-index ranges |
| Pure type-level contracts shared across packages | Default-value constants, configuration data |

**Decision heuristic** — "is this a value or a contract?"

- Delete the line, compile the project: if the type system breaks, it
  belongs in `@usertour/types`. If only runtime behaviour changes,
  it belongs in `@usertour/constants`.
- An `enum` is both a type and a value, but its primary role is the
  type contract — it lives in `@usertour/types`. A `Record<EnumKey,
  Value>` instantiation is a value — it lives in `@usertour/constants`,
  even if its type lives in `@usertour/types`.

### Package shape: P1 vs P2

Workspace packages fall into one of two shapes, driven by who consumes
them at production runtime. **Choose the shape based on the consumer
set, not aesthetics.**

| Shape | `main` field | Build step | Used by |
|---|---|---|---|
| **P1** (source-direct) | `"src/index.ts"` | None — consumers compile TS themselves | 18+ packages consumed only by bundlers (Vite, tsup, Webpack) |
| **P2** (pre-built dist) | `"./dist/index.js"` + `module` / `types` / `exports` | `tsup` produces cjs + esm + dts, pre-built before consumers | `@usertour/types`, `@usertour/helpers`, `@usertour/constants`, `@usertour/license` — the packages a NestJS Node server actually `require`s at runtime |

**Why two shapes**: NestJS's production runtime (`node dist/main`) does
ordinary CommonJS resolution against the `main` field. If that points at
a `.ts` file, Node can't load it. Bundler consumers (Vite / tsup) can
read TS source directly, so for the rest of the graph the build step
adds no value and slows dev HMR. The shapes minimize cost for each
audience.

**The sharing rule** (Layer 1):

- **Type contracts** (`type` / `interface` / `enum`) can live in
  `@usertour/types` even before they have multiple consumers — they
  cost nothing at runtime.
- **Runtime values** (constants, lookup tables, matrices) **should be
  shared as soon as a second real consumer exists**. The "second
  consumer" includes any code that hardcodes the same business contract
  values — a pricing comparison table that copies what each plan grants
  is a real consumer even if it doesn't `import` the matrix. Don't
  let drift between visible offer and enforced behaviour become a user
  trust issue; share the canonical source.
- Conversely, don't pre-emptively share when no real second consumer
  exists today and none is concretely planned. Sharing a value
  forces P1/P2 selection and pipeline plumbing — pay the cost when it
  buys reuse, not on speculation.

**P1 → P2 migration** (when a P1 package gains a Node consumer):

1. Package `package.json`: `main` → `./dist/index.js`; add `module` /
   `types` / `exports`; `dev` script → `tsup --watch`; tsup config has
   `format: ['cjs', 'esm']`, `dts: true`, explicit `entry` and `outDir`.
2. Mirror `@usertour/types` or `@usertour/helpers` as templates.
3. Add the package to root `package.json`'s `build:deps`.
4. Add the package to root `package.json`'s `dev` / `dev:web` /
   `dev:sdk` / `dev:server` filter lists so its watcher runs alongside.
5. Add `"<pkg>#build"` to `turbo.json`'s `dev.dependsOn`.
6. Add the new dep entry in every consuming `package.json`.
7. Ensure `dist/` is gitignored; don't commit the first build.

**Counter-pattern**: needing a single magic number from a P1 package
in the server is not a reason to promote the whole package. Inline the
literal value in the server (with a `// keep in sync with packages/X`
comment if drift is plausible), or wait for the second use case that
justifies the package shape change.

## L1 — UI components

React components with no business knowledge:

- `@usertour/ui` (`packages/ui/`) — single home for all shadcn-style
  primitives (`Button`, `Dialog`, `Popover`, `Input`, `Select`,
  `Calendar`, `Command`, etc., under `src/primitives/`) **plus** the
  composition UI built on top of them (`SelectPopover`, `ColorPicker`,
  `ErrorTooltip`, `DateTimePicker`, `ScaledPreviewContainer`,
  `LoadingContainer`, `LocateSelect`, `Combobox`, `InputGroup`,
  `compact-*` size variants).
- `@usertour/frame` (`packages/frame/`) — iframe-portal domain
  primitive consumed by `apps/sdk` and `packages/widget` for embedded
  rendering; kept outside `@usertour/ui` to keep those bundles isolated
  from the wider UI dep graph (see ADR 0004).
- `packages/radix/*` — Radix internals (popper, slot, compose-refs)
  consumed by `@usertour/ui` and `@usertour/frame`.

**Rule of thumb**: an L1 component must work in any business context
without knowing what context that is. It accepts data via props, never
reaches for app state, never queries the data layer.

**Counter-example**: `SelectorDialog` knows about the live-document
element selector handshake — it belongs in L3, not L1.

## L2 — Infrastructure (cross-cutting concerns)

Data access, shared contexts, internationalization, runtime engines.

- `@usertour/hooks` — Apollo / React hooks
- `@usertour/contexts` — React context providers
- `@usertour/gql` — GraphQL operations and generated types
- `@usertour/i18n` — translation bundles
- `@usertour/finder` — element finder utility
- `@usertour/assets` — static asset references
- `@usertour/widget` — SDK runtime widget engine

**Rule of thumb**: it solves "how do we get the data / how do we localize /
how do we manage state across pages" — not "how do we present a specific
business workflow".

## L3 — Domain modules

Reusable modules carrying business knowledge but not bound to a specific
page or flow.

- `@usertour/editor` — ContentEditor framework + rich-text
  editor (PopperEditor, PopperEditorMini, CodeEditor) + Actions chip
  editor + business element popovers (button / multi-choice / NPS / scale /
  star-rating). **ContentEditor and rich editor are an integral unit; they
  do not split into smaller packages.**
- `@usertour/business-components` — hosts the Conditions chip
  editor (L3) plus a handful of business components (SelectorDialog,
  ElementSelector, GoogleFontCss, AttributeCreateForm — closer to L4).
  See "Known drift" below.

**Rule of thumb**: knows about content elements, rules, segments,
attributes — but does not know which page is rendering it.

## L4 — Page-level / business composition

Pages and high-level business compositions bound to specific UI flows.

- `@usertour/builder` — flow / launcher / checklist /
  resource-center / banner builder pages

**Rule of thumb**: deleting this package would break a specific UI
workflow but leave the rest of the system intact.

## L5 — Apps

Terminal application entries.

- `apps/web` — admin UI (Vite + React)
- `apps/sdk` — embeddable JavaScript SDK
- `apps/server` — NestJS GraphQL backend (does not consume the L1–L4 UI graph)

## Known drift

The layering above is the target. Current state has a few honest gaps:

| Package | Drift | Resolution path |
|---|---|---|
| `@usertour/business-components` | Internally mixes L3 (Conditions chip editor) and L4 (SelectorDialog, ElementSelector, GoogleFontCss, AttributeCreateForm). Accepted as a deliberate "business components" grouping — splitting Conditions into a separate package would scatter the business-UI surface area without a real consumer that wants one but not the other. | None planned. Internal subdirectories (`conditions/` / `selector/` / `theme/` / `form/`) already segment by concern. |
| `@usertour/editor` | L3, but contains business element popovers that look like L4 glue. The current consensus is that ContentEditor and its element popovers are an integral unit; they live together. | No action; document as a deliberate integration. |
| L1 hook leakage (historical) | Some L1 components used to read user identity via `useCurrentUserId()` directly, pulling `@usertour/hooks` (Apollo) into the UI tree. `ColorPickerPanel` was promoted to L1 by inverting that into a `userId` prop. | Case-by-case; invert offending hooks to props at the L1 boundary. |

## Decision tree

When adding a new component, walk from the top:

```
Does it use React?
├── No → L0 (types / helpers / constants / pure utilities)
└── Yes
    ├── Single shadcn-style primitive? → @usertour/ui/src/primitives/
    ├── Composes primitives, no business concept? → @usertour/ui (rest of src/)
    ├── Cross-cutting (data / context / i18n / runtime)? → L2
    ├── Business knowledge, reusable across pages? → L3
    ├── Bound to a specific page or flow? → L4
    └── App entry point? → L5
```

## What this document does NOT cover

- Internal directory layout of individual packages.
- ContentEditor's internal architecture.

## Open follow-ups (not part of this RFC)

- Audit L1 components for hidden L2 hook dependencies (akin to the
  `ColorPickerPanel` → `userId` inversion).
