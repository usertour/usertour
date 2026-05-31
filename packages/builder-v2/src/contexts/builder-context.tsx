// Backward-compatible barrel — preserves the original
// `from '../contexts/builder-context'` import path used by ~9 internal
// callers (content-popper / content-bubble / content-modal /
// builder-leave-guard / hooks/use-*-list / use-type-editor) so PR B's
// god-file split doesn't ripple into unrelated diffs.
//
// New code should import from the more focused modules directly:
//   - BuilderProvider          → ./builder-provider
//   - useBuilderContext        → ./use-builder-context
//   - useBuilderStore + selectors → ./use-builder-store
//   - BuilderContextProps etc. → ./builder-context-types
//   - BuilderMode enum + types → ./builder-mode
export { BuilderProvider } from './builder-provider';
export type { BuilderProviderProps } from './builder-context-types';
export { useBuilderContext } from './use-builder-context';
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
