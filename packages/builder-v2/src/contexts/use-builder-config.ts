import { useContext } from 'react';
import type { BuilderProviderContextValue } from './builder-context-types';
import { BuilderProviderContext } from './builder-provider';

// Static config passed to BuilderProvider as props — webHost /
// usertourjsUrl / isWebBuilder / onSaved / shouldShowMadeWith /
// zIndex. Never changes after Provider mount.
//
// Mount-stable: reading this hook costs zero subscriptions —
// consumers re-render only when their parent does, not when store
// state changes.
//
// Preferred over `useBuilderContext()` for any component that only
// needs config. See docs/conventions/builder-context-migration.md.
export const useBuilderConfig = (): BuilderProviderContextValue['config'] => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderConfig must be used within a BuilderProvider.');
  }
  return ctx.config;
};
