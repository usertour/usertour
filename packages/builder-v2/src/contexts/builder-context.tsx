// Backward-compatible barrel — preserves the original
// `from '../contexts/builder-context'` import path used by internal
// callers (content-popper / content-bubble / content-modal /
// builder-leave-guard / hooks/use-*-list / use-type-editor) and the
// indirect `from '../../contexts'` barrel used by ~60 consumer files.
//
// New code should import from the focused modules directly:
//   - BuilderProvider          → ./builder-provider
//   - useBuilderStore + selectors → ./use-builder-store
//   - useBuilderMethods        → ./use-builder-methods
//   - useBuilderConfig         → ./use-builder-config
//   - useBuilderContentRef     → ./use-builder-content-ref
//   - useBuilderContext (DEPRECATED) → ./use-builder-context
//   - BuilderContextProps etc. → ./builder-context-types
//   - BuilderMode enum + types → ./builder-mode
//
// See docs/conventions/builder-context-migration.md for the per-field
// mapping that turns `useBuilderContext` destructures into focused-hook
// calls. The legacy adapter stays until every consumer is migrated;
// PRs E-I do this in page-sized batches.
export { BuilderProvider } from './builder-provider';
export type { BuilderProviderProps } from './builder-context-types';
export { useBuilderContext } from './use-builder-context';
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
