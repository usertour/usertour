import { DEFAULT_CHECKLIST_DATA } from '@usertour/constants';
import type { ChecklistData, ChecklistItemType } from '@usertour/types';
import { paragraph, row } from './content';

const task = (id: string, name: string, isCompleted: boolean): ChecklistItemType => ({
  id,
  name,
  isCompleted,
  isVisible: true,
  clickedActions: [],
  completeConditions: [],
  onlyShowTask: false,
  onlyShowTaskConditions: [],
});

/** Three tasks, the first one done. */
export const onboardingChecklist: ChecklistData = {
  ...DEFAULT_CHECKLIST_DATA,
  content: [row(paragraph('Get set up in three steps.'))],
  items: [
    task('invite', 'Invite your team', true),
    task('connect', 'Connect a data source', false),
    task('publish', 'Publish your first flow', false),
  ],
};

/** The same checklist with every task done. */
export const finishedChecklist: ChecklistData = {
  ...onboardingChecklist,
  items: onboardingChecklist.items.map((item) => ({ ...item, isCompleted: true })),
};
