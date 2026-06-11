import {
  Attribute,
  AttributeBizTypes,
  AttributeDataType,
  ElementSelectorPropsData,
  EventAttrConditionData,
  EventConditionData,
  EventCountLogic,
  EventTimeLogic,
  RulesCondition,
  RulesUserAttributeData,
} from '@usertour/types';
import { isTimeConditionDataV2, isTimeConditionDataLegacy } from './conditions/time';

// Internal validity predicates backing `hasError`. They only flag whether a
// condition is incomplete — user-facing messaging lives in the i18n'd
// validators in @usertour/business-components.

const isValidSelector = (selector: ElementSelectorPropsData) => {
  if (!selector) {
    return false;
  }
  if (selector.type === 'auto' && !selector.selectors) {
    return false;
  }
  if (selector.type === 'manual' && !selector.customSelector) {
    return false;
  }
  return true;
};

const getUserAttrError = (data: RulesUserAttributeData | undefined, attributes: Attribute[]) => {
  const ret = { showError: false };
  const item = attributes.find((item: Attribute) => item.id === data?.attrId);
  if (!data?.attrId || !item) {
    ret.showError = true;
  } else if (data?.logic === 'between' && (!data?.value || !data?.value2)) {
    ret.showError = true;
  } else if (item?.dataType !== AttributeDataType.Boolean) {
    if (data.logic !== 'any' && data.logic !== 'empty') {
      if (item?.dataType === AttributeDataType.List) {
        if (!data.listValues || data.listValues.length === 0) {
          ret.showError = true;
        }
      } else {
        if (!data.value || data.value === '') {
          ret.showError = true;
        }
      }
    }
  }
  return ret;
};

const getUrlPatternError = (data: any) => {
  const ret = { showError: false };
  const hasExcludes = data.excludes && data.excludes.length > 0;
  const hasIncludes = data.includes && data.includes.length > 0;
  if (!hasExcludes && !hasIncludes) {
    ret.showError = true;
  }
  return ret;
};

const getCurrentTimeError = (data: any) => {
  const ret = { showError: false };

  // Check new format (ISO 8601)
  if (isTimeConditionDataV2(data)) {
    if (!data.startTime && !data.endTime) {
      ret.showError = true;
    }
    return ret;
  }

  // Check legacy format (MM/dd/yyyy)
  if (isTimeConditionDataLegacy(data)) {
    if (!data.startDate && !data.endDate) {
      ret.showError = true;
    }
    return ret;
  }

  // Unknown format or empty data
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    ret.showError = true;
  }

  return ret;
};

const getWaitError = (data: any) => {
  const ret = { showError: false };
  if (data.second === undefined) {
    ret.showError = true;
  }
  return ret;
};

const getElementError = (data: any) => {
  const ret = { showError: false };
  if (!isValidSelector(data.elementData)) {
    ret.showError = true;
  }
  return ret;
};

const getTextInputError = (data: any) => {
  const ret = { showError: false };
  if (data.logic !== 'any' && data.logic !== 'empty' && data.value === '') {
    ret.showError = true;
  } else if (!isValidSelector(data.elementData)) {
    ret.showError = true;
  }
  return ret;
};

const getTextFillError = (data: any) => {
  const ret = { showError: false };
  if (!isValidSelector(data.elementData)) {
    ret.showError = true;
  }
  return ret;
};

const getSegmentError = (data: any) => {
  const ret = { showError: false };
  if (!data.segmentId) {
    ret.showError = true;
  }
  return ret;
};

const getContentError = (data: any) => {
  const ret = { showError: false };
  if (!data.contentId) {
    ret.showError = true;
  }
  return ret;
};

const getEventError = (data: EventConditionData | undefined) => {
  const ret = { showError: false };
  if (!data?.eventId) {
    ret.showError = true;
    return ret;
  }
  if (data.count === undefined || data.count === null) {
    ret.showError = true;
    return ret;
  }
  if (
    data.countLogic === EventCountLogic.BETWEEN &&
    (data.count2 === undefined || data.count2 === null)
  ) {
    ret.showError = true;
    return ret;
  }
  if (
    data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME &&
    (data.windowValue === undefined || data.windowValue === null)
  ) {
    ret.showError = true;
    return ret;
  }
  if (
    data.timeLogic === EventTimeLogic.BETWEEN &&
    (data.windowValue2 === undefined || data.windowValue2 === null)
  ) {
    ret.showError = true;
    return ret;
  }
  return ret;
};

const getEventAttrError = (data: EventAttrConditionData | undefined, attributes: Attribute[]) => {
  const ret = { showError: false };
  const item = attributes.find(
    (attr: Attribute) => attr.id === data?.attrId && attr.bizType === AttributeBizTypes.Event,
  );
  if (!data?.attrId || !item) {
    ret.showError = true;
  } else if (data?.logic === 'between' && (!data?.value || !data?.value2)) {
    ret.showError = true;
  } else if (item?.dataType !== AttributeDataType.Boolean) {
    if (data.logic !== 'any' && data.logic !== 'empty') {
      if (item?.dataType === AttributeDataType.List) {
        if (!data.listValues || data.listValues.length === 0) {
          ret.showError = true;
        }
      } else {
        if (!data.value || data.value === '') {
          ret.showError = true;
        }
      }
    }
  }
  return ret;
};

const errorHandlerMapping = {
  'current-page': getUrlPatternError,
  'user-attr': getUserAttrError,
  time: getCurrentTimeError,
  wait: getWaitError,
  element: getElementError,
  'text-input': getTextInputError,
  'text-fill': getTextFillError,
  segment: getSegmentError,
  content: getContentError,
  event: getEventError,
  'event-attr': getEventAttrError,
};

export const hasError = (conds: RulesCondition[], attributes: Attribute[]) => {
  for (const cond of conds) {
    const condType = cond.type as keyof typeof errorHandlerMapping;
    const condErroFn = errorHandlerMapping[condType];
    if (condErroFn) {
      const { showError } = condErroFn(cond.data, attributes);
      if (showError) {
        return true;
      }
    }
    if (cond.conditions) {
      if (hasError(cond.conditions, attributes) === true) {
        return true;
      }
    }

    if (cond.type === 'event') {
      const whereConditions = (cond.data as { whereConditions?: RulesCondition[] } | undefined)
        ?.whereConditions;
      if (whereConditions && hasError(whereConditions, attributes) === true) {
        return true;
      }
    }
  }
  return false;
};

type ErrorWithMessage = {
  message: string;
};

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    // fallback in case there's an error stringifying the maybeError
    // like with circular references for example.
    return new Error(String(maybeError));
  }
}

export function getErrorMessage(error: unknown) {
  return toErrorWithMessage(error).message;
}
