import {
  BizEvents,
  ContentDataType,
  ContentConditionLogic,
  Frequency,
  FrequencyUnits,
  RulesCondition,
  ContentPriority,
  RulesType,
} from '@usertour/types';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
} from 'date-fns';
import { CustomContentVersion, CustomContentSession } from '@/common/types/content';
import { BizEventWithEvent, BizSessionWithEvents } from '@/common/types/schema';
import { isUndefined, isConditionsActived } from '@usertour/helpers';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

const isActivedContentRulesCondition = (
  rules: RulesCondition,
  contentSession: CustomContentSession,
): boolean => {
  const { contentId, logic } = rules.data;
  const { latestSession, seenSessions, completedSessions } = contentSession;

  if (!contentId || !logic || contentId !== contentSession.contentId) {
    return false;
  }

  // Special handling for actived/unactived logic
  if (logic === ContentConditionLogic.ACTIVED || logic === ContentConditionLogic.UNACTIVED) {
    if (!latestSession) {
      return logic === ContentConditionLogic.UNACTIVED;
    }
    const isActived = !(flowIsDismissed(latestSession) || checklistIsDimissed(latestSession));
    return logic === ContentConditionLogic.ACTIVED ? isActived : !isActived;
  }

  const isSeen = seenSessions > 0;
  const isCompleted = completedSessions > 0;
  if (logic === ContentConditionLogic.SEEN || logic === ContentConditionLogic.UNSEEN) {
    return logic === ContentConditionLogic.SEEN ? isSeen : !isSeen;
  }

  if (logic === ContentConditionLogic.COMPLETED || logic === ContentConditionLogic.UNCOMPLETED) {
    return logic === ContentConditionLogic.COMPLETED ? isCompleted : !isCompleted;
  }

  return false;
};

export const activedContentRulesConditions = async (
  conditions: RulesCondition[],
  contents: CustomContentVersion[],
) => {
  const rulesCondition: RulesCondition[] = [...conditions];
  for (let j = 0; j < rulesCondition.length; j++) {
    const rules = rulesCondition[j];
    if (rules.type !== 'group') {
      if (rules.type === RulesType.CONTENT) {
        const content = contents.find((c) => c.contentId === rules.data.contentId);
        if (content) {
          rulesCondition[j].actived = isActivedContentRulesCondition(rules, content.session);
        }
      }
    } else if (rules.conditions) {
      rulesCondition[j].conditions = await activedContentRulesConditions(
        rules.conditions,
        contents,
      );
    }
  }
  return rulesCondition;
};

export const isActiveContent = (customContentVersion: CustomContentVersion) => {
  const config = customContentVersion.config;
  const { enabledAutoStartRules, autoStartRules } = config;
  if (!enabledAutoStartRules || !isConditionsActived(autoStartRules)) {
    return false;
  }
  return true;
};

const priorityCompare = (a: CustomContentVersion, b: CustomContentVersion) => {
  const a1 = a?.config?.autoStartRulesSetting?.priority;
  const a2 = b?.config?.autoStartRulesSetting?.priority;
  if (!a1 || !a2) {
    return 0;
  }
  const index1 = PRIORITIES.indexOf(a1);
  const index2 = PRIORITIES.indexOf(a2);
  if (index1 > index2) {
    return 1;
  }
  if (index1 < index2) {
    return -1;
  }
  return 0;
};

const getLatestEvent = (
  currentContent: CustomContentVersion,
  contents: CustomContentVersion[],
  eventCodeName: string,
) => {
  const bizEvents: BizEventWithEvent[] = [];
  const contentId = currentContent.id;
  const contentType = currentContent.content.type;
  for (let index = 0; index < contents.length; index++) {
    const content = contents[index];
    if (content.id === contentId || content.content.type !== contentType) {
      continue;
    }
    const sessionBizEvents = content.session.latestSession?.bizEvent;
    if (sessionBizEvents && sessionBizEvents.length > 0) {
      bizEvents.push(...sessionBizEvents.filter((e) => e?.event?.codeName === eventCodeName));
    }
  }
  return findLatestEvent(bizEvents);
};

export const findLatestEvent = (bizEvents: BizEventWithEvent[]) => {
  const initialValue = bizEvents[0];
  const lastEvent = bizEvents.reduce(
    (accumulator: typeof initialValue, currentValue: typeof initialValue) => {
      if (isAfter(new Date(currentValue.createdAt), new Date(accumulator.createdAt))) {
        return currentValue;
      }
      return accumulator;
    },
    initialValue,
  );
  return lastEvent;
};

const showEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_STEP_SEEN,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_SEEN,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_SEEN,
};

const isGreaterThenDuration = (
  dateLeft: Date,
  dateRight: Date,
  unit: FrequencyUnits,
  duration: number,
) => {
  switch (unit) {
    case FrequencyUnits.SECONDS: {
      if (differenceInSeconds(dateLeft, dateRight) >= duration) {
        return true;
      }
      return false;
    }
    case FrequencyUnits.MINUTES:
      if (differenceInMinutes(dateLeft, dateRight) >= duration) {
        return true;
      }
      return false;
    case FrequencyUnits.HOURS:
      if (differenceInHours(dateLeft, dateRight) >= duration) {
        return true;
      }
      return false;
    case FrequencyUnits.DAYES:
      if (differenceInDays(dateLeft, dateRight) >= duration) {
        return true;
      }
      return false;
    default:
      return false;
  }
};

