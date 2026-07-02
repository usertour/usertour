import { ChecklistCompletionOrder, ChecklistInitialDisplay } from '@usertour/types';
import type { ChecklistData } from '@usertour/types';

export const DEFAULT_CHECKLIST_DATA: ChecklistData = {
  buttonText: 'Get Started',
  initialDisplay: ChecklistInitialDisplay.EXPANDED,
  completionOrder: ChecklistCompletionOrder.ANY,
  preventDismissChecklist: false,
  autoDismissChecklist: false,
  items: [],
  content: [],
};
