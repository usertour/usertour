import { useContext } from 'react';
import type { BuilderProviderContextValue } from '../types';
import { BuilderProviderContext } from '../builder-provider';

// Static config passed to BuilderProvider as props — onSaved /
// shouldShowMadeWith / zIndex / environmentId / projectId. Never
// changes after Provider mount.
//
// Mount-stable: reading this hook costs zero subscriptions —
// consumers re-render only when their parent does, not when store
// state changes.
export const useBuilderConfig = (): BuilderProviderContextValue['config'] => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderConfig must be used within a BuilderProvider.');
  }
  return ctx.config;
};

// Convenience selectors for the two workspace identifiers. They live in
// config (not the draft store) because they're fixed at Provider mount
// from props and never change for its lifetime — ambient identity, not
// mutable builder state. Reading them costs zero store subscriptions.
export const useEnvironmentId = (): string => useBuilderConfig().environmentId;
export const useProjectId = (): string => useBuilderConfig().projectId;
