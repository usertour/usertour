import { Attribute, Content, Segment } from '@usertour-ui/types';
import { createContext, useContext } from 'react';

// Move interfaces to context file
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
}

// Create and export context
export const RulesContext = createContext<RulesContextValue | undefined>(undefined);

// Move hook to context file
export function useRulesContext(): RulesContextValue {
  const context = useContext(RulesContext);
  if (!context) {
    throw new Error('useRulesContext must be used within a RulesProvider.');
  }
  return context;
}
