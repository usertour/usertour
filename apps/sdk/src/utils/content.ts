import { PRIORITIES } from '@usertour-ui/constants';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { Tour } from '../core/tour';

/**
 * Compares two contents based on their priority
 * @param contentA - First content to compare
 * @param contentB - Second content to compare
 * @returns Comparison result (-1, 0, or 1)
 */
export const compareContentPriorities = (
  contentA: Tour | Launcher | Checklist,
  contentB: Tour | Launcher | Checklist,
): number => {
  const priorityA = PRIORITIES.indexOf(contentA.getConfigPriority());
  const priorityB = PRIORITIES.indexOf(contentB.getConfigPriority());

  return priorityA === priorityB ? 0 : priorityA < priorityB ? -1 : 1;
};
