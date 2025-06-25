import { PRIORITIES } from '@usertour-ui/constants';
import { Checklist } from '../core/checklist';
import { Launcher } from '../core/launcher';
import { Tour } from '../core/tour';
import { BizEvents, ChecklistItemType } from '@usertour-ui/types';

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

export const checklistIsShowAnimation = (
  checklist: Checklist,
  checklistItem: ChecklistItemType,
) => {
  const latestSession = checklist.getContent().latestSession;
  if (!latestSession?.bizEvent?.length) {
    return false;
  }

  const bizEvents = latestSession.bizEvent;

  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const hiddenOrSeenEvents = bizEvents.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_HIDDEN ||
      event.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );

  if (hiddenOrSeenEvents.length === 0) {
    return false;
  }

  // Get the latest hidden or seen event
  const latestHiddenOrSeenEvent = hiddenOrSeenEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });

  // If the latest event is CHECKLIST_SEEN, don't show animation
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return false;
  }

  // If the latest event is CHECKLIST_HIDDEN, check if there's a CHECKLIST_TASK_COMPLETED
  // event for this specific item that occurred after the hidden event
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_HIDDEN) {
    const taskCompletedEvents = bizEvents.filter(
      (event) =>
        event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
        event.data.checklist_task_id === checklistItem.id,
    );

    if (taskCompletedEvents.length === 0) {
      return false;
    }

    // Get the latest task completed event for this item
    const latestTaskCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });

    // Check if the task was completed after the checklist was hidden
    const hiddenTime = new Date(latestHiddenOrSeenEvent.createdAt);
    const completedTime = new Date(latestTaskCompletedEvent.createdAt);

    return completedTime > hiddenTime;
  }

  return false;
};
