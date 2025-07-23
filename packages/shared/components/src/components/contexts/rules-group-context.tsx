import { RulesCondition } from '@usertour/types';
import { Dispatch, SetStateAction, createContext, useContext } from 'react';

export interface RulesGroupContextValue {
  conditionType: 'and' | 'or';
  setConditionType: Dispatch<SetStateAction<'and' | 'or'>>;
  conditions: RulesCondition[];
  setNewConditions: (conditions: RulesCondition[]) => void;
  updateConditionData: (index: number, data: any) => void;
}
export const RulesGroupContext = createContext<RulesGroupContextValue | undefined>(undefined);

export function useRulesGroupContext(): RulesGroupContextValue {
  const context = useContext(RulesGroupContext);
  if (!context) {
    throw new Error('useRulesGroupContext must be used within a RulesProvider.');
  }
  return context;
}
