import {
  BizEvents,
  ContentDataType,
  Frequency,
  FrequencyUnits,
  ContentPriority,
  RulesType,
  RulesEvaluationOptions,
  RulesCondition,
  ContentEditorRoot,
  ContentEditorElementType,
} from '@usertour/types';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
} from 'date-fns';
import { CustomContentVersion } from '@/common/types/content';
import {
  BizEventWithEvent,
  BizSessionWithEvents,
  ContentWithContentOnEnvironments,
  Step,
} from '@/common/types/schema';
import {
  isUndefined,
  isConditionsActived,
  filterConditionsByType,
  evaluateRulesConditions,
  cuid,
} from '@usertour/helpers';
import { TrackCondition } from '@/common/types/sdk';

export const PRIORITIES = [
  ContentPriority.HIGHEST,
  ContentPriority.HIGH,
  ContentPriority.MEDIUM,
  ContentPriority.LOW,
  ContentPriority.LOWEST,
];

/**
 * Checks if the auto-start rules are activated for a custom content version
 * @param customContentVersion - The custom content version to check
 * @returns True if the auto-start rules are activated, false otherwise
 */
export const isActivedAutoStartRules = (customContentVersion: CustomContentVersion) => {
  const { autoStartRules } = customContentVersion.config;
  if (!isEnabledAutoStartRules(customContentVersion) || !isConditionsActived(autoStartRules)) {
    return false;
  }
  return true;
};

/**
 * Checks if the hide rules are activated for a custom content version
 * @param customContentVersion - The custom content version to check
 * @returns True if the hide rules are activated, false otherwise
 */
export const isActivedHideRules = (customContentVersion: CustomContentVersion) => {
  const { hideRules } = customContentVersion.config;
  if (!isEnabledHideRules(customContentVersion) || !isConditionsActived(hideRules)) {
    return false;
  }
  return true;
};

/**
 * Checks if the hide rules are enabled for a custom content version
 * @param customContentVersion - The custom content version to check
 * @returns True if the hide rules are enabled, false otherwise
 */
export const isEnabledHideRules = (customContentVersion: CustomContentVersion) => {
  const { enabledHideRules, hideRules } = customContentVersion.config;
  if (!enabledHideRules || hideRules.length === 0) {
    return false;
  }
  return true;
};

/**
 * Checks if the auto-start rules are enabled for a custom content version
 * @param customContentVersion - The custom content version to check
 * @returns True if the auto-start rules are enabled, false otherwise
 */
export const isEnabledAutoStartRules = (customContentVersion: CustomContentVersion) => {
  const { enabledAutoStartRules, autoStartRules } = customContentVersion.config;
  if (!enabledAutoStartRules || autoStartRules.length === 0) {
    return false;
  }
  return true;
};

/**
 * Compares two custom content versions based on their priority
 * @param a - The first custom content version
 * @param b - The second custom content version
 * @returns 1 if a is greater than b, -1 if a is less than b, 0 if they are equal
 */
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

const showEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_STEP_SEEN,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_SEEN,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_SEEN,
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

