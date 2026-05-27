# @usertour/ui

Single home for Usertour's L1 UI components — shadcn-style primitives plus
the composition layer built on top of them. No business knowledge — anything
that imports `@usertour/types` business types, `@usertour/contexts`, or
`@usertour/hooks` mutations belongs further up the layering (see
`docs/architecture/packages.md` and `docs/conventions/module-boundaries.md`).

## Layout

```
src/
├── primitives/    shadcn registry atoms — Button, Dialog, Popover, Input,
│                  Select, Calendar, Command, ... One file per primitive,
│                  flat, 1:1 with upstream shadcn. Diff this directory
│                  against upstream when syncing.
├── composites/    Components built by composing primitives — SelectPopover,
│                  ColorPicker, DateTimePicker, Combobox, the settings/
│                  scaffolding. Changing these does not drift the repo from
│                  upstream shadcn.
├── compact/       Dense-form variants for inspector / side-panel contexts —
│                  CompactSelect, CompactTabs, InlineAlert, ResizeHandle.
└── index.ts       Barrel that re-exports everything for consumers.
```

The decision tree in `docs/architecture/packages.md` codifies which directory
a new component lands in. Frame (iframe portal) is intentionally not here —
see `@usertour/frame` and ADR 0004's "Out-of-scope primitives".

## Usage

```ts
import { Button, Dialog, SelectPopover, CompactTabs } from '@usertour/ui';
```

## Adding a primitive

A new shadcn-style atom (Slider, Calendar variant, etc.):

1. Create `src/primitives/<name>.tsx`. Match the shadcn registry source where
   possible.
2. Add a re-export to `src/index.ts` under the primitives block.

## Adding a composite

A component composed from primitives:

1. Create `src/composites/<name>.tsx` (or a folder if it needs sibling files).
2. Import primitives via relative paths: `import { Button } from '../primitives/button';`
3. Add a re-export to `src/index.ts` under the composites block.

## i18n

Per `feedback_no_i18n_in_shared_ui_primitives`, this package must not import
`react-i18next` or hardcode user-visible English literals. Take labels via
required props; the consumer passes `t(...)` from its own i18n.
