# 0004: Collapse per-atom packages into `@usertour/ui`

- **Date:** 2026-05-27
- **Status:** Accepted (Phases 1–4 landed)

## Context

`packages/components/` held 38 shadcn-style atom packages (`button`,
`input`, `dialog`, `popover`, `select`, `command`, ...) plus a `ui`
aggregator package. Each atom was its own pnpm workspace package with:

- its own `package.json` listing radix-ui / cva / cmdk / etc. deps
- its own `tsup` build pipeline
- its own `tsconfig.json` / `tsconfig.node.json` / `vite.config.ts`
- `"private": true` (never published)

The aggregator `@usertour/ui` listed 25 of those atoms as workspace
dependencies but did not re-export them — it only exposed compound
components built on top (`SelectPopover`, `ColorPicker`,
`DateTimePicker`, `ScaledPreviewContainer`, the `settings/` framework,
etc.). So consumers that wanted both a primitive and a compound (which
is most consumers) imported from both `@usertour/<atom>` *and*
`@usertour/ui`:

- `apps/web` imports `@usertour/button` in 169 files, `@usertour/tooltip`
  in 94, `@usertour/input` in 87, `@usertour/popover` in 43,
  `@usertour/card` in 45 — ~650 atom-import sites across the monorepo
- `packages/builder/package.json` lists 25 separate `@usertour/<atom>`
  workspace deps; `packages/editor` lists 23; `packages/business-components`
  lists 22

This shape carried no current benefit:

- **No independent versioning** — everything ships private at `0.0.0`
- **No selective consumer** — every downstream package depends on most
  of the atom set anyway
- **No internal isolation pressure** — no atom is consumed without
  another atom in the same render tree
- **No upstream shadcn convention to follow** — shadcn was always
  copy-into-project; the per-component package shape was a brief
  community misreading. Modern shadcn projects keep one
  `components/ui/` directory with all primitives flat in it.

And it carried real recurring costs:

- 38 × `package.json` to update when bumping a peer dep
- 38 × `pnpm install` workspace-link overhead, 38 × tsup pipelines
  contributing to turbo orchestration time
- Per-package `node_modules` symlink farms and stale `dist/` folders
- 25-line `dependencies` blocks in downstream packages, expanded by
  hand whenever a new atom is introduced
- Inter-atom dependencies (alert-dialog→button, calendar→button,
  command→dialog, form→label) cross workspace boundaries when they
  would naturally be local file imports

## Decision

Collapse all 38 atom packages plus `use-toast` (functionally an atom,
even though its name is hook-shaped) into `@usertour/ui` as a single
package. The atom source becomes `packages/components/ui/src/primitives/<atom>.{tsx,ts}`
— one file per primitive, flat, mirroring the shadcn registry 1:1.

`@usertour/ui` internally organises into three concerns:

- `src/primitives/` — shadcn registry atoms (changing files here is
  what aligns this repo against upstream shadcn)
- `src/ui/` — compound components built on primitives (combobox,
  date-range-picker, color-picker, settings scaffolding, ...)
- `src/compact/` — dense-form variants of primitives for inspector /
  side-panel contexts (`compact-tabs`, `inline-alert`, `resize-handle`)

Downstream packages and apps import everything from `@usertour/ui`
directly. The 38 atom packages plus `use-toast` are deleted from the
workspace.

## Migration plan

Done as three independently-revertable phases. Each phase leaves the
tree typecheck-clean.

### Phase 1 — collapse + shim (landed)

1. Move 40 source files (38 atoms + `use-toast` + `toggle-group` co-file)
   into `packages/components/ui/src/primitives/`. Rename `Frame.tsx` to
   `frame.tsx` for kebab-case consistency. Delete dead `button/utils.ts`
   (held unreferenced `formatDate` / `absoluteUrl` helpers).
2. Update `packages/components/ui/src/index.ts` to re-export every
   primitive (`export * from './primitives/<atom>'`), with a precision
   carve-out for `Skeleton` (the primitive name collides with compound
   `ListSkeleton` exports — keep the primitive explicit, let the
   compound module shadow).
3. Rewrite the 4 inter-atom imports inside `primitives/` to relative
   paths (`./button`, `./dialog`, `./label`) so primitives don't take a
   workspace-package detour through `@usertour/ui` itself.
4. Rewrite `@usertour/ui` internal imports (`src/ui/*`, `src/compact/*`,
   `src/ui/settings/*`, etc.) from `@usertour/<atom>` to relative
   `../primitives/<atom>` (or `../../primitives/<atom>` for nested
   subdirs). Avoids `@usertour/ui` depending on its own
   shim-redirected packages.
5. Update `@usertour/ui/package.json`: drop the 23 atom workspace deps,
   add the union of atom third-party deps (all required `@radix-ui/*`,
   `cmdk`, `recharts`, `framer-motion`, `sonner`, `clsx`, `cva`).
6. Convert each of the 39 atom `packages/components/<atom>/` to a thin
   shim:

   ```ts
   // packages/components/<atom>/src/index.ts
   export * from '@usertour/ui';
   ```

   `package.json` shrinks to a single `@usertour/ui` dep.

After Phase 1: zero consumer imports change, every existing `from '@usertour/button'`
call site continues to work through the shim, `tsc --noEmit` green on
`@usertour/ui`, `apps/web`, `packages/{builder,editor,business-components}`,
sample shims; `vite build` for `apps/web` produces a clean bundle.

