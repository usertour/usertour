import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import type { Attribute, Content, ContentVersion, Segment, Step } from '@usertour/types';
import { createContext, useContext } from 'react';

// Translator signature — small subset of i18next's `t` that this component
// tree relies on. Consumers pass their own (e.g., the one from
// `useTranslation()` in apps/web) so this package stays free of an i18n
// dep at the type level.
export type ActionsTranslator = (
  key: string,
  options?: Record<string, unknown> & { count?: number },
) => string;

const fallbackTranslate: ActionsTranslator = (key) => key;

interface ActionsContextValue {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  currentVersion?: ContentVersion;
  currentStep?: Step;
  // Project token — required by editors that pick into the live document
  // (e.g., navigate URL with user-attribute insertion).
  token?: string;
  // createStep is passed straight through to the step-goto editor so it can
  // add a new step on the fly from the dropdown's "Add new step" submenu.
  createStep?: (
    currentVersion: ContentVersion,
    sequence: number,
    stepType?: string,
    duplicateStep?: Step,
  ) => Promise<Step | undefined>;
  filterItems: string[];
  disabled: boolean;
  baseZIndex: number;
  t: ActionsTranslator;
  // i18n key for the "Add action" trigger label. Lets consumers in
  // event-shaped contexts (button click, multiple choice option) override
  // verb wording without touching every consumer.
  addLabelKey: string;
}

const ActionsContext = createContext<ActionsContextValue | undefined>(undefined);

export const ActionsProvider = ActionsContext.Provider;

export function useActionsContext(): ActionsContextValue {
  const ctx = useContext(ActionsContext);
  if (!ctx) {
    throw new Error('useActionsContext must be used inside <ActionsProvider>.');
  }
  return ctx;
}

// Convenience hook so type editors don't have to destructure the whole
// context just to read the translator.
export function useActionsT(): ActionsTranslator {
  const ctx = useContext(ActionsContext);
  return ctx?.t ?? fallbackTranslate;
}

// Class for the text portion of a chip Summary. Mirrors conditions —
// wraps long content so the user can read the full value without opening
// the editor.
export function useSummaryTextClass(): string {
  return 'min-w-0 whitespace-normal break-words';
}

// z-index helper. Matches the Conditions component offsets so popovers /
// dropdowns stack consistently with the rest of the surrounding chrome.
export function useActionsZIndex() {
  const ctx = useContext(ActionsContext);
  const baseZIndex = ctx?.baseZIndex ?? WebZIndex.RULES;
  return {
    popover: baseZIndex + RulesZIndexOffset.POPOVER,
    dropdown: baseZIndex + RulesZIndexOffset.DROPDOWN,
    combobox: baseZIndex + RulesZIndexOffset.COMBOBOX,
    error: baseZIndex + RulesZIndexOffset.ERROR,
  };
}
