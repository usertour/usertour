import { computePosition, hide } from '@floating-ui/dom';
import { finderV2 } from '@usertour-packages/finder';
import {
  BizEvent,
  BizEvents,
  ContentDataType,
  ContentConditionLogic,
  ContentSession,
  Frequency,
  FrequencyUnits,
  RulesCondition,
  SDKContent,
  ElementConditionLogic,
  StringConditionLogic,
  BizSession,
  RulesType,
  ContentPriority,
  BizUserInfo,
} from '@usertour/types';
import {
  ContentEditorQuestionElement,
  ContentEditorElementType,
} from '@usertour-packages/shared-editor';
import { AnswerQuestionDto } from '@/types/websocket';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
  isBefore,
} from 'date-fns';
import { document, location, off, on, logger } from '@/utils';
import { isEqual, uuidV4, isMatchUrlPattern, conditionsIsSame } from '@usertour/helpers';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];
export const rulesTypes: RulesType[] = Object.values(RulesType);

const isActiveRulesByCurrentPage = (rules: RulesCondition) => {
  const { excludes, includes } = rules.data;
  if (location) {
    const href = location.href;
    return isMatchUrlPattern(href, includes, excludes);
  }
  return false;
};

const isActiveRulesByCurrentTime = (rules: RulesCondition) => {
  const { endDate, endDateHour, endDateMinute, startDate, startDateHour, startDateMinute } =
    rules.data;
  const startTime = new Date(`${startDate} ${startDateHour}:${startDateMinute}:00`);
  const endTime = new Date(`${endDate} ${endDateHour}:${endDateMinute}:00`);
  const now = new Date();
  if (!endDate) {
    return isAfter(now, startTime);
  }
  return isAfter(now, startTime) && isBefore(now, endTime);
};