export const isAllowedByAutoStartRulesSetting = (
  customContentVersion: CustomContentVersion,
  customContentVersions: CustomContentVersion[],
) => {
  const now = new Date();

  const { frequency, startIfNotComplete } = customContentVersion.config.autoStartRulesSetting;
  const completedSessions = customContentVersion.session.completedSessions;
  const dismissedSessions = customContentVersion.session.dismissedSessions;

  // if the content is completed, it will not be shown again when startIfNotComplete is true
  if (startIfNotComplete && completedSessions > 0) {
    return false;
  }

  // if the frequency is not set, the content will be shown
  if (!frequency) {
    return true;
  }

  const contentType = customContentVersion.content.type as
    | ContentDataType.FLOW
    | ContentDataType.LAUNCHER
    | ContentDataType.CHECKLIST;

  const lastEventName = showEventMapping[contentType];
  const lastEvent = getLatestEvent(customContentVersion, customContentVersions, lastEventName);
  const contentEvents = customContentVersion.session.latestSession?.bizEvent;

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

/**
 * Finds the latest step number from step seen events
 * @param bizEvents Array of business events to search through
 * @returns The latest step number or -1 if no steps were seen
 */
export const findLatestStepNumber = (bizEvents: BizEventWithEvent[] | undefined): number => {
  if (!bizEvents?.length || flowIsDismissed(bizEvents)) {
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

export const checklistIsDimissed = (bizEvents: BizEventWithEvent[] | undefined) => {
  return bizEvents?.find((event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED);
};

export const flowIsDismissed = (bizEvents: BizEventWithEvent[] | undefined) => {
  return bizEvents?.find((event) => event?.event?.codeName === BizEvents.FLOW_ENDED);
};

/**
 * Filters the available auto-start custom content versions
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @returns The available auto-start custom content versions
 */
export const filterAvailableAutoStartContentVersions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
) => {
  return customContentVersions
    .filter((customContentVersion) => {
      const isAutoStart = isActivedAutoStartRules(customContentVersion);
      const isAllowed = isAllowedByAutoStartRulesSetting(
        customContentVersion,
        customContentVersions,
      );
      return customContentVersion.content.type === contentType && isAutoStart && isAllowed;
    })
    .sort(priorityCompare);
};

/**
 * Finds the available session ID
 * @param latestSession - The latest session
 * @param contentType - The content type
 * @returns The available session ID
 */
export const findAvailableSessionId = (
  latestSession: BizSessionWithEvents,
  contentType: ContentDataType,
) => {
  if (contentType === ContentDataType.CHECKLIST) {
    if (latestSession && !checklistIsDimissed(latestSession.bizEvent)) {
      return latestSession.id;
    }
  } else if (contentType === ContentDataType.FLOW) {
    if (latestSession && !flowIsDismissed(latestSession.bizEvent)) {
      return latestSession.id;
    }
  }
  return undefined;
};

/**
 * Finds the latest activated custom content version
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @returns The latest activated custom content version
 */
export const findLatestActivatedCustomContentVersion = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
): CustomContentVersion | undefined => {
  return customContentVersions
    .filter((customContentVersion) => {
      const hasAvailableSession = findAvailableSessionId(
        customContentVersion.session.latestSession,
        contentType,
      );
      return hasAvailableSession && customContentVersion.session.latestSession?.createdAt;
    })
    .sort(
      (a, b) =>
        new Date(b.session.latestSession!.createdAt).getTime() -
        new Date(a.session.latestSession!.createdAt).getTime(),
    )?.[0];
};

/**
 * Finds the custom content version by content ID
 * @param customContentVersions - The custom content versions
 * @param contentId - The content ID
 * @returns The custom content version
 */
export const findCustomContentVersionByContentId = (
  customContentVersions: CustomContentVersion[],
  contentId: string,
): CustomContentVersion | undefined => {
  return customContentVersions.find((contentVersion) => contentVersion.contentId === contentId);
};

/**
 * Finds the activated custom content version
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @param contentId - The content ID
 * @returns The activated custom content version
 */
export const findActivatedCustomContentVersion = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType.CHECKLIST | ContentDataType.FLOW,
  contentId?: string,
): CustomContentVersion | undefined => {
  if (contentId) {
    const contentVersion = findCustomContentVersionByContentId(customContentVersions, contentId);
    if (contentVersion) {
      return contentVersion;
    }
  }

  // if the latest activated content version is found, return it
  const latestActivatedContentVersion = findLatestActivatedCustomContentVersion(
    customContentVersions,
    contentType,
  );
  if (latestActivatedContentVersion) {
    return latestActivatedContentVersion;
  }
  // if the latest activated content version is not found, return the first available auto-start content version
  return filterAvailableAutoStartContentVersions(customContentVersions, contentType)?.[0];
};

/**
 * Filters activated custom content versions that do not have client-side conditions
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @returns Array of activated custom content versions without client conditions
 */
export const filterActivatedContentWithoutClientConditions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType,
): CustomContentVersion[] => {
  // Define the condition types to filter by
  const allowedConditionTypes = [
    RulesType.USER_ATTR,
    RulesType.SEGMENT,
    RulesType.CONTENT,
    RulesType.TIME,
    RulesType.CURRENT_PAGE,
  ];

  return customContentVersions.filter((customContentVersion) => {
    // Check if content type matches
    if (customContentVersion.content.type !== contentType) {
      return false;
    }

    // Check if auto-start rules are enabled
    if (!customContentVersion.config.enabledAutoStartRules) {
      return false;
    }

    if (!isAllowedByAutoStartRulesSetting(customContentVersion, customContentVersions)) {
      return false;
    }

    // Filter conditions by allowed types
    const filteredConditions = filterConditionsByType(
      customContentVersion.config.autoStartRules,
      allowedConditionTypes,
    );

    // Check if filtered conditions are activated
    if (!isConditionsActived(filteredConditions)) {
      return false;
    }

    return true;
  });
};

