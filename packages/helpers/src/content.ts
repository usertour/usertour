import {
  Content,
  ContentConfigObject,
  ContentEditorElementType,
  ContentEditorRoot,
  ContentDataType,
  ContentPriority,
  ContentVersion,
  Environment,
  Frequency,
  FrequencyUnits,
  type RulesFrequencyValue,
  UserTourTypes,
  autoStartRulesSetting,
  type RichTextLeaf,
  type RichTextNode,
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
  startIfNotComplete: false,
  priority: ContentPriority.MEDIUM,
  wait: 0,
};

// Content types that expose the frequency control in their settings. Only
// these get a concrete frequency default (see buildConfig). For other types
// an unset frequency means "no auto-start limit" and must stay unset —
// baking Once in would cap launchers/banners at a single show.
const FREQUENCY_DEFAULT_TYPES = [ContentDataType.FLOW, ContentDataType.CHECKLIST];

// Canonical auto-start frequency default. Single source of truth: the frequency
// picker (condition-frequency.tsx) renders this as its display fallback, and
// buildConfig persists it for frequency-using types (see defaultFrequencyFor),
// so the editor and the saved/evaluated config can't drift. Without a persisted
// frequency the runtime reads "no limit" (isAllowedByAutoStartRulesSetting
// returns true), which lets a flow re-start on every dismiss.
export const DEFAULT_FREQUENCY: RulesFrequencyValue = {
  frequency: Frequency.ONCE,
  every: { times: 2, duration: 1, unit: FrequencyUnits.DAYES },
  atLeast: { duration: 0, unit: FrequencyUnits.MINUTES },
};

// Checklist hides the "at least" control (showAtLeast=false in settings), so it
// omits that field while Flow keeps it.
const defaultFrequencyFor = (contentType: ContentDataType): RulesFrequencyValue =>
  contentType === ContentDataType.CHECKLIST
    ? { frequency: DEFAULT_FREQUENCY.frequency, every: DEFAULT_FREQUENCY.every }
    : DEFAULT_FREQUENCY;

const hideRulesSetting = {};

const defaultContentConfig: ContentConfigObject = {
  enabledAutoStartRules: false,
  enabledHideRules: false,
  autoStartRules: [],
  hideRules: [],
  autoStartRulesSetting: rulesSetting,
  hideRulesSetting,
};

// Flow/Checklist fall back to Once when no frequency is persisted; other types
// keep it unset ("no auto-start limit"). Type-specific so launcher/banner/RC
// stay unrestricted; also heals already-published empty-frequency configs since
// the server's processConfig runs through buildConfig too. Only fills an absent
// frequency — never merges into one the user already set.
const withFrequencyDefault = (
  setting: autoStartRulesSetting,
  contentType: ContentDataType | undefined,
): autoStartRulesSetting =>
  setting.frequency || !contentType || !FREQUENCY_DEFAULT_TYPES.includes(contentType)
    ? setting
    : { ...setting, frequency: defaultFrequencyFor(contentType) };

export const buildConfig = (
  config: ContentConfigObject | undefined,
  contentType: ContentDataType | undefined,
): ContentConfigObject => ({
  ...defaultContentConfig,
  ...config,
  autoStartRulesSetting: withFrequencyDefault(
    deepmerge(rulesSetting, config?.autoStartRulesSetting || {}),
    contentType,
  ),
  hideRulesSetting: config?.hideRulesSetting || {},
});

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

            if (element.element.type === ContentEditorElementType.IMAGE) {
              const link = element.element.link;
              if (link?.data) {
                return {
                  ...element,
                  element: {
                    ...element.element,
                    link: {
                      ...link,
                      url: extractLinkUrl(link.data, userAttributes),
                    },
                  },
                };
              }
            }

            return { ...element };
          }),
        };
      }),
    };
  });
};

/**
 * Serialize a RichTextNode[] (Slate) field to plain text.
 * When userAttributes is provided, user-attribute nodes are resolved to actual values.
 */
const serializeBlockName = (
  name: RichTextNode[] | string | undefined,
  userAttributes?: UserTourTypes.Attributes,
): string => {
  if (!name) return '';
  if (typeof name === 'string') return name;
  const extract = (node: RichTextNode): string => {
    if ('text' in node) return (node as RichTextLeaf).text;
    if (node.type === 'user-attribute') {
      return String(extractUserAttributeValue(node, userAttributes));
    }
    return node.children.map(extract).join('');
  };
  return name.map(extract).join('');
};

export { replaceUserAttr, extractLinkUrl, serializeBlockName };
