// Barrel for the v2 builder Provider surface. Re-exports the public
// hooks + types so internal callers can keep using the existing
// `from '../contexts/builder-context'` / `from '../../contexts'`
// import paths.
//
// The legacy `useBuilderContext` god-adapter was retired in PR I —
// consumers split into:
//   - useBuilderStore(selector)  → state fields, one selector per field
//   - useBuilderMethods()        → saveContent / initContent /
//                                  fetchContentAndVersion /
//                                  setAutoSaveValidator (mount-stable)
//   - useBuilderConfig()         → webHost / usertourjsUrl /
//                                  isWebBuilder / onSaved /
//                                  shouldShowMadeWith / zIndex
//                                  (mount-stable)
//   - useBuilderContentRef()     → Provider-owned content <div> ref
//
// docs/conventions/builder-context-migration.md is the canonical
// per-field mapping if you need to reconstruct the old call shape.
export { BuilderProvider } from './builder-provider';
export type { BuilderProviderProps } from './builder-context-types';
export { useBuilderMethods } from './use-builder-methods';
export { useBuilderConfig } from './use-builder-config';
export { useBuilderContentRef } from './use-builder-content-ref';
export {
  useBuilderStore,
  useSaveState,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
} from './use-builder-store';
export {
  BuilderMode,
  type BuilderSelectorMode,
  type BuilderTriggerMode,
  type BuilderCommonMode,
  type CurrentMode,
} from './builder-mode';
