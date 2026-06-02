// Public access surface for the builder core (the type-agnostic engine:
// store + Provider + context-access + lifecycle + mode + type registry).
// Consumers import the Provider, the access hooks, the BuilderMode types,
// and the init hook from here. The engine's internals (the store factory,
// the lifecycle hooks, the provider types) live alongside in this folder
// but are not re-exported — reach them by explicit path only from within
// core/.
export { BuilderProvider } from './builder-provider';
export type { BuilderProviderProps } from './types';
export { useBuilderMethods } from './access/use-builder-methods';
export { useBuilderConfig, useEnvironmentId, useProjectId } from './access/use-builder-config';
export { useBuilderContentRef } from './access/use-builder-content-ref';
export {
  useBuilderStore,
  useSaveState,
  useIsBusy,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
} from './access/use-builder-store';
export {
  BuilderMode,
  deriveInitialMode,
  type BuilderTriggerMode,
  type BuilderCommonMode,
  type CurrentMode,
} from './builder-mode';
export { useBuilderInit } from './lifecycle/use-builder-init';
