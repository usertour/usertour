import { useContext } from 'react';
import type { BuilderProviderContextValue } from '../provider/types';
import { BuilderProviderContext } from '../provider/builder-provider';

// Imperative methods exposed by BuilderProvider — saveContent /
// initContent / fetchContentAndVersion / setAutoSaveValidator.
//
// Mount-stable: the Provider pins method identity via methodsRef +
// useMemo([]) on mount, so the returned object is the same reference
// for the entire Provider lifetime. Reading this hook costs zero
// subscriptions — consumers re-render only when their parent does,
// not when store state changes.
export const useBuilderMethods = (): BuilderProviderContextValue['methods'] => {
  const ctx = useContext(BuilderProviderContext);
  if (!ctx) {
    throw new Error('useBuilderMethods must be used within a BuilderProvider.');
  }
  return ctx.methods;
};
