import {
  Attribute,
  BizEvent,
  BizEvents,
  ContentDataType,
  EventAttributes,
  flowReasonTitleMap,
} from '@usertour/types';
import { ContentEditorElementType, contentTypesConfig } from '@usertour-packages/shared-editor';
import { formatDistanceStrict } from 'date-fns';

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

/**
 * Extract question answer value from answer event data
 * Supports different question types: STAR_RATING, SCALE, NPS, MULTIPLE_CHOICE, MULTI_LINE_TEXT, etc.
 *
 * @param answerEvent - Business event containing question answer data
 * @returns Formatted string representation of the answer value
 */
export const getQuestionAnswerValue = (answerEvent: BizEvent): string => {
  const questionType = answerEvent.data?.question_type;

  switch (questionType) {
    case ContentEditorElementType.STAR_RATING:
    case ContentEditorElementType.SCALE:
    case ContentEditorElementType.NPS:
      return answerEvent.data?.number_answer?.toString() || '';
    case ContentEditorElementType.MULTIPLE_CHOICE:
      if (Array.isArray(answerEvent.data?.list_answer)) {
        return answerEvent.data.list_answer.join('; ');
      }
      return answerEvent.data?.list_answer || answerEvent.data?.text_answer || '';
    case ContentEditorElementType.MULTI_LINE_TEXT:
    case ContentEditorElementType.SINGLE_LINE_TEXT:
      return (answerEvent.data?.text_answer || '').replace(/\n/g, ' ');
    default:
      return (answerEvent.data?.text_answer || '').replace(/\n/g, ' ');
  }
};

/**
 * Events that should display flow step information
 */
const FLOW_STEP_DISPLAY_EVENTS = [
  BizEvents.FLOW_STEP_SEEN,
  BizEvents.TOOLTIP_TARGET_MISSING,
  BizEvents.FLOW_STEP_COMPLETED,
] as const;

/**
 * Get display suffix for event based on event type
 * Returns additional information to display after event name
 *
 * @param bizEvent - Business event to get suffix for
 * @param session - Session object containing content information
 * @returns Display suffix string or empty string
 */
export const getEventDisplaySuffix = (
  bizEvent: BizEvent,
  session: { content?: { name?: string } } | null | undefined,
): string => {
  const eventCodeName = bizEvent.event?.codeName;

  if (!eventCodeName) {
    return session?.content?.name ?? '';
  }

  // Handle flow step events
  if (
    FLOW_STEP_DISPLAY_EVENTS.includes(eventCodeName as (typeof FLOW_STEP_DISPLAY_EVENTS)[number])
  ) {
    const flowStepName = bizEvent.data?.[EventAttributes.FLOW_STEP_NAME];
    const flowStepNumber = bizEvent.data?.[EventAttributes.FLOW_STEP_NUMBER];

    const hasStepNumber = flowStepNumber !== undefined && flowStepNumber !== null;
    const stepNumberDisplay = hasStepNumber ? `${Number(flowStepNumber) + 1}` : '';

    if (stepNumberDisplay && flowStepName) {
      return `Step ${stepNumberDisplay}. ${flowStepName}`;
    }
    if (stepNumberDisplay) {
      return `Step ${stepNumberDisplay}`;
    }
    if (flowStepName) {
      return flowStepName;
    }
    return '';
  }

  // Handle QUESTION_ANSWERED event
  if (eventCodeName === BizEvents.QUESTION_ANSWERED) {
    const questionName = bizEvent.data?.[EventAttributes.QUESTION_NAME];
    const answerValue = getQuestionAnswerValue(bizEvent);

    if (questionName && answerValue) {
      return `${questionName}: ${answerValue}`;
    }
    if (questionName) {
      return questionName;
    }
    if (answerValue) {
      return answerValue;
    }
    return '';
  }

  // Handle checklist task events
  if (
    eventCodeName === BizEvents.CHECKLIST_TASK_CLICKED ||
    eventCodeName === BizEvents.CHECKLIST_TASK_COMPLETED
  ) {
    return bizEvent.data?.[EventAttributes.CHECKLIST_TASK_NAME] ?? '';
  }

  // Default: return session content name for other events
  return session?.content?.name ?? '';
};

/**
 * Sort event data entries based on attribute list order
 * Attributes in the list are prioritized and sorted by their order in the list
 * Attributes not in the list are sorted alphabetically
 *
 * @param data - Event data object to sort
 * @param attributes - Array of attributes to determine sort order
 * @returns Sorted array of [key, value] tuples
 */
