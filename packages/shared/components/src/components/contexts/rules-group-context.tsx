import { RulesCondition } from '@usertour/types';
import { MutableRefObject, createContext, useContext } from 'react';

export interface RulesGroupContextValue {
  conditionType: 'and' | 'or';
  setConditionType: (value: 'and' | 'or') => void;
  conditions: RulesCondition[];
  setNewConditions: (conditions: RulesCondition[]) => void;
  updateConditionData: (index: number, data: any) => void;
  newlyAddedIdRef: MutableRefObject<string | null>;
}
export const RulesGroupContext = createContext<RulesGroupContextValue | undefined>(undefined);

export function useRulesGroupContext(): RulesGroupContextValue {
  const context = useContext(RulesGroupContext);
  if (!context) {
    throw new Error('useRulesGroupContext must be used within a RulesProvider.');
  }
  return context;
}
