import { useContext } from 'react';
import type { BuilderProviderContextValue } from '@/pages/contents/components/builder/core/types';
import { BuilderProviderContext } from '@/pages/contents/components/builder/core/builder-provider';

// Imperative methods exposed by BuilderProvider — saveContent /
// fetchContentAndVersion / setAutoSaveValidator.
//
// Mount-stable: the Provider memoizes the methods object on its three
// stable method identities, so the returned object keeps one reference
// for the Provider lifetime. Reading this hook costs zero subscriptions
// — consumers re-render only when their parent does, not when store
// state changes.
export const useBuilderMethods = (): BuilderProviderContextValue['methods'] => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderMethods must be used within a BuilderProvider.');
  }
  return ctx.methods;
};