export const sortEventDataEntries = (
  data: Record<string, any>,
  attributes: Attribute[] | undefined,
): Array<[string, any]> => {
  return Object.entries(data || {}).sort(([keyA], [keyB]) => {
    // Find attributes in attributeList to determine order
    const attrA = attributes?.find((attr) => attr.codeName === keyA);
    const attrB = attributes?.find((attr) => attr.codeName === keyB);

    // If both are in attributeList, sort by their order in the list
    if (attrA && attrB && attributes) {
      const indexA = attributes.indexOf(attrA);
      const indexB = attributes.indexOf(attrB);
      return indexA - indexB;
    }

    // If only one is in attributeList, prioritize the one in the list
    if (attrA && !attrB) return -1;
    if (!attrA && attrB) return 1;

    // If neither is in attributeList, sort alphabetically
    return keyA.localeCompare(keyB);
  });
};

/**
 * Get start reason title from start event
 * Extracts the start reason from FLOW_STARTED, CHECKLIST_STARTED, or LAUNCHER_SEEN events
 *
 * @param startEvent - Business event containing start reason data
 * @returns Formatted start reason title or empty string
 */
export const getStartReasonTitle = (
  contentType: ContentDataType,
  startEvent: BizEvent | undefined,
): string => {
  if (contentType === ContentDataType.LAUNCHER) {
    return 'Launcher seen';
  }
  try {
    const reason =
      startEvent?.data?.[EventAttributes.FLOW_START_REASON] ||
      startEvent?.data?.[EventAttributes.CHECKLIST_START_REASON] ||
      startEvent?.data?.[EventAttributes.LAUNCHER_START_REASON];
    return flowReasonTitleMap[reason as keyof typeof flowReasonTitleMap] || reason || '';
  } catch (_) {
    return '';
  }
};

/**
 * Get formatted field value based on field key
 * Handles special formatting for various event attributes like reasons, step numbers, question types, etc.
 *
 * @param key - Field key (attribute code name)
 * @param value - Field value to format
 * @returns Formatted field value
 */
export const getFieldValue = (key: string, value: any): string | number => {
  if (
    key === EventAttributes.FLOW_START_REASON ||
    key === EventAttributes.CHECKLIST_START_REASON ||
    key === EventAttributes.LAUNCHER_START_REASON
  ) {
    return flowReasonTitleMap[value as keyof typeof flowReasonTitleMap] || value;
  }
  if (key === EventAttributes.FLOW_END_REASON || key === EventAttributes.CHECKLIST_END_REASON) {
    return flowReasonTitleMap[value as keyof typeof flowReasonTitleMap] || value;
  }
  if (key === EventAttributes.FLOW_STEP_NUMBER) {
    return value !== undefined && value !== null ? Number(value) + 1 : value;
  }
  return key === 'question_type'
    ? contentTypesConfig.find((config) => config.element.type === value)?.name || value
    : typeof value === 'string'
      ? value
      : JSON.stringify(value);
};

/**
 * Get progress status information from business events
 * Extracts completion status, dismissal status, and calculates completion duration
 * Supports both Flow and Checklist content types with different event code names
 *
 * @param bizEvents - Array of business events to analyze
 * @param completedEventCodeName - Event code name for completion (e.g., FLOW_COMPLETED or CHECKLIST_COMPLETED)
 * @param dismissedEventCodeName - Event code name for dismissal (e.g., FLOW_ENDED or CHECKLIST_DISMISSED)
 * @returns Object containing completion status, dismissal status, events, and formatted completion date
 */
export const getProgressStatus = (
  bizEvents: BizEvent[] | undefined | null,
  completedEventCodeName: BizEvents,
  dismissedEventCodeName: BizEvents,
): {
  completeBizEvent: BizEvent | undefined;
  firstEvent: BizEvent | undefined;
  dismissedBizEvent: BizEvent | undefined;
  completeDate: string | null;
  isComplete: boolean;
  isDismissed: boolean;
} => {
  if (!bizEvents || bizEvents.length === 0) {
    return {
      completeBizEvent: undefined,
      firstEvent: undefined,
      dismissedBizEvent: undefined,
      completeDate: null,
      isComplete: false,
      isDismissed: false,
    };
  }

  const completeBizEvent = bizEvents.find((e) => e.event?.codeName === completedEventCodeName);
  const dismissedBizEvent = bizEvents.find((e) => e.event?.codeName === dismissedEventCodeName);

  // Sort events by creation time to get the first event (create a copy to avoid mutating the original array)
  const firstEvent = [...bizEvents].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )[0];

  const completeDate =
    completeBizEvent && firstEvent
      ? formatDistanceStrict(new Date(completeBizEvent.createdAt), new Date(firstEvent.createdAt))
      : null;

  return {
    completeBizEvent,
    firstEvent,
    dismissedBizEvent,
    completeDate,
    isComplete: !!completeBizEvent,
    isDismissed: !!dismissedBizEvent,
  };
};