const isActivedContentRulesCondition = (
  rules: RulesCondition,
  contentSession: ContentSession,
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

export const isVisible = async (el: HTMLElement) => {
  if (!document?.body) {
    return false;
  }
  const { middlewareData } = await computePosition(el, document.body, {
    strategy: 'fixed',
    middleware: [hide()],
  });
  if (middlewareData?.hide?.referenceHidden) {
    return false;
  }
  return true;
};

const cache = new Map();

const isClicked = (el: HTMLElement) => {
  if (cache.has(el)) {
    return cache.get(el);
  }
  const onClick = () => {
    cache.set(el, true);
    off(el, 'click', onClick);
  };
  on(el, 'click', onClick);
  cache.set(el, false);
  return false;
};

const isActiveRulesByElement = async (rules: RulesCondition) => {
  const { data } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(data.elementData, document);

  const isPresent = el ? await isVisible(el) : false;
  const isDisabled = el ? (el as any).disabled : false;
  switch (data.logic) {
    case ElementConditionLogic.PRESENT:
      return isPresent;
    case ElementConditionLogic.UNPRESENT:
      return !isPresent;
    case ElementConditionLogic.DISABLED:
      return el && isDisabled;
    case ElementConditionLogic.UNDISABLED:
      return el && !isDisabled;
    case ElementConditionLogic.CLICKED:
      return el && isClicked(el);
    case ElementConditionLogic.UNCLICKED:
      return el && !isClicked(el);
    default:
      return false;
  }
};

const isActiveRulesByTextInput = async (rules: RulesCondition) => {
  const {
    data: { elementData, logic, value },
  } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const elValue = el.value;
  switch (logic) {
    case StringConditionLogic.IS:
      return elValue === value;
    case StringConditionLogic.NOT:
      return elValue !== value;
    case StringConditionLogic.CONTAINS:
      return elValue.includes(value);
    case StringConditionLogic.NOT_CONTAIN:
      return !elValue.includes(value);
    case StringConditionLogic.STARTS_WITH:
      return elValue.startsWith(value);
    case StringConditionLogic.ENDS_WITH:
      return elValue.endsWith(value);
    case StringConditionLogic.MATCH:
      return elValue.search(value) !== -1;
    case StringConditionLogic.UNMATCH:
      return elValue.search(value) === -1;
    case StringConditionLogic.ANY:
      return true;
    case StringConditionLogic.EMPTY:
      return !elValue;
    default:
      return false;
  }
};

const fillCache = new Map();

const isActiveRulesByTextFill = async (rules: RulesCondition) => {
  const {
    data: { elementData },
  } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const now = new Date().getTime();
  const onKeyup = () => {
    const cacheData = fillCache.get(el);
    const data = { ...cacheData, timestamp: new Date().getTime() };
    fillCache.set(el, data);
  };
  if (fillCache.has(el)) {
    const { timestamp, value, isActive } = fillCache.get(el);
    if (isActive) {
      return true;
    }
    if (timestamp !== -1 && now - timestamp > 1000 && value !== el.value) {
      off(document, 'click', onKeyup);
      fillCache.set(el, { timestamp, value, isActive: true });
      return true;
    }
    return false;
  }
  on(document, 'keyup', onKeyup);
  fillCache.set(el, { timestamp: -1, value: el.value, isActive: false });
  return false;
};

const isValidRulesType = (type: string) => {
  return rulesTypes.includes(type as RulesType);
};

const isActiveRules = async (rules: RulesCondition) => {
  if (!isValidRulesType(rules.type)) {
    return true;
  }
  switch (rules.type) {
    case RulesType.CURRENT_PAGE:
      return isActiveRulesByCurrentPage(rules);
    case RulesType.TIME:
      return isActiveRulesByCurrentTime(rules);
    case RulesType.ELEMENT:
      return await isActiveRulesByElement(rules);
    case RulesType.TEXT_INPUT:
      return await isActiveRulesByTextInput(rules);
    case RulesType.TEXT_FILL:
      return await isActiveRulesByTextFill(rules);
    default:
      return rules.actived;
  }
};

type RewriteRulesCondition = Partial<Record<RulesType, boolean>>;

export const activedRulesConditions = async (
  conditions: RulesCondition[],
  rewrite?: RewriteRulesCondition,
) => {
  const rulesCondition: RulesCondition[] = [...conditions];
  for (let j = 0; j < rulesCondition.length; j++) {
    const rules = rulesCondition[j];
    if (rules.type !== 'group') {
      if (rewrite?.[rules.type as keyof RewriteRulesCondition]) {
        rulesCondition[j].actived = true;
      } else {
        rulesCondition[j].actived = await isActiveRules(rules);
      }
    } else if (rules.conditions) {
      rulesCondition[j].conditions = await activedRulesConditions(rules.conditions);
    }
  }
  return rulesCondition;
};

export const activedContentRulesConditions = async (
  conditions: RulesCondition[],
  contents: SDKContent[],
) => {
  const rulesCondition: RulesCondition[] = [...conditions];
  for (let j = 0; j < rulesCondition.length; j++) {
    const rules = rulesCondition[j];
    if (rules.type !== 'group') {
      if (rules.type === RulesType.CONTENT) {
        const content = contents.find((c) => c.contentId === rules.data.contentId);
        if (content) {
          const contentSession = {
            contentId: content.contentId,
            latestSession: content.latestSession,
            totalSessions: content.totalSessions,
            dismissedSessions: content.dismissedSessions,
            completedSessions: content.completedSessions,
            seenSessions: content.seenSessions,
          };
          rulesCondition[j].actived = isActivedContentRulesCondition(rules, contentSession);
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

export const activedContentCondition = async (contents: SDKContent[]) => {
  const _contents = JSON.parse(JSON.stringify(contents)) as SDKContent[];
  for (let index = 0; index < _contents.length; index++) {
    const content = _contents[index];
    const { enabledAutoStartRules, autoStartRules, hideRules, enabledHideRules } = content.config;
    if (enabledAutoStartRules && autoStartRules && autoStartRules.length > 0) {
      content.config.autoStartRules = await activedRulesConditions(autoStartRules);
    }
    if (enabledHideRules && hideRules && hideRules.length > 0) {
      content.config.hideRules = await activedRulesConditions(hideRules);
    }
  }
  return _contents;
};

export const isActive = (autoStartRules: RulesCondition[]): boolean => {
  if (!autoStartRules || autoStartRules.length === 0) {
    return false;
  }
  const operator = autoStartRules[0].operators;
  const actives = autoStartRules.filter((rule: RulesCondition) => {
    if (!rule.conditions) {
      return rule.actived;
    }
    return isActive(rule.conditions);
  });
  return operator === 'and' ? actives.length === autoStartRules.length : actives.length > 0;
};

export const isActiveContent = (content: SDKContent) => {
  const { enabledAutoStartRules, autoStartRules } = content.config;
  if (!enabledAutoStartRules || !isActive(autoStartRules)) {
    return false;
  }
  return true;
};

const priorityCompare = (a: SDKContent, b: SDKContent) => {
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

export const filterAutoStartContent = (contents: SDKContent[], type: string) => {
  return contents
    .filter((content) => {
      const isActive = isActiveContent(content);
      const isValid = isValidContent(content, contents);
      return content.type === type && isActive && isValid;
    })
    .sort(priorityCompare);
};

export const isHasActivedContents = (source: SDKContent[], dest: SDKContent[]) => {
  for (let index = 0; index < source.length; index++) {
    const content1 = source[index];
    const content2 = dest.find((c) => c.id === content1.id);
    if (!content2) {
      return true;
    }
    if (isActiveContent(content1) !== isActiveContent(content2)) {
      return true;
    }
  }
  return false;
};

export const isSameContents = (source: SDKContent[], dest: SDKContent[]) => {
  if (!source || !dest || source.length !== dest.length) {
    return false;
  }
  for (let index = 0; index < source.length; index++) {
    const content1 = source[index];
    const content2 = dest.find((c) => c.id === content1.id);
    if (!content2) {
      return false;
    }
    if (!conditionsIsSame(content1.config.autoStartRules, content2.config.autoStartRules)) {
      return false;
    }
  }
  return true;
};

const getLatestEvent = (
  currentContent: SDKContent,
  contents: SDKContent[],
  eventCodeName: string,
) => {
  const bizEvents: BizEvent[] = [];
  const contentId = currentContent.id;
  const contentType = currentContent.type;
  for (let index = 0; index < contents.length; index++) {
    const content = contents[index];
    if (content.id === contentId || content.type !== contentType) {
      continue;
    }
    const sessionBizEvents = content.latestSession?.bizEvent;
    if (sessionBizEvents && sessionBizEvents.length > 0) {
      bizEvents.push(...sessionBizEvents.filter((e) => e?.event?.codeName === eventCodeName));
    }
  }
  return findLatestEvent(bizEvents);
};

export const findLatestEvent = (bizEvents: BizEvent[]) => {
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

export const completeEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_COMPLETED,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_ACTIVATED,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_COMPLETED,
};
const showEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_STEP_SEEN,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_SEEN,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_SEEN,
};

export const isDismissedEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_ENDED,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_DISMISSED,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_DISMISSED,
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

export const checklistIsDimissed = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );
};

export const flowIsDismissed = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find((event) => event?.event?.codeName === BizEvents.FLOW_ENDED);
};

export const flowIsSeen = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN,
  );
};

export const checklistIsSeen = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );
};

