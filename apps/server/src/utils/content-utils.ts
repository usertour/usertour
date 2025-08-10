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
  isBefore,
} from 'date-fns';
import isEqual from 'fast-deep-equal';
import { CustomContentVersion, CustomContentSession } from '@/common/types/content';
import { BizEventWithEvent } from '@/common/types/schema';
import { BizSessionWithEvents } from '@/common/types/schema';
import { isUndefined } from '@usertour/helpers';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

export const rulesTypes: RulesType[] = Object.values(RulesType);

export const isActiveRulesByCurrentPage = (rules: RulesCondition) => {
  const { excludes, includes } = rules.data;
  if (location) {
    const href = location.href;
    return isMatchUrlPattern(href, includes, excludes);
  }
  return false;
};

export const isActiveRulesByCurrentTime = (rules: RulesCondition) => {
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

export const activedContentCondition = async (contents: CustomContentVersion[]) => {
  const _contents = JSON.parse(JSON.stringify(contents)) as CustomContentVersion[];
  for (let index = 0; index < _contents.length; index++) {
    const content = _contents[index];
    const config = content.config;
    const { enabledAutoStartRules, autoStartRules, hideRules, enabledHideRules } = config;
    if (enabledAutoStartRules && autoStartRules && autoStartRules.length > 0) {
      config.autoStartRules = await activedRulesConditions(autoStartRules);
    }
    if (enabledHideRules && hideRules && hideRules.length > 0) {
      config.hideRules = await activedRulesConditions(hideRules);
    }
    content.config = config;
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

export const isActiveContent = (content: CustomContentVersion) => {
  const config = content.config;
  const { enabledAutoStartRules, autoStartRules } = config;
  if (!enabledAutoStartRules || !isActive(autoStartRules)) {
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

export const isHasActivedContents = (
  source: CustomContentVersion[],
  dest: CustomContentVersion[],
) => {
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

export const isSameContents = (source: CustomContentVersion[], dest: CustomContentVersion[]) => {
  if (!source || !dest || source.length !== dest.length) {
    return false;
  }
  for (let index = 0; index < source.length; index++) {
    const content1 = source[index];
    const content2 = dest.find((c) => c.id === content1.id);
    if (!content2) {
      return false;
    }
    const config1 = content1.config;
    const config2 = content2.config;
    if (!conditionsIsSame(config1.autoStartRules, config2.autoStartRules)) {
      return false;
    }
  }
  return true;
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

// const completeEventMapping = {
//   [ContentDataType.FLOW]: BizEvents.FLOW_COMPLETED,
//   [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_ACTIVATED,
//   [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_COMPLETED,
// };
const showEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_STEP_SEEN,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_SEEN,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_SEEN,
};

// const isDismissedEventMapping = {
//   [ContentDataType.FLOW]: BizEvents.FLOW_ENDED,
//   [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_DISMISSED,
//   [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_DISMISSED,
// };

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

export const isValidContent = (content: CustomContentVersion, contents: CustomContentVersion[]) => {
  const now = new Date();
  if (content.content.type === ContentDataType.FLOW) {
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
  const completedSessions = content.session.completedSessions;
  const dismissedSessions = content.session.dismissedSessions;

  // if the content is completed, it will not be shown again when startIfNotComplete is true
  if (startIfNotComplete && completedSessions > 0) {
    return false;
  }

  // if the frequency is not set, the content will be shown
  if (!frequency) {
    return true;
  }

  const contentType = content.content.type as
    | ContentDataType.FLOW
    | ContentDataType.LAUNCHER
    | ContentDataType.CHECKLIST;

  const lastEventName = showEventMapping[contentType];
  const lastEvent = getLatestEvent(content, contents, lastEventName);
  const contentEvents = content.session.latestSession?.bizEvent;

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

const parseUrl = (url: string) => {
  const urlPatterns = url.match(/^(([a-z\d]+):\/\/)?([^/?#]+)?(\/[^?#]*)?(\?([^#]*))?(#.*)?$/i);
  if (!urlPatterns) {
    return null;
  }
  const [, , scheme = '', domain = '', path = '', , query = '', fragment = ''] = urlPatterns;
  return { scheme, domain, path, query, fragment };
};

const replaceWildcard = (input: string, s1: string, s2?: string) => {
  const withSpecialWords = replaceSpecialWords(input);
  const withWildcard = withSpecialWords.replace(/\\\*/g, `${s1}*`);
  if (!s2) {
    return withWildcard;
  }
  return withWildcard.replace(/:[a-z0-9_]+/g, `[^${s2}]+`);
};

const replaceSpecialWords = (str: string) => {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
};

const parsePattern = (pattern: string) => {
  if (!pattern || !pattern.trim()) {
    return null;
  }
  const _pattern = parseUrl(pattern);
  if (!_pattern) {
    console.error('Invalid URL pattern:', pattern);
    return null;
  }
  const { scheme, domain, path, query, fragment } = _pattern;
  const _scheme = scheme ? replaceSpecialWords(scheme) : '[a-z\\d]+';
  const _domain = domain ? replaceWildcard(domain, '[^/]', '.') : '[^/]*';
  const _fragment = fragment ? replaceWildcard(fragment, '.', '/') : '(#.*)?';
  const _path = path ? replaceWildcard(path, '[^?#]', '/') : '/[^?#]*';
  let _query = '(\\?[^#]*)?';
  if (query) {
    new URLSearchParams(query).forEach((value: string, key: string) => {
      const _str =
        value === '' ? '=?' : value === '*' ? '(=[^&#]*)?' : `=${replaceWildcard(value, '[^#]')}`;
      _query += `(?=.*[?&]${replaceSpecialWords(key)}${_str}([&#]|$))`;
    });
    _query += '\\?[^#]*';
  }
  return new RegExp(`^${_scheme}://${_domain}(:\\d+)?${_path}${_query}${_fragment}$`);
};

export const isMatchUrlPattern = (_url: string, includes: string[], excludes: string[]) => {
  const isMatchIncludesConditions =
    includes.length > 0
      ? includes.some((_include) => {
          const reg = parsePattern(_include);
          if (reg) {
            return reg.test(_url);
          }
          return false;
        })
      : true;
  const isMatchExcludesConditions =
    excludes.length > 0
      ? excludes.some((_exclude) => {
          const reg = parsePattern(_exclude);
          if (reg) {
            return reg.test(_url);
          }
          return false;
        })
      : false;
  return isMatchIncludesConditions && !isMatchExcludesConditions;
};

const compareConditionsItem = (item1: RulesCondition, item2: RulesCondition) => {
  const { data = {}, ...others1 } = item1;
  const { data: data2 = {}, ...others2 } = item2;
  if (!isEqual(others2, others1)) {
    return false;
  }
  for (const key in data) {
    if (!isEqual(data[key], data2[key])) {
      return false;
    }
  }
  return true;
};

export const conditionsIsSame = (rr1: RulesCondition[], rr2: RulesCondition[]) => {
  const r1 = [...rr1];
  const r2 = [...rr2];
  if (r1.length === 0 && r2.length === 0) {
    return true;
  }
  if (r1.length !== r2.length) {
    return false;
  }
  const group1 = r1.filter((item) => item.type === 'group');
  const group2 = r2.filter((item) => item.type === 'group');
  if (group1.length !== group2.length) {
    return false;
  }
  for (let index = 0; index < r1.length; index++) {
    const item1 = r1[index];
    const item2 = r2[index];
    if (!item1 || !item2) {
      return false;
    }
    if (item1.type === 'group') {
      if (!item2.conditions) {
        return false;
      }
      const c1 = item1.conditions as RulesCondition[];
      const c2 = item2.conditions as RulesCondition[];
      if (item1.operators !== item2.operators) {
        return false;
      }
      if (!conditionsIsSame(c1, c2)) {
        return false;
      }
    } else {
      if (!compareConditionsItem(item1, item2)) {
        return false;
      }
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

export const filterAutoStartContent = (contents: CustomContentVersion[], type: string) => {
  return contents
    .filter((content) => {
      const isActive = isActiveContent(content);
      const isValid = isValidContent(content, contents);
      return content.content.type === type && isActive && isValid;
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
