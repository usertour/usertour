import { computePosition, hide } from '@floating-ui/dom';
import {
  RulesCondition,
  RulesType,
  BizUserInfo,
  AnswerQuestionDto,
  SessionAttribute,
  AttributeBizTypes,
  RulesEvaluationOptions,
  ContentEditorQuestionElement,
  ContentEditorElementType,
  ContentEditorRoot,
  ContentEditorButtonElement,
} from '@usertour/types';
import { document, location, window } from '@/utils';
import { uuidV4 } from '@usertour/helpers';

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

type ContentEditorChild = ContentEditorRoot['children'][number]['children'][number];

type RulesEvaluatorLike = {
  evaluate: (
    conditions: RulesCondition[],
    sessionAttributes: SessionAttribute[],
  ) => Promise<RulesCondition[]>;
};

export const evaluateButtonConditionsInRoots = async (
  roots: ContentEditorRoot[],
  evaluator: RulesEvaluatorLike,
  sessionAttributes: SessionAttribute[],
): Promise<ContentEditorRoot[]> => {
  const mappedRoots: ContentEditorRoot[] = [];

  for (const root of roots) {
    const mappedColumns = [] as ContentEditorRoot['children'];

    for (const column of root.children) {
      const mappedChildren = [] as ContentEditorChild[];

      for (const child of column.children) {
        mappedChildren.push(
          await evaluateButtonConditionsInChild(child, evaluator, sessionAttributes),
        );
      }

      mappedColumns.push({
        ...column,
        children: mappedChildren,
      });
    }

    mappedRoots.push({
      ...root,
      children: mappedColumns,
    });
  }

  return mappedRoots;
};

const evaluateButtonConditionsInChild = async (
  child: ContentEditorChild,
  evaluator: RulesEvaluatorLike,
  sessionAttributes: SessionAttribute[],
): Promise<ContentEditorChild> => {
  const element = child.element;
  if (element.type !== ContentEditorElementType.BUTTON) {
    return child;
  }

  const buttonElement = element as ContentEditorButtonElement;
  const buttonData = buttonElement.data;
  const disableButtonConditions = Array.isArray(buttonData.disableButtonConditions)
    ? await evaluator.evaluate(buttonData.disableButtonConditions, sessionAttributes)
    : buttonData.disableButtonConditions;
  const hideButtonConditions = Array.isArray(buttonData.hideButtonConditions)
    ? await evaluator.evaluate(buttonData.hideButtonConditions, sessionAttributes)
    : buttonData.hideButtonConditions;

  return {
    ...child,
    element: {
      ...buttonElement,
      data: {
        ...buttonData,
        disableButtonConditions,
        hideButtonConditions,
      },
    },
  };
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

// Module-level URL filter set by UsertourCore.setUrlFilter.
// Since UsertourCore is a singleton, there is no multi-instance concern.
let _urlFilter: ((url: string) => string) | null = null;

/**
 * Sets the module-level URL filter used by getClientContext.
 * Should be kept in sync with UsertourCore.urlFilter.
 */
export const setUrlFilterFn = (filter: ((url: string) => string) | null): void => {
  _urlFilter = filter;
};

/**
 * Applies the current URL filter to a raw URL.
 * Falls back to the raw URL if no filter is set or if the filter throws.
 */
export const applyUrlFilter = (url: string): string => {
  if (!_urlFilter) return url;
  try {
    return _urlFilter(url);
  } catch (error) {
    console.error('Error in urlFilter function:', error);
    return url;
  }
};

/**
 * Get client context
 * The pageUrl is automatically filtered via _urlFilter when set.
 * @returns Client context
 */
export const getClientContext = () => {
  return {
    pageUrl: applyUrlFilter(location?.href ?? ''),
    viewportWidth: window?.innerWidth ?? 0,
    viewportHeight: window?.innerHeight ?? 0,
  };
};
