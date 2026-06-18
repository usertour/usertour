import type { ThemeTypesSetting } from '@usertour/types';
import { createContext, useContext } from 'react';

interface BuilderContextValue {
  // Raw, editable settings: drives `visibleWhen` predicates and stores 'Auto'
  // sentinels picked by the user.
  activeSettings: ThemeTypesSetting;
  // Settings post-`convertSettings`: every Auto sentinel resolved to a real
  // color. Used by ColorField to display the Auto fallback color, and by
  // schema fields' optional `autoFallback` overrides.
  finalSettings: ThemeTypesSetting;
  getField: <T = unknown>(path: string) => T | undefined;
  setField: (path: string, value: unknown) => void;
  isReadOnly: boolean;
  // Whether the project's plan unlocks custom CSS / custom fonts. When false,
  // schema fields flagged `requiresCustomCss` render an upsell instead of an
  // editor. Purely the UI affordance — the server strips customCss when
  // shipping the theme to the SDK regardless.
  canUseCustomCss: boolean;
}

const BuilderContext = createContext<BuilderContextValue | null>(null);

export const BuilderProvider = BuilderContext.Provider;

export function useBuilderContext(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error('useBuilderContext must be used inside <BuilderProvider>');
  }
  return ctx;
}
