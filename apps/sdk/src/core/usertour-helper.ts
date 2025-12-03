import { computePosition, hide } from '@floating-ui/dom';
import { finderV2 } from '@usertour-packages/finder';
import {
  BizEvent,
  BizEvents,
  ContentDataType,
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
  RulesTypeControl,
  AnswerQuestionDto,
  SessionAttribute,
  AttributeBizTypes,
  RulesEvaluationOptions,
} from '@usertour/types';
import {
  ContentEditorQuestionElement,
  ContentEditorElementType,
} from '@usertour-packages/shared-editor';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
} from 'date-fns';
import { document, location, off, on, window } from '@/utils';
import {
  isEqual,
  uuidV4,
  conditionsIsSame,
  isConditionsActived,
  evaluateRulesConditions,
} from '@usertour/helpers';

// ============================================================================
// Constants
// ============================================================================

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

// ============================================================================
// Element Visibility and Interaction Functions
// ============================================================================

/**
 * Check if an element is visible in the viewport
 * @param el - The HTML element to check
 * @returns True if the element is visible, false otherwise
 */
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

/**
 * Cache for tracking clicked elements
 */
const cache = new Map();

/**
 * Check if an element has been clicked
 * @param el - The HTML element to check
 * @returns True if the element has been clicked, false otherwise
 */
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

/**
 * Check if an element is disabled
 * For form controls (input, button, select, etc.), uses the disabled property for accurate state detection
 * For other elements, checks if the disabled attribute exists
 * @param el - The HTML element to check
 * @returns True if the element is disabled, false otherwise
 */
const isDisabled = (el: HTMLElement | null): boolean => {
  if (!el) {
    return false;
  }

  // For form controls, use the disabled property which reflects the actual state
  if ('disabled' in el) {
    return Boolean(
      (
        el as
          | HTMLInputElement
          | HTMLButtonElement
          | HTMLSelectElement
          | HTMLTextAreaElement
          | HTMLOptionElement
          | HTMLFieldSetElement
      ).disabled,
    );
  }

  // For other elements, check if the disabled attribute exists
  return el.hasAttribute('disabled');
};

/**
 * Cache for tracking text fill events
 */
const fillCache = new Map();

// ============================================================================
// Rule Evaluation Functions
// ============================================================================

/**
 * Check if element-based rules are active
 * @param rules - The rules condition to check
 * @returns True if the rules are active, false otherwise
 */
const isActiveRulesByElement = async (rules: RulesCondition) => {
  const { data } = rules;
  if (!document) {
    return false;
  }
  const el = finderV2(data.elementData, document);

  const isPresent = el ? await isVisible(el) : false;
  const elementDisabled = isDisabled(el);
  switch (data.logic) {
    case ElementConditionLogic.PRESENT:
      return isPresent;
    case ElementConditionLogic.UNPRESENT:
      return !isPresent;
    case ElementConditionLogic.DISABLED:
      return el && elementDisabled;
    case ElementConditionLogic.UNDISABLED:
      return el && !elementDisabled;
    case ElementConditionLogic.CLICKED:
      return el && isClicked(el);
    case ElementConditionLogic.UNCLICKED:
      return el && !isClicked(el);
    default:
      return false;
  }
};

/**
 * Check if text input-based rules are active
 * @param rules - The rules condition to check
 * @returns True if the rules are active, false otherwise
 */
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

/**
 * Check if text fill-based rules are active
 * @param rules - The rules condition to check
 * @returns True if the rules are active, false otherwise
 */
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

/**
 * Evaluate rules conditions by session attributes
 * @param conditions - Rules conditions to evaluate
 * @param attributes - Session attributes to evaluate
 * @returns Evaluation result
 */
export const evaluateConditions = async (
  conditions: RulesCondition[],
  attributes?: SessionAttribute[],
) => {
  const typeControl: RulesTypeControl = {
    [RulesType.CURRENT_PAGE]: true,
    [RulesType.TIME]: true,
    ...(attributes ? { [RulesType.USER_ATTR]: true } : {}),
  };
  const clientContext = getClientContext();

  return await evaluateRulesConditions(conditions, {
    clientContext,
    typeControl,
    customEvaluators: {
      [RulesType.ELEMENT]: isActiveRulesByElement,
      [RulesType.TEXT_INPUT]: isActiveRulesByTextInput,
      [RulesType.TEXT_FILL]: isActiveRulesByTextFill,
    },
    ...(attributes ? convertToAttributeEvaluationOptions(attributes) : {}),
  });
};

/**
 * Convert SessionAttribute array to RulesEvaluationOptions format
 * @param sessionAttributes - Array of session attributes to convert
 * @returns Partial RulesEvaluationOptions for attribute evaluation
 */
