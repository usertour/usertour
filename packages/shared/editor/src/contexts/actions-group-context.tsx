import { Dispatch, SetStateAction, createContext, useContext } from "react";
import { RulesCondition } from "@usertour-ui/types";

export interface ActionsGroupContextValue {
  conditionType: "and" | "or";
  setConditionType: Dispatch<SetStateAction<"and" | "or">>;
  conditions: RulesCondition[];
  setNewConditions: (conditions: RulesCondition[]) => void;
  updateConditionData: (index: number, data: any) => void;
}
export const ActionsGroupContext = createContext<
  ActionsGroupContextValue | undefined
>(undefined);

export function useActionsGroupContext(): ActionsGroupContextValue {
  const context = useContext(ActionsGroupContext);
  if (!context) {
    throw new Error(
      `useActionsGroupContext must be used within a RulesProvider.`
    );
  }
  return context;
}
