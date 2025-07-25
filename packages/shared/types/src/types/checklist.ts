import { RulesCondition } from './contents';

export enum ChecklistInitialDisplay {
  EXPANDED = 'expanded',
  BUTTON = 'button',
}

export enum ChecklistCompletionOrder {
  ANY = 'any',
  ORDERED = 'ordered',
}

export interface ChecklistData {
  buttonText: string;
  initialDisplay: ChecklistInitialDisplay;
  completionOrder: ChecklistCompletionOrder;
  preventDismissChecklist: boolean;
  autoDismissChecklist: boolean;
  items: ChecklistItemType[];
  content: any;
}

export interface ChecklistItemType {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  isShowAnimation?: boolean;
  isVisible?: boolean;
  isClicked?: boolean;
  clickedActions: RulesCondition[];
  completeConditions: RulesCondition[];
  onlyShowTask: boolean;
  onlyShowTaskConditions: RulesCondition[];
}

export const DEFAULT_CHECKLIST_DATA: ChecklistData = {
  buttonText: 'Get Started',
  initialDisplay: ChecklistInitialDisplay.EXPANDED,
  completionOrder: ChecklistCompletionOrder.ANY,
  preventDismissChecklist: false,
  autoDismissChecklist: false,
  items: [],
  content: [],
};
