# builder-v2: migrating off `useBuilderContext`

`useBuilderContext()` is the legacy god-adapter on the v2 builder
Provider. It returns a 30+ field object built from a full-store
`useStore(s => s)` subscription, so every consumer re-renders on any
state change. New code should use four focused hooks instead.

This doc is the per-field translation table — use it when migrating
a file off `useBuilderContext()`.

## Pick the right hook

| Hook | What it returns | Subscribes? |
|---|---|---|
| `useBuilderStore(s => s.X)` | One slice of Zustand state | Yes, only to `X` |
| `useBuilderMethods()` | `saveContent` / `initContent` / `fetchContentAndVersion` / `setAutoSaveValidator` | No — mount-stable |
| `useBuilderConfig()` | `webHost` / `usertourjsUrl` / `isWebBuilder` / `onSaved` / `shouldShowMadeWith` / `zIndex` | No — mount-stable |
| `useBuilderContentRef()` | The Provider-owned `<div>` ref step content attaches to | No — useRef |

`useBuilderStore` is the only one that subscribes. The other three are
plain `useContext` reads of mount-stable values.

## Per-field mapping

State fields go through `useBuilderStore`:

| `useBuilderContext()` field | Replacement |
|---|---|
| `currentMode` | `useBuilderStore(s => s.currentMode)` |
| `setCurrentMode` | `useBuilderStore(s => s.setCurrentMode)` |
| `environmentId` | `useBuilderStore(s => s.environmentId)` |
| `setEnvironmentId` | `useBuilderStore(s => s.setEnvironmentId)` |
| `envToken` | `useBuilderStore(s => s.envToken)` |
| `currentStep` | `useBuilderStore(s => s.currentStep)` |
| `currentIndex` | `useBuilderStore(s => s.currentIndex)` |
| `isShowError` | `useBuilderStore(s => s.isShowError)` |
| `selectorOutput` | `useBuilderStore(s => s.selectorOutput)` |
| `setSelectorOutput` | `useBuilderStore(s => s.setSelectorOutput)` |
| `position` | `useBuilderStore(s => s.position)` |
| `setPosition` | `useBuilderStore(s => s.setPosition)` |
| `projectId` | `useBuilderStore(s => s.projectId)` |
| `setProjectId` | `useBuilderStore(s => s.setProjectId)` |
| `currentContent` | `useBuilderStore(s => s.currentContent)` |
| `setCurrentContent` | `useBuilderStore(s => s.setCurrentContent)` |
| `currentVersion` | `useBuilderStore(s => s.currentVersion)` |
| `setCurrentVersion` | `useBuilderStore(s => s.setCurrentVersion)` |
| `backupVersion` | `useBuilderStore(s => s.backupVersion)` |
| `currentTheme` | `useBuilderStore(s => s.currentTheme)` |
| `setCurrentTheme` | `useBuilderStore(s => s.setCurrentTheme)` |
| `isLoading` | `useBuilderStore(s => s.isLoading \|\| s.saveState.status === 'saving')` — see note |
| `setIsLoading` | `useBuilderStore(s => s.setIsLoading)` |

Methods go through `useBuilderMethods()`:

| `useBuilderContext()` field | Replacement |
|---|---|
| `saveContent` | `useBuilderMethods().saveContent` |
| `initContent` | `useBuilderMethods().initContent` |
| `fetchContentAndVersion` | `useBuilderMethods().fetchContentAndVersion` |
| `setAutoSaveValidator` | `useBuilderMethods().setAutoSaveValidator` |

Config goes through `useBuilderConfig()`:

| `useBuilderContext()` field | Replacement |
|---|---|
| `webHost` | `useBuilderConfig().webHost` |
| `usertourjsUrl` | `useBuilderConfig().usertourjsUrl` |
| `isWebBuilder` | `useBuilderConfig().isWebBuilder` |
| `onSaved` | `useBuilderConfig().onSaved` |
| `shouldShowMadeWith` | `useBuilderConfig().shouldShowMadeWith` |
| `zIndex` | `useBuilderConfig().zIndex` |

The DOM ref goes through `useBuilderContentRef()`:

| `useBuilderContext()` field | Replacement |
|---|---|
| `contentRef` | `useBuilderContentRef()` |

## Notes

### `isLoading` overload

`useBuilderContext().isLoading` is `state.isLoading || saveState.status === 'saving'` — a legacy
overload that merges two distinct concepts (initial content load vs
save-in-flight). The migration table above preserves the overload for
back-compat, but every call site should ultimately pick which one it
actually wants:

- "Disable the form while the version is in flight" → `useSaveState().status === 'saving'`
- "Show a spinner during initial content fetch" → `useBuilderStore(s => s.isLoading)`

PR I plans to drop the overload from any new code paths; consumers
migrated before that get the merged selector to preserve current
behavior.

### Picking multiple fields at once

Default to one selector per field — the perf cost is negligible and
each line documents what the component actually uses.

If you genuinely want to read 3+ fields at once and the resulting
re-render isn't tightly scoped (e.g. a layout container that orchestrates
several children), use `useShallow` from `zustand/react/shallow`:

```ts
import { useShallow } from 'zustand/react/shallow';

const { currentContent, currentVersion, projectId } = useBuilderStore(
  useShallow(s => ({
    currentContent: s.currentContent,
    currentVersion: s.currentVersion,
    projectId: s.projectId,
  })),
);
```

Without `useShallow`, returning a new object literal every render
causes re-render-on-every-render — zustand's referential equality
check sees a new object.

### When a hook is shared by per-type editors

`use-type-editor.ts`, `use-flow-editor.ts`, etc. each used to call
`useBuilderContext()` internally for cross-type state. Migrating those
hooks gives the biggest perf payoff because every consumer of the
per-type hook inherits the saving — fix them as part of the per-page
PRs (E-H), not separately.

## Migration order

| PR | Scope |
|---|---|
| D | Scaffold the three new hooks + deprecate adapter + migrate `use-type-editor.ts` + Banner pilot |
| E | Flow page + `use-flow-editor.ts` (12 useBuilderContext refs) |
| F | Checklist page + `use-checklist-editor.ts` |
| G | Launcher page + `use-launcher-editor.ts` |
| H | ResourceCenter page + `use-resource-center-editor.ts` |
| I | Cross-type consumers (`components/`, `shell/`, `hooks/`) + delete `useBuilderContext` + the adapter file |
