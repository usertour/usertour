import type { ChecklistCompletionOrder } from '../constants/checklist-completion-order.constant';
import type { ChecklistInitialDisplay } from '../constants/checklist-initial-display.constant';
import type { ChecklistItemType } from './checklist-item.type';

export interface ChecklistData {
  buttonText: string;
  initialDisplay: ChecklistInitialDisplay;
  completionOrder: ChecklistCompletionOrder;
  preventDismissChecklist: boolean;
  items: ChecklistItemType[];
  content: any;
}
