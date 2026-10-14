import type { Attribute, Content, Event } from '@usertour/types';
import type { Segment } from '@usertour/data';
import { createContext, useContext } from 'react';

interface ConditionsContextValue {
  attributes?: Attribute[];
  segments?: Segment[];
  contents?: Content[];
  currentContent?: Content;
  events?: Event[];
  isHorizontal: boolean;
  isShowIf: boolean;
  // Narrow-host mode (e.g. the 320px builder trigger sidebar). Vertical group
  // rows and nested-list rows stack their If/AND prefix ABOVE the chip instead
  // of beside it — inside a nested group the [prefix][chip] two-column layout
  // left ~70px for chip text, chopping element selectors into a one-letter
  // column. Wide hosts keep the two-column rhythm.
  narrow?: boolean;
  filterItems: string[];
  disabled: boolean;
  saveBuildUrl?: () => boolean;
  onElementChange?: (conditionIndex: number, type: string) => void;
  // Project token — required by the element selector to authorize the
  // browser-extension handshake when picking an element.
  token?: string;
  // i18n key for the "Add condition" trigger label. Lets consumers in
  // filter-shaped contexts (segment toolbars, data-table filters) say
  // "Add filter" without changing the verb everywhere else.
  addLabelKey: string;
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

// Class for the text portion of a chip Summary. Both modes wrap long
// content so the user can read the full value without opening the editor.
// We use `break-words` (overflow-wrap: break-word) rather than `break-all`:
// English / URL-like values only break inside a token when the whole token
// can't fit on a line, so phrases like "/visualization/data-analysis" stay
// readable instead of being chopped mid-word at the line edge.
export function useSummaryTextClass(): string {
  return 'min-w-0 whitespace-normal break-words';
}