/**
 * Evaluates the custom content versions
 * @param customContentVersions - The custom content versions
 * @param options - The options
 * @returns The evaluated custom content versions
 */
export const evaluateCustomContentVersion = async (
  customContentVersions: CustomContentVersion[],
  options: RulesEvaluationOptions,
): Promise<CustomContentVersion[]> => {
  return await Promise.all(
    customContentVersions.map(async (customContentVersion) => {
      return {
        ...customContentVersion,
        config: {
          ...customContentVersion.config,
          autoStartRules: await evaluateRulesConditions(
            customContentVersion.config.autoStartRules,
            options,
          ),
          hideRules: await evaluateRulesConditions(customContentVersion.config.hideRules, options),
        },
      };
    }),
  );
};

/**
 * Regenerates IDs for each item in RulesCondition array using cuid
 * @param conditions - Array of rules conditions to process
 * @returns Array of rules conditions with new IDs
 */
export const regenerateConditionIds = (conditions: RulesCondition[]): RulesCondition[] => {
  return conditions.map((condition) => ({
    ...condition,
    id: cuid(),
    conditions: condition.conditions ? regenerateConditionIds(condition.conditions) : undefined,
  }));
};

/**
 * Recursively extracts all nested conditions from a RulesCondition array, filtering by specific types
 * @param conditions - Array of rules conditions to flatten
 * @param allowedTypes - Array of allowed condition types to filter by
 * @returns Flattened array of all conditions including nested ones, filtered by allowed types
 */
export const flattenConditions = (
  conditions: RulesCondition[],
  allowedTypes: RulesType[],
): RulesCondition[] => {
  const allConditions: RulesCondition[] = [];

  for (const condition of conditions) {
    // Only include conditions of specific types
    if (allowedTypes.includes(condition.type as RulesType)) {
      allConditions.push(condition);
    }

    // Recursively extract nested conditions
    if (condition.conditions && condition.conditions.length > 0) {
      allConditions.push(...flattenConditions(condition.conditions, allowedTypes));
    }
  }

  return allConditions;
};

/**
 * Get the published version ID for a content in a specific environment
 * @param content - The content to get the published version ID for
 * @param environmentId - The ID of the environment
 * @returns The published version ID
 */
export const getPublishedVersionId = (
  content: ContentWithContentOnEnvironments,
  environmentId: string,
): string | undefined => {
  return content.contentOnEnvironments.find(
    (item) => item.environmentId === environmentId && item.published,
  )?.publishedVersionId;
};

/**
 * Enum for condition extraction mode
 */
export enum ConditionExtractionMode {
  AUTO_START_ONLY = 'auto_start_only',
  HIDE_ONLY = 'hide_only',
  BOTH = 'both',
}

/**
 * Extracts all track conditions from custom content versions grouped by content version
 * @param customContentVersions - The custom content versions
 * @param allowedTypes - Array of allowed condition types to filter by (defaults to ELEMENT, TEXT_INPUT, TEXT_FILL)
 * @param extractionMode - Mode to control which conditions to extract (defaults to BOTH)
 * @returns Array of track conditions based on the extraction mode
 */
export const extractTrackConditions = (
  customContentVersions: CustomContentVersion[],
  allowedTypes: RulesType[] = [RulesType.ELEMENT, RulesType.TEXT_INPUT, RulesType.TEXT_FILL],
  extractionMode: ConditionExtractionMode = ConditionExtractionMode.BOTH,
): TrackCondition[] => {
  const result: TrackCondition[] = [];

  for (const customContentVersion of customContentVersions) {
    const conditions: RulesCondition[] = [];

    // Extract conditions based on the specified mode
    if (
      extractionMode === ConditionExtractionMode.AUTO_START_ONLY ||
      extractionMode === ConditionExtractionMode.BOTH
    ) {
      if (isEnabledAutoStartRules(customContentVersion)) {
        const autoStartConditions = flattenConditions(
          customContentVersion.config.autoStartRules,
          allowedTypes,
        );
        conditions.push(...autoStartConditions);
      }
    }

    if (
      extractionMode === ConditionExtractionMode.HIDE_ONLY ||
      extractionMode === ConditionExtractionMode.BOTH
    ) {
      if (isEnabledHideRules(customContentVersion)) {
        const hideConditions = flattenConditions(
          customContentVersion.config.hideRules,
          allowedTypes,
        );
        conditions.push(...hideConditions);
      }
    }

    for (const condition of conditions) {
      result.push({
        contentId: customContentVersion.contentId,
        contentType: customContentVersion.content.type as ContentDataType,
        versionId: customContentVersion.id,
        condition,
      });
    }
  }

  return result;
};

