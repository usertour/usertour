import { computePosition, hide } from '@floating-ui/dom';
import { PRIORITIES } from '@usertour-ui/constants';
import { finderV2 } from '@usertour-ui/finder';
import { isMatchUrlPattern } from '@usertour-ui/shared-utils';
import { conditionsIsSame } from '@usertour-ui/shared-utils';
import {
  BizEvent,
  BizEvents,
  ContentDataType,
  Frequency,
  FrequencyUnits,
  RulesCondition,
  SDKContent,
} from '@usertour-ui/types';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
  isBefore,
} from 'date-fns';
import { document, location } from '../utils/globals';
import { off, on } from './listener';

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
  if (!el) {
    return false;
  }
  const isPresent = await isVisible(el);
  const isDisabled = (el as any).disabled ?? false;
  switch (data.logic) {
    case 'present':
      return isPresent;
    case 'unpresent':
      return !isPresent;
    case 'disabled':
      return el && isDisabled;
    case 'undisabled':
      return el && !isDisabled;
    case 'clicked':
      return el && isClicked(el);
    case 'unclicked':
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
    case 'is':
      return elValue === value;
    case 'not':
      return elValue !== value;
    case 'contains':
      return elValue.includes(value);
    case 'notContain':
      return !elValue.includes(value);
    case 'startsWith':
      return elValue.startsWith(value);
    case 'endsWith':
      return elValue.endsWith(value);
    case 'match':
      return elValue.search(value) !== -1;
    case 'unmatch':
      return elValue.search(value) === -1;
    case 'any':
      return true;
    case 'empty':
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

export const rulesTypes: string[] = [
  'user-attr',
  'current-page',
  'event',
  'segment',
  'content',
  'element',
  'text-input',
  'text-fill',
  'time',
  'group',
  'task-is-clicked',
];

const isValidRulesType = (type: string) => {
  return rulesTypes.includes(type);
};

const isActiveRules = async (rules: RulesCondition) => {
  if (!isValidRulesType(rules.type)) {
    return true;
  }
  switch (rules.type) {
    case 'current-page':
      return isActiveRulesByCurrentPage(rules);
    case 'time':
      return isActiveRulesByCurrentTime(rules);
    case 'element':
      return await isActiveRulesByElement(rules);
    case 'text-input':
      return await isActiveRulesByTextInput(rules);
    case 'text-fill':
      return await isActiveRulesByTextFill(rules);
    default:
      return rules.actived;
  }
};

type RewriteRulesCondition = {
  'task-is-clicked': boolean;
};

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

export const checklistIsDimissed = (content: SDKContent) => {
  return content?.latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );
};

export const flowIsDismissed = (content: SDKContent) => {
  return content?.latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.FLOW_ENDED,
  );
};

export const flowIsSeen = (content: SDKContent) => {
  return content?.latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN,
  );
};

export const checklistIsSeen = (content: SDKContent) => {
  return content?.latestSession?.bizEvent?.find(
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
