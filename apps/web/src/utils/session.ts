import { BizEvent, BizEvents, EventAttributes } from '@usertour/types';

/**
 * Deduplicates answer events by QUESTION_CVID, keeping the latest event for each unique question.
 * Events without QUESTION_CVID are skipped.
 *
 * @param bizEvents - Array of business events to process
 * @returns Array of deduplicated answer events, with only the latest event for each QUESTION_CVID
 */
export const deduplicateAnswerEvents = (bizEvents: BizEvent[] | undefined | null): BizEvent[] => {
  if (!bizEvents || bizEvents.length === 0) {
    return [];
  }

  // Use Map to deduplicate by QUESTION_CVID, keeping the latest event based on createdAt
  const eventMap = new Map<string, BizEvent>();
  for (const bizEvent of bizEvents) {
    // Filter to only process QUESTION_ANSWERED events
    if (bizEvent.event?.codeName !== BizEvents.QUESTION_ANSWERED) {
      continue;
    }

    const questionCvid = bizEvent.data?.[EventAttributes.QUESTION_CVID];
    if (!questionCvid) {
      // Skip events without QUESTION_CVID
      continue;
    }

    const existingEvent = eventMap.get(questionCvid);
    if (!existingEvent) {
      // First occurrence of this QUESTION_CVID
      eventMap.set(questionCvid, bizEvent);
    } else {
      // Compare createdAt timestamps and keep the latest one
      const existingTime = new Date(existingEvent.createdAt).getTime();
      const currentTime = new Date(bizEvent.createdAt).getTime();
      if (currentTime > existingTime) {
        eventMap.set(questionCvid, bizEvent);
      }
    }
  }

  return Array.from(eventMap.values()).sort((a, b) => {
    const stepNumberA = a.data?.[EventAttributes.FLOW_STEP_NUMBER];
    const stepNumberB = b.data?.[EventAttributes.FLOW_STEP_NUMBER];

    // Handle cases where FLOW_STEP_NUMBER might be missing or undefined
    if (stepNumberA === undefined && stepNumberB === undefined) {
      return 0;
    }
    if (stepNumberA === undefined) {
      return 1; // Put undefined values at the end
    }
    if (stepNumberB === undefined) {
      return -1; // Put undefined values at the end
    }

    // Convert to numbers and sort ascending
    const numA = Number(stepNumberA);
    const numB = Number(stepNumberB);
    return numA - numB;
  });
};