/**
 * Extracts client track conditions from custom content versions
 * @param customContentVersions - The custom content versions
 * @param extractionMode - The extraction mode
 * @returns The client track conditions
 */
export const extractClientTrackConditions = (
  customContentVersions: CustomContentVersion[],
  extractionMode: ConditionExtractionMode = ConditionExtractionMode.BOTH,
): TrackCondition[] => {
  const clientConditionTypes = [RulesType.ELEMENT, RulesType.TEXT_INPUT, RulesType.TEXT_FILL];
  return extractTrackConditions(customContentVersions, clientConditionTypes, extractionMode);
};

/**
 * Recursively extracts attribute IDs from rules conditions
 * @param conditions - Array of rules conditions
 * @returns Array of unique attribute IDs
 */
export const extractAttributeIdsFromConditions = (conditions: RulesCondition[]): string[] => {
  const attrIds: string[] = [];

  for (const condition of conditions) {
    if (condition.type === RulesType.USER_ATTR && condition.data?.attrId) {
      attrIds.push(condition.data.attrId);
    }

    // Handle nested conditions (group type)
    if (
      condition.type === RulesType.GROUP &&
      condition.conditions &&
      condition.conditions.length > 0
    ) {
      attrIds.push(...extractAttributeIdsFromConditions(condition.conditions));
    }
  }

  return attrIds;
};

/**
 * Extracts trigger attribute IDs from steps
 * @param steps - Array of steps
 * @returns Array of unique attribute IDs
 */
export const extractTriggerAttributeIds = (steps: Step[]): string[] => {
  const processedAttrIds = new Set<string>(); // Track processed attribute IDs to avoid duplicates

  for (const step of steps) {
    if (step.trigger && Array.isArray(step.trigger)) {
      for (const trigger of step.trigger) {
        // Type assertion to handle JsonValue type
        const typedTrigger = trigger as any;
        if (typedTrigger?.conditions && Array.isArray(typedTrigger.conditions)) {
          // Recursively extract attribute IDs from nested conditions
          const attrIds = extractAttributeIdsFromConditions(typedTrigger.conditions);

          for (const attrId of attrIds) {
            if (!processedAttrIds.has(attrId)) {
              processedAttrIds.add(attrId);
            }
          }
        }
      }
    }
  }

  return Array.from(processedAttrIds);
};

/**
 * Get attribute value from data object using attribute code name
 * @param data - Data object containing attribute values
 * @param codeName - Attribute code name
 * @returns Attribute value or null if not found
 */
export const getAttributeValue = (data: any, codeName: string): any => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return data[codeName] ?? null;
};

/**
 * Recursively extracts user attribute codes from data array
 * @param data - Array of data to search through
 * @returns Array of attribute codes
 */
const extractAttrCodesRecursively = (data: any[]): string[] => {
  const attrCodes: string[] = [];

  for (const v of data) {
    if (v.children) {
      attrCodes.push(...extractAttrCodesRecursively(v.children));
    }
    if (v.type === 'user-attribute' && v.attrCode) {
      attrCodes.push(v.attrCode);
    }
    if (v.type === 'link' && v.data) {
      attrCodes.push(...extractAttrCodesRecursively(v.data));
    }
  }

  return attrCodes;
};

/**
 * Extracts all user attribute codes from editor contents
 * @param editorContents - Array of editor content roots to search through
 * @returns Array of unique user attribute codes found in the content
 */
export const extractUserAttrCodes = (editorContents: ContentEditorRoot[]): string[] => {
  const allAttrCodes: string[] = [];

  for (const editorContent of editorContents) {
    if (!editorContent.children) {
      continue;
    }

    for (const column of editorContent.children) {
      if (!column.children) {
        continue;
      }

      for (const element of column.children) {
        if (element.element.type === ContentEditorElementType.TEXT && element.element.data) {
          const attrCodes = extractAttrCodesRecursively(element.element.data);
          allAttrCodes.push(...attrCodes);
        }
      }
    }
  }

  // Return unique attribute codes
  return [...new Set(allAttrCodes)];
};
