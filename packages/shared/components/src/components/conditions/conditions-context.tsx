import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import type { Attribute, Content, Event, Segment } from '@usertour/types';
import { createContext, useContext } from 'react';

// Translator signature — small subset of i18next's `t` that this component
// tree relies on. Consumers pass their own (e.g., the one from
// `useTranslation()` in apps/web) so this package stays free of an i18n dep.
export type ConditionsTranslator = (
  key: string,
  options?: Record<string, unknown> & { count?: number },
) => string;

const fallbackTranslate: ConditionsTranslator = (key) => key;

interface ConditionsContextValue {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  events?: Event[];
  isHorizontal: boolean;
  isShowIf: boolean;
  filterItems: string[];
  disabled: boolean;
  baseZIndex: number;
  saveBuildUrl?: () => boolean;
  onElementChange?: (conditionIndex: number, type: string) => void;
  // Project token — required by the element selector to authorize the
  // browser-extension handshake when picking an element.
  token?: string;
  // Translator. When omitted, keys pass through unchanged so the tree still
  // renders something (useful for tests / runtime contexts without i18n).
  t: ConditionsTranslator;
}

const ConditionsContext = createContext<ConditionsContextValue | undefined>(undefined);

export const ConditionsProvider = ConditionsContext.Provider;

export function useConditionsContext(): ConditionsContextValue {
  const ctx = useContext(ConditionsContext);
  if (!ctx) {
    throw new Error('useConditionsContext must be used inside <ConditionsProvider>.');
  }
  return ctx;
}

// Convenience hook so type editors don't have to destructure the whole context
// just to read the translator.
export function useConditionsT(): ConditionsTranslator {
  const ctx = useContext(ConditionsContext);
  return ctx?.t ?? fallbackTranslate;
}

// Class for the text portion of a chip Summary. Horizontal mode keeps a
// single-line truncate to fit the wrap-flow rhythm; vertical mode wraps
// long content (break-all) so the user sees the full condition without
// hovering — mirrors v1's `text-wrap break-all` chip in the autostart
// rules vertical layout.
export function useSummaryTextClass(): string {
  const ctx = useContext(ConditionsContext);
  return ctx?.isHorizontal ? 'min-w-0 truncate' : 'min-w-0 whitespace-normal break-all';
}

// z-index helper. Matches v1 useRulesZIndex offsets so popovers / dropdowns
// stack consistently with the rest of the surrounding chrome.
export function useConditionsZIndex() {
  const ctx = useContext(ConditionsContext);
  const baseZIndex = ctx?.baseZIndex ?? WebZIndex.RULES;
  return {
    popover: baseZIndex + RulesZIndexOffset.POPOVER,
    dropdown: baseZIndex + RulesZIndexOffset.DROPDOWN,
    combobox: baseZIndex + RulesZIndexOffset.COMBOBOX,
    error: baseZIndex + RulesZIndexOffset.ERROR,
  };
}
