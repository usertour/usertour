import { BizEventWithEvent } from '@/common/types/schema';
import { BizEvents } from '@usertour/types';
import { isUndefined } from '@usertour/helpers';

/**
 * Finds the latest step number from step seen events
 * @param bizEvents Array of business events to search through
 * @returns The latest step number or -1 if no steps were seen
 */
export const findLatestStepNumber = (bizEvents: BizEventWithEvent[] | undefined): number => {
  if (!bizEvents?.length) {
    return -1;
  }
  const latestStepSeenEvent = findLatestStepSeenEvent(bizEvents);
  if (!latestStepSeenEvent) {
    return -1;
  }
  const data = latestStepSeenEvent.data as any;

  if (isUndefined(data.flow_step_number)) {
    return -1;
  }
  return data.flow_step_number;
};

export const findLatestStepSeenEvent = (
  bizEvents: BizEventWithEvent[] | undefined,
): BizEventWithEvent | null => {
  if (!bizEvents?.length) {
    return null;
  }

  const stepSeenEvents = bizEvents
    .filter((event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return stepSeenEvents[0] ?? null;
};
