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

const getLatestEvent = (contentId: string, contents: SDKContent[], eventCodeName: string) => {
  const bizEvents: BizEvent[] = [];
  for (let index = 0; index < contents.length; index++) {
    const content = contents[index];
    if (content.id === contentId) {
      continue;
    }
    if (content.events && content.events.length > 0) {
      bizEvents.push(...content.events.filter((e) => e?.event?.codeName === eventCodeName));
    }
  }
  return findLatestEvent(bizEvents);
};

const findLatestEvent = (bizEvents: BizEvent[]) => {
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

const completeEventMapping = {
  flow: BizEvents.FLOW_COMPLETED,
  launcher: BizEvents.LAUNCHER_ACTIVATED,
  checklist: BizEvents.CHECKLIST_COMPLETED,
};
const showEventMapping = {
  flow: BizEvents.FLOW_STEP_SEEN,
  launcher: BizEvents.LAUNCHER_SEEN,
  checklist: BizEvents.CHECKLIST_SEEN,
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
  return content.events.find((event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED);
};

export const isValidContent = (content: SDKContent, contents: SDKContent[]) => {
  const now = new Date();
  if (content.type === ContentDataType.FLOW) {
    if (!content.steps || content.steps.length === 0) {
      return false;
    }
  } else {
    if (!content.data) {
      return false;
    }
  }
  if (!content.config.autoStartRulesSetting) {
    return true;
  }
  const completeEventName = completeEventMapping[content.type as keyof typeof completeEventMapping];
  const lastEventName = showEventMapping[content.type as keyof typeof showEventMapping];
  const { frequency, startIfNotComplete } = content.config.autoStartRulesSetting;
  const isComplete = content.events.find((e) => e?.event?.codeName === completeEventName);
  if (startIfNotComplete && isComplete) {
    return false;
  }
  const lastEvent = getLatestEvent(content.id, contents, lastEventName);

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

  const showEventName = showEventMapping[content.type as keyof typeof showEventMapping];
  const showEvents = content.events.filter(
    (e) =>
      e?.event?.codeName === showEventName &&
      (content.type === ContentDataType.FLOW ? e?.data?.flow_step_number === 0 : true),
  );
  if (!showEvents || showEvents.length === 0 || !frequency) {
    return true;
  }
  if (frequency.frequency === Frequency.ONCE && content.totalSessions > 0) {
    return false;
  }
  const lastShowEvent = findLatestEvent(showEvents);
  const lastShowEventDate = new Date(lastShowEvent.createdAt);
  if (frequency.frequency === Frequency.MULTIPLE) {
    if (frequency.every.times && content.totalSessions >= frequency.every.times) {
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