export const isValidContent = (content: SDKContent, contents: SDKContent[]) => {
  const now = new Date();
  if (content.type === ContentDataType.FLOW) {
    // if the content is a flow, it must have a steps
    if (!content.steps || content.steps.length === 0) {
      return false;
    }
  } else {
    // if the content is not a flow, it must have a data
    if (!content.data) {
      return false;
    }
  }
  // if the autoStartRulesSetting is not set, the content will be shown
  if (!content.config.autoStartRulesSetting) {
    return true;
  }

  const { frequency, startIfNotComplete } = content.config.autoStartRulesSetting;
  const completedSessions = content.completedSessions;
  const dismissedSessions = content.dismissedSessions;

  // if the content is completed, it will not be shown again when startIfNotComplete is true
  if (startIfNotComplete && completedSessions > 0) {
    return false;
  }

  // if the frequency is not set, the content will be shown
  if (!frequency) {
    return true;
  }

  const contentType = content.type as
    | ContentDataType.FLOW
    | ContentDataType.LAUNCHER
    | ContentDataType.CHECKLIST;

  const lastEventName = showEventMapping[contentType];
  const lastEvent = getLatestEvent(content, contents, lastEventName);
  const contentEvents = content.latestSession?.bizEvent;

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
      (contentType === ContentDataType.FLOW ? e?.data?.flow_step_number === 0 : true),
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

export const parseUrlParams = (url: string, paramName: string): string | null => {
  if (!url || !paramName) {
    return null;
  }

  try {
    const urlObj = new URL(url);

    // 1. Check traditional query string
    const searchParams = new URLSearchParams(urlObj.search);
    if (searchParams.has(paramName)) {
      return searchParams.get(paramName);
    }

    // 2. Check hash part
    if (urlObj.hash) {
      // Handle both #/path?param=value and #?param=value formats
      const hashSearch = urlObj.hash.split('?')[1];
      if (hashSearch) {
        const hashParams = new URLSearchParams(hashSearch);
        if (hashParams.has(paramName)) {
          return hashParams.get(paramName);
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
};

export const wait = (seconds: number): Promise<void> => {
  if (typeof seconds !== 'number' || Number.isNaN(seconds)) {
    return Promise.reject(new Error('Invalid wait time: must be a number'));
  }

  if (seconds < 0) {
    return Promise.reject(new Error('Invalid wait time: cannot be negative'));
  }

  if (seconds === 0) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    try {
      setTimeout(resolve, seconds * 1000);
    } catch (error) {
      reject(error);
    }
  });
};

interface UserInfo {
  data: Record<string, string>;
}

export function buildNavigateUrl(value: any[], userInfo?: UserInfo): string {
  let url = '';

  try {
    for (const v of value) {
      for (const vc of v.children) {
        if (vc.type === 'user-attribute') {
          if (userInfo) {
            url += userInfo.data[vc.attrCode] || vc.fallback;
          }
        } else {
          url += vc.text;
        }
      }
    }

    return url;
  } catch (error) {
    logger.error('Build navigate URL error: ', error);
    return '';
  }
}

/**
 * Checks if attributes have actually changed by comparing current and new attributes
 * @param currentAttributes - Current attributes object
 * @param newAttributes - New attributes to merge
 * @returns True if attributes have changed, false otherwise
 */
export const hasAttributesChanged = (
  currentAttributes: Record<string, any> = {},
  newAttributes: Record<string, any> = {},
): boolean => {
  const mergedAttributes = { ...currentAttributes, ...newAttributes };
  return !isEqual(currentAttributes, mergedAttributes);
};

export const createMockUser = (userId?: string): BizUserInfo => {
  const now = new Date().toISOString();
  return {
    externalId: userId ?? uuidV4(),
    id: uuidV4(),
    createdAt: now,
    updatedAt: now,
    bizCompanyId: uuidV4(),
    deleted: false,
    data: {
      male: true,
      sdsdd: 13,
      registerAt: '2024-03-29T16:05:45.000Z',
      userNamedddd: 'usertour-test',
    },
  };
};

export const extensionIsRunning = () => {
  const el = document?.querySelector('#usertour-iframe-container') as HTMLIFrameElement;

  if (!el) {
    return false;
  }

  return el?.dataset?.started === 'true';
};

/**
 * Creates event data for question answer reporting
 * Handles different question types and formats the data appropriately
 *
 * @param element - The question element that was answered
 * @param value - The value of the answer
 * @param sessionId - The session ID
 * @returns Formatted event data for question answer
 */
export const createQuestionAnswerEventData = (
  element: ContentEditorQuestionElement,
  value: any,
  sessionId: string,
): AnswerQuestionDto => {
  const { data, type } = element;
  const { cvid } = data;

  const eventData: AnswerQuestionDto = {
    questionCvid: cvid,
    questionName: data.name,
    questionType: type,
    sessionId,
  };

  // Handle different question types
  if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
    if (element.data.allowMultiple) {
      eventData.listAnswer = value as string[];
    } else {
      eventData.textAnswer = value;
    }
  } else if (
    element.type === ContentEditorElementType.SCALE ||
    element.type === ContentEditorElementType.NPS ||
    element.type === ContentEditorElementType.STAR_RATING
  ) {
    eventData.numberAnswer = value;
  } else if (
    element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
    element.type === ContentEditorElementType.MULTI_LINE_TEXT
  ) {
    eventData.textAnswer = value;
  }

  return eventData;
};
