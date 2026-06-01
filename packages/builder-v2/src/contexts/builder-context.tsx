// Aggregating barrel — re-exports the four public access hooks +
// BuilderMode types from this folder, plus BuilderProvider + Props
// from `../provider/` (Provider lives there post-PR-K reorg).
//
// Consumers import from this file (or via the `../../contexts/`
// index.tsx wildcard) so they don't need to know which folder owns
// which symbol. New code is welcome to import directly from the
// owning folder if it prefers explicit paths:
//
//   - useBuilderStore / useSaveState / useCanUndo / useCanRedo /
//     useUndo / useRedo  → ./use-builder-store
//   - useBuilderMethods  → ./use-builder-methods
//   - useBuilderConfig   → ./use-builder-config
//   - useBuilderContentRef → ./use-builder-content-ref
//   - BuilderMode enum + types → ./builder-mode
//   - BuilderProvider + BuilderProviderProps → ../provider/
//
// The legacy `useBuilderContext` god-adapter was retired in PR I.
// See docs/conventions/builder-context-migration.md for the per-field
// mapping if reconstructing the old call shape is needed.
export { BuilderProvider } from '../provider/builder-provider';
export type { BuilderProviderProps } from '../provider/types';
export { useBuilderMethods } from './use-builder-methods';
export { useBuilderConfig } from './use-builder-config';
export { useBuilderContentRef } from './use-builder-content-ref';
export {
  useBuilderStore,
  useSaveState,
  useIsBusy,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
} from './use-builder-store';
export {
  BuilderMode,
  type BuilderTriggerMode,
  type BuilderCommonMode,
  type CurrentMode,
} from './builder-mode';
