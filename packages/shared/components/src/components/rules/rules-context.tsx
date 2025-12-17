import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import { Attribute, Content, Segment } from '@usertour/types';
import { createContext, useContext } from 'react';

interface RulesContextValue {
  isHorizontal: boolean;
  isShowIf: boolean;
  filterItems: string[];
  addButtonText: string;
  attributes: Attribute[] | undefined;
  segments: Segment[] | undefined;
  contents: Content[];
  currentContent?: Content | undefined;
  saveBuildUrl?: () => boolean;
  onElementChange?: (conditionIndex: number, type: string) => void;
  token: string;
  disabled: boolean;
  baseZIndex: number;
}

export const RulesContext = createContext<RulesContextValue | undefined>(undefined);

export function useRulesContext(): RulesContextValue {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error('useRulesContext must be used within a RulesProvider.');
  }
  return context;
}

/**
 * Hook to get z-index values for rules components
 * Falls back to default z-index when used outside RulesContext (e.g., RulesWait)
 */
export function useRulesZIndex() {
  const context = useContext(RulesContext);
  const baseZIndex = context?.baseZIndex ?? WebZIndex.RULES;

  return {
    popover: baseZIndex + RulesZIndexOffset.POPOVER,
    dropdown: baseZIndex + RulesZIndexOffset.DROPDOWN,
    combobox: baseZIndex + RulesZIndexOffset.COMBOBOX,
    error: baseZIndex + RulesZIndexOffset.ERROR,
  };
}
