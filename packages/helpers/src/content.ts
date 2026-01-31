import {
  Content,
  ContentConfigObject,
  ContentEditorElementType,
  ContentEditorRoot,
  ContentPriority,
  ContentVersion,
  Environment,
  UserTourTypes,
  autoStartRulesSetting,
} from '@usertour/types';
import { deepmerge } from 'deepmerge-ts';
import { isUndefined } from './type-utils';

export const isPublishedInAllEnvironments = (
  content: Content | null,
  environmentList: Environment[] | null,
  version: ContentVersion | null,
) => {
  // Early return if any required data is missing
  if (!content?.contentOnEnvironments?.length || !environmentList?.length || !version?.id) {
    return false;
  }

  // Check if all environments have the version published
  return environmentList.every((env) =>
    content?.contentOnEnvironments?.some(
      (item) =>
        item.published && item.publishedVersionId === version.id && item.environment.id === env.id,
    ),
  );
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  if (content?.contentOnEnvironments && content?.contentOnEnvironments?.length > 0) {
    return true;
  }
  return false;
};

const rulesSetting: autoStartRulesSetting = {
  // frequency: {
  //   frequency: Frequency.ONCE,
  //   every: { duration: 0, times: 1, unit: FrequencyUnits.MINUTES },
  //   atLeast: { duration: 0, unit: FrequencyUnits.MINUTES },
  // },
  startIfNotComplete: false,
  priority: ContentPriority.MEDIUM,
  wait: 0,
};

const hideRulesSetting = {};

export const defaultContentConfig: ContentConfigObject = {
  enabledAutoStartRules: false,
  enabledHideRules: false,
  autoStartRules: [],
  hideRules: [],
  autoStartRulesSetting: rulesSetting,
  hideRulesSetting,
};

export const buildConfig = (config: ContentConfigObject | undefined): ContentConfigObject => {
  return {
    ...defaultContentConfig,
    ...config,
    autoStartRulesSetting: deepmerge(
      defaultContentConfig.autoStartRulesSetting,
      config?.autoStartRulesSetting || {},
    ),
    hideRulesSetting: config?.hideRulesSetting || {},
  };
};

/**
 * Extract user attribute value with fallback support
 * Returns the attribute value if it exists (including falsy values like false, 0, ''),
 * otherwise returns the fallback value
 */
const extractUserAttributeValue = (
  element: any,
  userAttributes: UserTourTypes.Attributes | null | undefined,
): any => {
  if (!userAttributes || !('attrCode' in element) || typeof element.attrCode !== 'string') {
    return 'fallback' in element && typeof element.fallback === 'string' ? element.fallback : '';
  }
  const attrValue = userAttributes[element.attrCode];
  const fallback =
    'fallback' in element && typeof element.fallback === 'string' ? element.fallback : '';
  return attrValue ?? fallback;
};

const extractLinkUrl = (value: any[], userAttributes: UserTourTypes.Attributes): string => {
  let url = '';
  try {
    for (const v of value) {
      if ('children' in v && Array.isArray(v.children)) {
        for (const vc of v.children) {
          if ('type' in vc && vc.type === 'user-attribute') {
            url += String(extractUserAttributeValue(vc, userAttributes));
          } else if ('text' in vc && typeof vc.text === 'string') {
            url += vc.text;
          }
        }
      }
    }
  } catch (_) {
    // Silently handle errors and return partial URL
  }
  return url;
};

const replaceUserAttrForElement = (data: any[], userAttributes: UserTourTypes.Attributes) => {
  return data.map((v: any) => {
    if (v.children) {
      v.children = replaceUserAttrForElement(v.children, userAttributes);
    }
    if (v.type === 'user-attribute' && userAttributes) {
      const value = extractUserAttributeValue(v, userAttributes);
      if (!isUndefined(value)) {
        v.value = String(value);
      }
    }
    if (v.type === 'link' && userAttributes) {
      v.url = v.data ? extractLinkUrl(v.data, userAttributes) : '';
    }
    return v;
  });
};

const replaceUserAttr = (
  editorContents: ContentEditorRoot[],
  userAttributes: UserTourTypes.Attributes,
) => {
  return editorContents.map((editorContent: ContentEditorRoot) => {
    if (!editorContent.children) {
      return editorContent;
    }
    return {
      ...editorContent,
      children: editorContent.children.map((column) => {
        if (!column.children) {
          return column;
        }
        return {
          ...column,
          children: column.children.map((element) => {
            if (element.element.type === ContentEditorElementType.TEXT) {
              return {
                ...element,
                element: {
                  ...element.element,
                  data: replaceUserAttrForElement(element.element.data, userAttributes),
                },
              };
            }
            return { ...element };
          }),
        };
      }),
    };
  });
};

export { replaceUserAttr, extractLinkUrl };
