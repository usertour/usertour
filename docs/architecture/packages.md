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
                       │  shared-builder  │
                       └────────┬─────────┘
                                │
                       ┌────────▼─────────┐
                       │    L3 Domain     │
                       │  shared-editor   │
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
- `@usertour-packages/constants` — z-index, storage keys, etc.
- `@usertour-packages/tailwind` — `cn()` helper and Tailwind config
- `@usertour-packages/dom` — DOM-only utilities (no React)
- `@usertour-packages/icons` — icon components (re-exports remixicon + custom SVG)
- `@usertour/license` — license utilities

**Rule of thumb**: if the implementation contains `useState` or JSX, it
is not L0.

## L1 — UI components

React components with no business knowledge. Two tiers in this layer:

**Atomic UI** (one shadcn-style component per package):

- `packages/components/*` — 38 single-component packages (button,
  popover, input, select, calendar, command, etc.)
- `packages/radix/*` — Radix internals (popper, slot, primitive)

**Composition UI** (compose atomic UI into reusable secondary primitives):

- `@usertour-packages/ui` — `SelectPopover`, `ColorPicker`, `ErrorTooltip`,
  `DateTimePicker`, `ScaledPreviewContainer`, `LoadingContainer`,
  `LocateSelect`, `Combobox`, `InputGroup`, plus `compact-*` size variants.

**Rule of thumb**: an L1 component must work in any business context
without knowing what context that is. It accepts data via props, never
reaches for app state, never queries the data layer.

**Counter-example**: `SelectorDialog` knows about the live-document
element selector handshake — it belongs in L3, not L1.

## L2 — Infrastructure (cross-cutting concerns)

Data access, shared contexts, internationalization, runtime engines.

- `@usertour-packages/shared-hooks` — Apollo / React hooks
- `@usertour-packages/contexts` — React context providers
- `@usertour-packages/gql` — GraphQL operations and generated types
- `@usertour-packages/i18n` — translation bundles
- `@usertour-packages/finder` — element finder utility
- `@usertour-packages/assets` — static asset references
- `@usertour-packages/widget` — SDK runtime widget engine

**Rule of thumb**: it solves "how do we get the data / how do we localize /
how do we manage state across pages" — not "how do we present a specific
business workflow".

## L3 — Domain modules

Reusable modules carrying business knowledge but not bound to a specific
page or flow.

- `@usertour-packages/shared-editor` — ContentEditor framework + rich-text
  editor (PopperEditor, PopperEditorMini, CodeEditor) + Actions chip
  editor + business element popovers (button / multi-choice / NPS / scale /
  star-rating). **ContentEditor and rich editor are an integral unit; they
  do not split into smaller packages.**
- `@usertour-packages/business-components` — hosts the Conditions chip
  editor (L3) plus a handful of business components (SelectorDialog,
  ElementSelector, GoogleFontCss, AttributeCreateForm — closer to L4).
  See "Known drift" below.

**Rule of thumb**: knows about content elements, rules, segments,
attributes — but does not know which page is rendering it.

## L4 — Page-level / business composition

Pages and high-level business compositions bound to specific UI flows.

- `@usertour-packages/builder` — flow / launcher / checklist /
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
| `@usertour-packages/business-components` | Internally mixes L3 (Conditions chip editor) and L4 (SelectorDialog, ElementSelector, GoogleFontCss, AttributeCreateForm). Accepted as a deliberate "business components" grouping — splitting Conditions into a separate package would scatter the business-UI surface area without a real consumer that wants one but not the other. | None planned. Internal subdirectories (`conditions/` / `selector/` / `theme/` / `form/`) already segment by concern. |
| `@usertour-packages/shared-editor` | L3, but contains business element popovers that look like L4 glue. The current consensus is that ContentEditor and its element popovers are an integral unit; they live together. | No action; document as a deliberate integration. |
| L1 hook leakage (historical) | Some L1 components used to read user identity via `useCurrentUserId()` directly, pulling shared-hooks (Apollo) into the UI tree. `ColorPickerPanel` was promoted to L1 by inverting that into a `userId` prop. | Case-by-case; invert offending hooks to props at the L1 boundary. |

## Decision tree

When adding a new component, walk from the top:

```
Does it use React?
├── No → L0 (types / helpers / constants / pure utilities)
└── Yes
    ├── Single atomic shadcn-style component? → L1 atomic (packages/components/*)
    ├── Composes atomic UI, no business concept? → L1 composition (@usertour-packages/ui)
    ├── Cross-cutting (data / context / i18n / runtime)? → L2
    ├── Business knowledge, reusable across pages? → L3
    ├── Bound to a specific page or flow? → L4
    └── App entry point? → L5
```

## What this document does NOT cover

- Internal directory layout of individual packages.
- Atomic UI splitting granularity — `packages/components/*` shape is
  treated as given.
- ContentEditor's internal architecture.
- Whether all `shared-*` packages should drop the prefix — naming
  cleanup is a separate motivated decision, not driven by layering.

## Open follow-ups (not part of this RFC)

- Audit L1 components for hidden L2 hook dependencies (akin to the
  `ColorPickerPanel` → `userId` inversion).
- Decide whether the `shared-*` prefix carries meaning today; drop where
  it does not.