export const convertToAttributeEvaluationOptions = (sessionAttributes: SessionAttribute[]) => {
  const attributes: RulesEvaluationOptions['attributes'] = [];
  const userAttributes: RulesEvaluationOptions['userAttributes'] = {};
  const companyAttributes: RulesEvaluationOptions['companyAttributes'] = {};
  const membershipAttributes: RulesEvaluationOptions['membershipAttributes'] = {};

  for (const sessionAttr of sessionAttributes) {
    const { value, ...attributeDefinition } = sessionAttr;

    // Add to attributes definition array (exclude value field)
    attributes?.push(attributeDefinition);

    // Distribute values by business type
    const { codeName, bizType } = sessionAttr;
    if (bizType === AttributeBizTypes.Company) {
      companyAttributes![codeName] = value;
    } else if (bizType === AttributeBizTypes.Membership) {
      membershipAttributes![codeName] = value;
    } else {
      userAttributes![codeName] = value; // Default for User and unknown types
    }
  }

  return { attributes, userAttributes, companyAttributes, membershipAttributes };
};

// ============================================================================
// Content Filtering and Validation Functions
// ============================================================================

/**
 * Check if content is active based on auto-start rules
 * @param content - The SDK content to check
 * @returns True if the content is active, false otherwise
 */
export const isActiveContent = (content: SDKContent) => {
  const { enabledAutoStartRules, autoStartRules } = content.config;
  if (!enabledAutoStartRules || !isConditionsActived(autoStartRules)) {
    return false;
  }
  return true;
};

/**
 * Compare two contents by priority
 * @param a - The first content
 * @param b - The second content
 * @returns Comparison result
 */
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

/**
 * Filter auto-start content by type
 * @param contents - Array of SDK contents
 * @param type - The content type to filter
 * @returns Filtered and sorted contents
 */
export const filterAutoStartContent = (contents: SDKContent[], type: string) => {
  return contents
    .filter((content) => {
      const isActive = isActiveContent(content);
      const isValid = isValidContent(content, contents);
      return content.type === type && isActive && isValid;
    })
    .sort(priorityCompare);
};

/**
 * Check if conditions array contains a specific condition type
 * Recursively checks nested conditions as well
 * @param conditions - Array of rules conditions to check
 * @param type - The condition type to check for
 * @returns True if the specified condition type exists, false otherwise
 */
export const hasConditionType = (conditions: RulesCondition[], type: RulesType): boolean => {
  if (!conditions || conditions.length === 0) {
    return false;
  }

  for (const condition of conditions) {
    // Check if current condition matches the specified type
    if (condition.type === type) {
      return true;
    }

    // Recursively check nested conditions
    if (condition.conditions && condition.conditions.length > 0) {
      if (hasConditionType(condition.conditions, type)) {
        return true;
      }
    }
  }

  return false;
};

/**
 * Check if two content arrays are the same
 * @param source - The source content array
 * @param dest - The destination content array
 * @returns True if the arrays are the same, false otherwise
 */
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

/**
 * Mapping of content types to their show event names
 */
const showEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_STEP_SEEN,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_SEEN,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_SEEN,
};

/**
 * Check if duration between two dates is greater than specified duration
 * @param dateLeft - The left date
 * @param dateRight - The right date
 * @param unit - The unit of time
 * @param duration - The duration value
 * @returns True if the duration is greater, false otherwise
 */
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

/**
 * Validate if content is valid based on various criteria
 * @param content - The SDK content to validate
 * @param contents - Array of all SDK contents for context
 * @returns True if the content is valid, false otherwise
 */
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

// ============================================================================
// Event Finding Functions
// ============================================================================

/**
 * Get the latest event from other content versions
 * @param currentContent - The current content
 * @param contents - Array of all contents
 * @param eventCodeName - The event code name to filter
 * @returns The latest event or undefined
 */
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

/**
 * Find the latest event from an array of business events
 * @param bizEvents - Array of business events to search through
 * @returns The latest event based on creation date
 */
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

// ============================================================================
// Content Status Checking Functions
// ============================================================================

/**
 * Check if a checklist is dismissed
 * @param latestSession - The latest business session
 * @returns The dismissed event if found, undefined otherwise
 */
export const checklistIsDimissed = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED,
  );
};

/**
 * Check if a flow is dismissed
 * @param latestSession - The latest business session
 * @returns The dismissed event if found, undefined otherwise
 */
export const flowIsDismissed = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find((event) => event?.event?.codeName === BizEvents.FLOW_ENDED);
};

/**
 * Check if a launcher is dismissed
 * @param latestSession - The latest business session
 * @returns The dismissed event if found, undefined otherwise
 */
export const launcherIsDismissed = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.LAUNCHER_DISMISSED,
  );
};

/**
 * Check if a flow is seen
 * @param latestSession - The latest business session
 * @returns The seen event if found, undefined otherwise
 */
export const flowIsSeen = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN,
  );
};

/**
 * Check if a checklist is seen
 * @param latestSession - The latest business session
 * @returns The seen event if found, undefined otherwise
 */
export const checklistIsSeen = (latestSession?: BizSession) => {
  return latestSession?.bizEvent?.find(
    (event) => event?.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );
};

// ============================================================================
// Utility Functions
// ============================================================================

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

/**
 * Create a mock user for testing purposes
 * @param userId - Optional user ID
 * @returns Mock user information
 */
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

/**
 * Check if the extension is running
 * @returns True if the extension is running, false otherwise
 */
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

/**
 * Get client context
 * @returns Client context
 */
export const getClientContext = () => {
  return {
    pageUrl: location?.href ?? '',
    viewportWidth: window?.innerWidth ?? 0,
    viewportHeight: window?.innerHeight ?? 0,
  };
};