### Phase 2 — sweep imports (planned)

Codemod ~650 import sites:

```
- from '@usertour/button'    → from '@usertour/ui'
- from '@usertour/dialog'    → from '@usertour/ui'
- ... (one substitution per atom name)
```

Strip `@usertour/<atom>` workspace deps from each consumer's
`package.json` (`apps/{web,sdk}`, `packages/{builder,editor,business-components}`,
plus a handful of other consumers).

### Phase 3 — delete shims (planned)

Remove the 39 `packages/components/<atom>/` directories. Update
`pnpm-workspace.yaml` if any explicit `packages/components/<atom>`
references remain (none expected — the glob covers them).

### Phase 4 — flatten the now-vestigial `packages/components/` drawer

After Phase 3 the `packages/components/` directory holds exactly two
packages (`ui/` + `frame/`). The drawer existed to group the 38 atom
packages; with the atoms gone, it's a single level of nesting with no
remaining semantic load — `@usertour/ui` and `@usertour/frame` sit at
the same logical level as `@usertour/business-components`,
`@usertour/builder`, `@usertour/editor`, etc. in L1-L5 layering, but
were one folder deeper than their peers.

Move both up to `packages/` root via `git mv`, delete the empty
`packages/components/` directory, replace the `packages/components/*`
glob in `pnpm-workspace.yaml` with explicit `packages/ui` +
`packages/frame` entries. `packages/radix/*` stays as a glob — that
drawer holds three fork-of-radix-internals packages with distinct
provenance from our own UI code, and the grouping does carry meaning.

No source code changes — imports are by package name, not path.

## Why staged rather than big-bang

Phase 1 alone is ~150 file touches and a -5000 LOC diff (mostly
`pnpm-lock.yaml` shrinking by ~1400 lines as 39 atoms stop carrying
their own dep trees). Phase 2 adds ~650 single-line import rewrites
across the codebase. Bundling these into one PR produces a ~1000-file
diff that nobody can usefully review. Staged also means a regression
in Phase 2 only requires a partial revert.

The shim pattern keeps the intermediate state production-runnable —
the branch is shippable after Phase 1.

## Out-of-scope primitives

`@usertour/frame` (`packages/frame/`) is **not** merged into
`@usertour/ui`, despite originally sitting under `packages/components/`.
Reasons:

- It is not a shadcn primitive. It's an iframe-portal helper for
  embedded-widget rendering — outside the shadcn registry.
- Its only consumers are `apps/sdk` and `packages/widget` — both
  bundle-size-sensitive embedded products. Routing them through
  `@usertour/ui` would transitively pull ~30 `@radix-ui/*` packages
  plus `cmdk` / `recharts` / `framer-motion` / `sonner` into the sdk
  bundle. Without `"sideEffects": false` on `@usertour/ui`, bundlers
  treat each transitive module conservatively and tree-shaking
  guarantees weaken in dev/pre-bundle.

So `@usertour/frame` stays a real standalone package (not a shim).
sdk/widget keep `from '@usertour/frame'` imports and their lean dep
graphs. Phase 1 briefly placed it in `primitives/`; Phase 1.5 corrects
the misclassification before Phase 2 begins.

## Invariants

- **`src/primitives/` mirrors shadcn registry**. To diff against
  upstream shadcn, look in `src/primitives/`. New shadcn-style
  primitives go here, flat, one file each. No subdirectories.
  Non-shadcn UI primitives (like `Frame`) stay in their own packages
  outside `@usertour/ui`.
- **`src/ui/` may import from `src/primitives/` via relative paths**;
  the reverse is forbidden. Primitives are independently
  shadcn-compliant; compounds depend on primitives, not vice versa.
- **Inter-primitive imports use relative paths** (`./button`,
  `./dialog`), not `@usertour/ui`. Self-import via package name causes
  bundler / TypeScript project-graph confusion.
- **Atom shims (during Phase 1/2) re-export with `export *`**, not
  precise re-exports. Their job is forwarding compatibility, not API
  curation.

## Alternatives considered

- **Keep the 38-package structure, just add a barrel re-export from
  `@usertour/ui`.** Would let consumers stop importing atoms directly
  without the package collapse. Rejected: doesn't address the per-atom
  `package.json` / `tsup` / `pnpm install` cost, doesn't address the
  3-tier dependency confusion (consumers wouldn't know whether to import
  `Button` from `@usertour/button` or `@usertour/ui`), doesn't bring
  the layout in line with modern shadcn.
- **Big-bang single PR.** See "Why staged" above — ~1000-file diff is
  unreviewable.
- **Sub-categorise primitives into folders** (`primitives/overlay/`,
  `primitives/form/`, `primitives/disclosure/`, ...). Rejected: breaks
  the shadcn 1:1 mapping, adds search friction, and 40 files flat is
  navigable without classification.

## Consequences

- `@usertour/ui/package.json` becomes the single home for ~30
  `@radix-ui/*` deps plus `cmdk` / `recharts` / `framer-motion` /
  `sonner`. Centralised dep bumps.
- The "atomic vs composition" L1 sub-tier in
  `docs/architecture/packages.md` disappears.
- Future shadcn upstream sync becomes one PR per primitive, touching
  exactly `src/primitives/<atom>.tsx`.
- `apps/sdk` (which never imported any atom) is unaffected.

## Implementation reference

Phase 1 landed on `feat/v0.8.3` (commit TBD). Phase 2/3 tracked in
follow-up branches.
