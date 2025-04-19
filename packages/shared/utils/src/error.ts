import {
  Attribute,
  AttributeDataType,
  ContentActionsItemType,
  ElementSelectorPropsData,
  RulesCondition,
  RulesUserAttributeData,
} from '@usertour-ui/types';

export const isValidSelector = (selector: ElementSelectorPropsData) => {
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

export const getUserAttrError = (
  data: RulesUserAttributeData | undefined,
  attributes: Attribute[],
) => {
  const ret = { showError: false, errorInfo: '' };
  const item = attributes.find((item: Attribute) => item.id === data?.attrId);
  if (!data?.attrId || !item) {
    ret.showError = true;
    ret.errorInfo = 'Please select a attribute';
  } else if (data?.logic === 'between' && (!data?.value || !data?.value2)) {
    ret.showError = true;
    ret.errorInfo = 'Please enter a value';
  } else if (item?.dataType !== AttributeDataType.Boolean) {
    if (data.logic !== 'any' && data.logic !== 'empty') {
      if (item?.dataType === AttributeDataType.List) {
        if (!data.listValues || data.listValues.length === 0) {
          ret.showError = true;
          ret.errorInfo = 'Please enter a value';
        }
      } else {
        if (!data.value || data.value === '') {
          ret.showError = true;
          ret.errorInfo = 'Please enter a value';
        }
      }
    }
  }
  return ret;
};

export const getUrlPatternError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (data.excludes && data.includes && data.excludes.length === 0 && data.includes.length === 0) {
    ret.showError = true;
    ret.errorInfo = 'Enter at least one URL pattern';
  }
  return ret;
};

export const getCurrentTimeError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!data.startDate && !data.endDate) {
    ret.showError = true;
    ret.errorInfo = 'Either start or end time be filled in';
  }
  return ret;
};

export const getWaitError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (data.second === undefined) {
    ret.showError = true;
    ret.errorInfo = 'Enter wait time';
  }
  return ret;
};

export const getElementError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!isValidSelector(data.elementData)) {
    ret.showError = true;
    ret.errorInfo = 'Please select an element';
  }
  return ret;
};

export const getTextInputError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (data.logic !== 'any' && data.logic !== 'empty' && data.value === '') {
    ret.showError = true;
    ret.errorInfo = 'Please enter a value';
  } else if (!isValidSelector(data.elementData)) {
    ret.showError = true;
    ret.errorInfo = 'Please select an element';
  }
  return ret;
};

export const getTextFillError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!isValidSelector(data.elementData)) {
    ret.showError = true;
    ret.errorInfo = 'Please select an element';
  }
  return ret;
};

export const getSegmentError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!data.segmentId) {
    ret.showError = true;
    ret.errorInfo = 'Please select an segment';
  }
  return ret;
};

export const getContentError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!data.contentId) {
    ret.showError = true;
    ret.errorInfo = 'Please select a flow';
  }
  return ret;
};

export const getStepError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (data.stepCvid === undefined) {
    ret.showError = true;
    ret.errorInfo = 'Please select a step';
  }
  return ret;
};

export const getNavitateError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!data.value) {
    ret.showError = true;
    ret.errorInfo = 'Enter the navigator url';
  }
  return ret;
};

export const getCodeError = (data: any) => {
  const ret = { showError: false, errorInfo: '' };
  if (!data.value) {
    ret.showError = true;
    ret.errorInfo = 'Enter the code ';
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
  }
  return false;
};

const errorActionHandlerMapping = {
  [ContentActionsItemType.STEP_GOTO]: getStepError,
  [ContentActionsItemType.PAGE_NAVIGATE]: getNavitateError,
  [ContentActionsItemType.FLOW_START]: getContentError,
  [ContentActionsItemType.JAVASCRIPT_EVALUATE]: getCodeError,
};

export const hasActionError = (conds: RulesCondition[]) => {
  for (const cond of conds) {
    const condType = cond.type as keyof typeof errorActionHandlerMapping;
    const condErroFn = errorActionHandlerMapping[condType];
    if (condErroFn) {
      const { showError } = condErroFn(cond.data);
      if (showError) {
        return true;
      }
    }
    if (cond.conditions) {
      if (hasActionError(cond.conditions) === true) {
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
