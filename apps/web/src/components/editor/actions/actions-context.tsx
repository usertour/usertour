import type { Attribute, Content, ContentVersion, Step } from '@usertour/types';
import type { Segment } from '@usertour/data';
import { createContext, useContext } from 'react';

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

// Class for the text portion of a chip Summary. Mirrors conditions —
// wraps long content so the user can read the full value without opening
// the editor.
export function useSummaryTextClass(): string {
  return 'min-w-0 whitespace-normal break-words';
}