export const isValidContent = (
  customContentVersion: CustomContentVersion,
  customContentVersions: CustomContentVersion[],
) => {
  const now = new Date();
  if (customContentVersion.content.type === ContentDataType.FLOW) {
    // if the content is a flow, it must have a steps
    if (!customContentVersion.steps || customContentVersion.steps.length === 0) {
      return false;
    }
  } else {
    // if the content is not a flow, it must have a data
    if (!customContentVersion.data) {
      return false;
    }
  }
  // if the autoStartRulesSetting is not set, the content will be shown
  if (!customContentVersion.config.autoStartRulesSetting) {
    return true;
  }

  const { frequency, startIfNotComplete } = customContentVersion.config.autoStartRulesSetting;
  const completedSessions = customContentVersion.session.completedSessions;
  const dismissedSessions = customContentVersion.session.dismissedSessions;

  // if the content is completed, it will not be shown again when startIfNotComplete is true
  if (startIfNotComplete && completedSessions > 0) {
    return false;
  }

  // if the frequency is not set, the content will be shown
  if (!frequency) {
    return true;
  }

  const contentType = customContentVersion.content.type as
    | ContentDataType.FLOW
    | ContentDataType.LAUNCHER
    | ContentDataType.CHECKLIST;

  const lastEventName = showEventMapping[contentType];
  const lastEvent = getLatestEvent(customContentVersion, customContentVersions, lastEventName);
  const contentEvents = customContentVersion.session.latestSession?.bizEvent;

  if (
    lastEvent &&
    frequency &&
    frequency.atLeast &&
    !isGreaterThenDuration(
      now,
      new Date(lastEvent.createdAt),
      frequency.atLeast.unit,
      frequency.atLeast.duration,
    )
  ) {
    return false;
  }

  if (frequency.frequency === Frequency.ONCE) {
    //if the content is dismissed, it will not be shown again when the frequency is once
    if (dismissedSessions > 0) {
      return false;
    }
    return true;
  }

  const showEventName = showEventMapping[contentType];
  const showEvents = contentEvents?.filter(
    (e) =>
      e?.event?.codeName === showEventName &&
      (contentType === ContentDataType.FLOW ? (e?.data as any)?.flow_step_number === 0 : true),
  );
  if (!showEvents || showEvents.length === 0) {
    return true;
  }

  const lastShowEvent = findLatestEvent(showEvents);
  const lastShowEventDate = new Date(lastShowEvent.createdAt);

  if (frequency.frequency === Frequency.MULTIPLE) {
    if (frequency.every.times && dismissedSessions >= frequency.every.times) {
      return false;
    }
  }
  if (frequency.frequency === Frequency.MULTIPLE || frequency.frequency === Frequency.UNLIMITED) {
    if (
      !isGreaterThenDuration(now, lastShowEventDate, frequency.every.unit, frequency.every.duration)
    ) {
      return false;
    }
  }
  return true;
};

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

export const checklistIsDimissed = (latestSession?: BizSessionWithEvents) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );
};

export const flowIsDismissed = (latestSession?: BizSessionWithEvents) => {
  return latestSession?.bizEvent?.find((event) => event?.event?.codeName === BizEvents.FLOW_ENDED);
};

export const flowIsSeen = (latestSession?: BizSessionWithEvents) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN,
  );
};

export const checklistIsSeen = (latestSession?: BizSessionWithEvents) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );
};

export const filterAutoStartContent = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
) => {
  return customContentVersions
    .filter((customContentVersion) => {
      const isActive = isActiveContent(customContentVersion);
      const isValid = isValidContent(customContentVersion, customContentVersions);
      return customContentVersion.content.type === contentType && isActive && isValid;
    })
    .sort(priorityCompare);
};

export const findLatestActivatedContentVersion = (
  contentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
): CustomContentVersion | undefined => {
  const activeContentVersions = contentVersions.filter((contentVersion) => {
    if (contentType === ContentDataType.CHECKLIST) {
      return !checklistIsDimissed(contentVersion.session.latestSession);
    }
    return !flowIsDismissed(contentVersion.session.latestSession);
  });

  const contentVersionsWithValidSession = activeContentVersions.filter(
    (contentVersion) => contentVersion.session.latestSession?.createdAt,
  );

  if (!contentVersionsWithValidSession.length) {
    return undefined;
  }

  return contentVersionsWithValidSession.sort(
    (a, b) =>
      new Date(b.session.latestSession?.createdAt).getTime() -
      new Date(a.session.latestSession?.createdAt).getTime(),
  )[0];
};

export const findLatestActivedAutoStartContent = (
  contentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
): CustomContentVersion | undefined => {
  const autoStartContentVersions = filterAutoStartContent(contentVersions, contentType);
  const latestActivatedContentVersion = findLatestActivatedContentVersion(
    autoStartContentVersions,
    contentType,
  );
  if (latestActivatedContentVersion) {
    return latestActivatedContentVersion;
  }
  return autoStartContentVersions[0];
};

export const findContentVersionByContentId = (
  contentVersions: CustomContentVersion[],
  contentId: string,
): CustomContentVersion | undefined => {
  return contentVersions.find((contentVersion) => contentVersion.contentId === contentId);
};

export const findLatestSessionId = (
  latestSession: BizSessionWithEvents,
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
) => {
  if (contentType === ContentDataType.CHECKLIST) {
    if (latestSession && !checklistIsDimissed(latestSession)) {
      return latestSession.id;
    }
  } else {
    if (latestSession && !flowIsDismissed(latestSession)) {
      return latestSession.id;
    }
  }
  return undefined;
};
