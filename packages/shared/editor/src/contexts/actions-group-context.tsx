import { RulesCondition } from '@usertour/types';
import { Dispatch, MutableRefObject, SetStateAction, createContext, useContext } from 'react';

export interface ActionsGroupContextValue {
  conditionType: 'and' | 'or';
  setConditionType: Dispatch<SetStateAction<'and' | 'or'>>;
  conditions: RulesCondition[];
  setNewConditions: (conditions: RulesCondition[]) => void;
  updateConditionData: (index: number, data: any) => void;
  newlyAddedIdRef: MutableRefObject<string | null>;
}
export const ActionsGroupContext = createContext<ActionsGroupContextValue | undefined>(undefined);

export function useActionsGroupContext(): ActionsGroupContextValue {
  const context = useContext(ActionsGroupContext);
  if (!context) {
    throw new Error('useActionsGroupContext must be used within a RulesProvider.');
  }
  return context;
}
