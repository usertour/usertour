// Public access surface for the builder core (the type-agnostic engine:
// store + Provider + context-access + lifecycle + type registry). Consumers
// import the Provider, the access hooks, and the init hook from here. The
// engine's internals (the store factory, the lifecycle hooks, the provider
// types) live alongside in this folder but are not re-exported — reach them by
// explicit path only from within core/.
export { BuilderProvider } from '@/pages/contents/components/builder/core/builder-provider';
export type { BuilderProviderProps } from '@/pages/contents/components/builder/core/types';
export { useBuilderMethods } from '@/pages/contents/components/builder/core/access/use-builder-methods';
export {
  useBuilderConfig,
  useEnvironmentId,
  useProjectId,
} from '@/pages/contents/components/builder/core/access/use-builder-config';
export { useBuilderContentRef } from '@/pages/contents/components/builder/core/access/use-builder-content-ref';
export {
  useBuilderStore,
  useSaveState,
  useIsBusy,
  useCanUndo,
  useCanRedo,
  useUndo,
  useRedo,
} from '@/pages/contents/components/builder/core/access/use-builder-store';
export { useBuilderInit } from '@/pages/contents/components/builder/core/lifecycle/use-builder-init';
