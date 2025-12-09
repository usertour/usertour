import { computePosition, hide } from '@floating-ui/dom';
import { finderV2 } from '@usertour-packages/finder';
import {
  RulesCondition,
  ElementConditionLogic,
  StringConditionLogic,
  RulesType,
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
import { document, location, off, on, window } from '@/utils';
import { uuidV4, evaluateRulesConditions } from '@usertour/helpers';

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
  // Add null check for data and elementData
  if (!document || !data?.elementData) {
    return false;
  }
  const el = finderV2(data.elementData, document);

  const isPresent = el ? await isVisible(el) : false;

  switch (data.logic) {
    case ElementConditionLogic.PRESENT:
      return isPresent;
    case ElementConditionLogic.UNPRESENT:
      return !isPresent;
    case ElementConditionLogic.DISABLED:
      return el ? isDisabled(el) : false;
    case ElementConditionLogic.UNDISABLED:
      return el ? !isDisabled(el) : false;
    case ElementConditionLogic.CLICKED:
      return el ? isClicked(el) : false;
    case ElementConditionLogic.UNCLICKED:
      return el ? !isClicked(el) : false;
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
  const { data } = rules;
  // Add null check for data and elementData
  if (!document || !data?.elementData) {
    return false;
  }
  const { elementData, logic, value } = data;
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const elValue = el.value ?? '';
  const compareValue = value ?? '';

  switch (logic) {
    case StringConditionLogic.IS:
      return elValue === compareValue;
    case StringConditionLogic.NOT:
      return elValue !== compareValue;
    case StringConditionLogic.CONTAINS:
      return elValue.includes(compareValue);
    case StringConditionLogic.NOT_CONTAIN:
      return !elValue.includes(compareValue);
    case StringConditionLogic.STARTS_WITH:
      return elValue.startsWith(compareValue);
    case StringConditionLogic.ENDS_WITH:
      return elValue.endsWith(compareValue);
    case StringConditionLogic.MATCH:
      return elValue.search(compareValue) !== -1;
    case StringConditionLogic.UNMATCH:
      return elValue.search(compareValue) === -1;
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
  const { data } = rules;
  // Add null check for data and elementData
  if (!document || !data?.elementData) {
    return false;
  }
  const { elementData } = data;
  const el = finderV2(elementData, document) as HTMLInputElement;
  if (!el) {
    return false;
  }
  const now = new Date().getTime();
  const onKeyup = () => {
    const cacheData = fillCache.get(el);
    const fillData = { ...cacheData, timestamp: new Date().getTime() };
    fillCache.set(el, fillData);
  };
  if (fillCache.has(el)) {
    const { timestamp, value, isActive } = fillCache.get(el);
    if (isActive) {
      return true;
    }
    if (timestamp !== -1 && now - timestamp > 1000 && value !== el.value) {
      // BUG FIX: Changed from 'click' to 'keyup' to match the event listener added below
      off(document, 'keyup', onKeyup);
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
    attributes.push(attributeDefinition);

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

// ============================================================================
// Utility Functions
// ============================================================================
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

  return el.dataset.started === 'true';
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
  value: unknown,
  sessionId: string,
): AnswerQuestionDto => {
  const { data, type } = element;

  const eventData: AnswerQuestionDto = {
    questionCvid: data?.cvid ?? '',
    questionName: data?.name ?? '',
    questionType: type,
    sessionId,
  };

  // Handle different question types
  if (element.type === ContentEditorElementType.MULTIPLE_CHOICE) {
    if (element.data.allowMultiple) {
      eventData.listAnswer = value as string[];
    } else {
      eventData.textAnswer = value as string;
    }
  } else if (
    element.type === ContentEditorElementType.SCALE ||
    element.type === ContentEditorElementType.NPS ||
    element.type === ContentEditorElementType.STAR_RATING
  ) {
    eventData.numberAnswer = value as number;
  } else if (
    element.type === ContentEditorElementType.SINGLE_LINE_TEXT ||
    element.type === ContentEditorElementType.MULTI_LINE_TEXT
  ) {
    eventData.textAnswer = value as string;
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
