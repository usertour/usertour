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
  ThemeVariation,
  EventAttributes,
  ChecklistItemType,
  ChecklistData,
  ChecklistInitialDisplay,
} from '@usertour/types';
import {
  SessionAttribute,
  SessionTheme,
  SessionStep,
  ConditionWaitTimer,
  ClientCondition,
  ConditionExtractionMode,
  CustomContentVersion,
  BizEventWithEvent,
  BizSessionWithEvents,
  ContentWithContentOnEnvironments,
  Step,
  TrackCondition,
  CustomContentSession,
} from '@/common/types';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  isAfter,
} from 'date-fns';
import {
  isUndefined,
  isConditionsActived,
  filterConditionsByType,
  evaluateRulesConditions,
  cuid,
  isEqual,
} from '@usertour/helpers';

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

export const findLatestStepCvid = (
  bizEvents: BizEventWithEvent[] | undefined,
): string | undefined => {
  try {
    if (!bizEvents?.length || flowIsDismissed(bizEvents)) {
      return undefined;
    }
    const latestStepSeenEvent = findLatestStepSeenEvent(bizEvents);
    if (!latestStepSeenEvent) {
      return undefined;
    }
    const data = latestStepSeenEvent.data as Record<string, unknown>;
    if (isUndefined(data[EventAttributes.FLOW_STEP_CVID])) {
      return undefined;
    }
    return data[EventAttributes.FLOW_STEP_CVID] as string;
  } catch (_) {
    return undefined;
  }
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
 * Checks if a custom content version is allowed based on wait timer conditions
 * @param customContentVersion - The custom content version to check
 * @param firedWaitTimerVersionIds - Optional array of version IDs that have fired wait timers
 * @returns True if the content is allowed based on wait timer conditions, false otherwise
 */
export const isAllowedByConditionWaitTimers = (
  customContentVersion: CustomContentVersion,
  firedWaitTimerVersionIds?: string[],
): boolean => {
  const waitTime = customContentVersion.config.autoStartRulesSetting.wait;

  // If no wait time is set, allow the content
  if (!waitTime) {
    return true;
  }

  // Only allow content with wait timer if it has been fired
  if (firedWaitTimerVersionIds?.includes(customContentVersion.id)) {
    // Wait timer has been fired, allow this content
    return true;
  }

  // Wait timer not fired yet, skip this content
  return false;
};

/**
 * Checks if content version is allowed to start based on hide rules
 * @param customContentVersion - The content version to check
 * @param clientConditions - Current client conditions for hide rules validation
 * @returns True if content version is allowed to start, false if blocked by hide rules
 */
export const isAllowedByHideRules = (
  customContentVersion: CustomContentVersion,
  clientConditions: ClientCondition[],
): boolean => {
  if (!isEnabledHideRules(customContentVersion)) {
    return true;
  }

  // Check if hide rules are activated and blocking the content
  if (isActivedHideRules(customContentVersion)) {
    return false;
  }

  const hideRules = customContentVersion.config.hideRules;
  // Check if hide rules are enabled but conditions are not ready
  if (!conditionsIsReady(hideRules, clientConditions)) {
    console.log('hideRules are enabled but conditions are not ready', clientConditions, hideRules);
    return false;
  }

  return true;
};

/**
 * Filters the available auto-start custom content versions
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @param includeWaitTimer - Whether to include wait timer conditions in the filtering
 * @param firedWaitTimerVersionIds - Optional array of version IDs that have fired wait timers
 * @returns The available auto-start custom content versions
 */
export const filterAvailableAutoStartContentVersions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType,
  clientConditions: ClientCondition[],
  includeWaitTimer: boolean,
  firedWaitTimerVersionIds?: string[],
) => {
  return customContentVersions
    .filter((customContentVersion) => {
      // Early return if content type doesn't match
      if (customContentVersion.content.type !== contentType) {
        return false;
      }

      // Check auto-start rules activation
      if (!isActivedAutoStartRules(customContentVersion)) {
        return false;
      }

      // Check auto-start rules settings
      if (!isAllowedByAutoStartRulesSetting(customContentVersion, customContentVersions)) {
        return false;
      }

      if (!isAllowedByHideRules(customContentVersion, clientConditions)) {
        return false;
      }

      // Check wait timer conditions if enabled
      if (
        includeWaitTimer &&
        !isAllowedByConditionWaitTimers(customContentVersion, firedWaitTimerVersionIds)
      ) {
        return false;
      }

      return true;
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
 * Checks if a session is available
 * @param latestSession - The latest session
 * @param contentType - The content type
 * @returns True if the session is available, false otherwise
 */
export const sessionIsAvailable = (
  latestSession: BizSessionWithEvents,
  contentType: ContentDataType,
): boolean => {
  if (contentType === ContentDataType.CHECKLIST) {
    if (latestSession && !checklistIsDimissed(latestSession.bizEvent)) {
      return true;
    }
  } else if (contentType === ContentDataType.FLOW) {
    if (latestSession && !flowIsDismissed(latestSession.bizEvent)) {
      return true;
    }
  }
  return false;
};

/**
 * Finds the latest activated custom content version
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @returns The latest activated custom content version
 */
export const findLatestActivatedCustomContentVersions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType,
  clientConditions: ClientCondition[],
): CustomContentVersion[] | undefined => {
  return customContentVersions
    .filter((customContentVersion) => {
      return (
        sessionIsAvailable(customContentVersion.session.latestSession, contentType) &&
        isAllowedByHideRules(customContentVersion, clientConditions) &&
        customContentVersion.session.latestSession?.createdAt
      );
    })
    .sort(
      (a, b) =>
        new Date(b.session.latestSession!.createdAt).getTime() -
        new Date(a.session.latestSession!.createdAt).getTime(),
    );
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
 * Filters activated custom content versions that do not have client-side conditions
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @returns Array of activated custom content versions without client conditions
 */
export const filterActivatedContentWithoutClientConditions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType,
): CustomContentVersion[] => {
  // Early return if no content versions provided
  if (!customContentVersions?.length) {
    return [];
  }

  // Define the condition types to filter by (server-side only conditions)
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

    // Check if hide rules are activated and blocking the content
    if (isActivedHideRules(customContentVersion)) {
      return false;
    }

    // Path 1: Check auto-start content versions
    if (
      isAutoStartContentEligible(customContentVersion, customContentVersions, allowedConditionTypes)
    ) {
      return true;
    }

    // Path 2: Check activated content versions (session-based)
    return sessionIsAvailable(customContentVersion.session.latestSession, contentType);
  });
};

/**
 * Helper function to check if auto-start content is eligible
 * @param customContentVersion - The content version to check
 * @param allContentVersions - All content versions for context
 * @param allowedConditionTypes - Allowed condition types for filtering
 * @returns True if the content is eligible for auto-start
 */
const isAutoStartContentEligible = (
  customContentVersion: CustomContentVersion,
  allContentVersions: CustomContentVersion[],
  allowedConditionTypes: RulesType[],
): boolean => {
  // Check if auto-start rules are enabled
  if (!isEnabledAutoStartRules(customContentVersion)) {
    return false;
  }

  // Check auto-start rules settings
  if (!isAllowedByAutoStartRulesSetting(customContentVersion, allContentVersions)) {
    return false;
  }

  // Filter conditions by allowed types and check if they are activated
  const filteredConditions = filterConditionsByType(
    customContentVersion.config.autoStartRules,
    allowedConditionTypes,
  );

  return isConditionsActived(filteredConditions);
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
 * Recursively extracts all condition IDs from a RulesCondition array including nested conditions
 * @param conditions - Array of rules conditions to extract IDs from
 * @returns Array of all condition IDs including nested ones
 */
export const extractConditionIds = (conditions: RulesCondition[]): string[] => {
  const allIds: string[] = [];

  for (const condition of conditions) {
    // Add current condition ID if it exists
    if (condition.id) {
      allIds.push(condition.id);
    }

    // Recursively extract IDs from nested conditions
    if (condition.conditions && condition.conditions.length > 0) {
      allIds.push(...extractConditionIds(condition.conditions));
    }
  }

  return allIds;
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
 * Extracts client wait timer conditions from custom content versions
 * @param customContentVersions - The custom content versions
 * @returns The client wait timer conditions
 */
export const extractClientConditionWaitTimers = (
  customContentVersions: CustomContentVersion[],
): ConditionWaitTimer[] => {
  const waitTimers: ConditionWaitTimer[] = [];
  for (const customContentVersion of customContentVersions) {
    if (
      isEnabledAutoStartRules(customContentVersion) &&
      customContentVersion.config.autoStartRulesSetting.wait > 0
    ) {
      waitTimers.push({
        contentId: customContentVersion.contentId,
        contentType: customContentVersion.content.type as ContentDataType,
        versionId: customContentVersion.id,
        waitTime: customContentVersion.config.autoStartRulesSetting.wait,
      });
    }
  }
  return waitTimers;
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

/**
 * Extracts all attribute IDs from theme variations
 * @param themeVariations - Array of theme variations
 * @returns Array of unique attribute IDs
 */
export const extractThemeVariationsAttributeIds = (themeVariations: ThemeVariation[]): string[] => {
  if (!themeVariations || !Array.isArray(themeVariations)) {
    return [];
  }

  const attrIds: string[] = [];
  for (const themeVariation of themeVariations) {
    if (themeVariation?.conditions) {
      attrIds.push(...extractAttributeIdsFromConditions(themeVariation.conditions));
    }
  }
  return attrIds;
};

/**
 * Extracts trigger attribute IDs from steps
 * @param steps - Array of steps
 * @returns Array of unique attribute IDs
 */
export const extractStepTriggerAttributeIds = (steps: Step[]): string[] => {
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
 * Extracts all user attribute codes from step contents
 * @param steps - Array of steps
 * @returns Array of unique user attribute codes found in the step contents
 */
export const extractStepContentAttrCodes = (steps: Step[]): string[] => {
  const attrCodes: string[] = [];
  for (const step of steps) {
    if (step.data) {
      attrCodes.push(...extractUserAttrCodes(step.data as unknown as ContentEditorRoot[]));
    }
  }
  return attrCodes;
};

// ===== SESSION COMPARISON UTILITIES =====

/**
 * Check if session attributes have changes
 * @param oldAttributes - The original attributes
 * @param newAttributes - The new attributes
 * @returns True if there are differences
 */
export const hasSessionAttributeChanges = (
  oldAttributes: SessionAttribute[],
  newAttributes: SessionAttribute[],
): boolean => {
  if (oldAttributes.length !== newAttributes.length) {
    return true;
  }

  const sortedOld = [...oldAttributes].sort((a, b) => a.id.localeCompare(b.id));
  const sortedNew = [...newAttributes].sort((a, b) => a.id.localeCompare(b.id));

  return !isEqual(sortedOld, sortedNew);
};

/**
 * Check if theme variations have changes
 * @param oldVariations - The original variations
 * @param newVariations - The new variations
 * @returns True if there are differences
 */
const hasThemeVariationChanges = (
  oldVariations: ThemeVariation[] | undefined,
  newVariations: ThemeVariation[] | undefined,
): boolean => {
  const oldVars = oldVariations || [];
  const newVars = newVariations || [];

  if (oldVars.length !== newVars.length) {
    return true;
  }

  const sortedOld = [...oldVars].sort((a, b) => a.id.localeCompare(b.id));
  const sortedNew = [...newVars].sort((a, b) => a.id.localeCompare(b.id));

  return !isEqual(sortedOld, sortedNew);
};

/**
 * Check if session themes have changes with smart comparison for variations and attributes
 * @param oldTheme - The original theme
 * @param newTheme - The new theme
 * @returns True if there are differences
 */
export const hasSessionThemeChanges = (
  oldTheme: SessionTheme | undefined,
  newTheme: SessionTheme | undefined,
): boolean => {
  // Handle null/undefined cases
  if (!oldTheme && !newTheme) {
    return false;
  }
  if (!oldTheme || !newTheme) {
    return true;
  }

  // Compare settings (deep comparison for theme settings)
  if (!isEqual(oldTheme.settings, newTheme.settings)) {
    return true;
  }

  // Check variations changes by ID
  if (hasThemeVariationChanges(oldTheme.variations, newTheme.variations)) {
    return true;
  }

  // Check theme attributes changes
  if (hasSessionAttributeChanges(oldTheme.attributes || [], newTheme.attributes || [])) {
    return true;
  }

  return false;
};

/**
 * Check if session steps have changes with smart theme comparison
 * @param oldSteps - The original steps
 * @param newSteps - The new steps
 * @returns True if there are differences
 */
export const hasSessionStepChanges = (
  oldSteps: SessionStep[],
  newSteps: SessionStep[],
): boolean => {
  if (oldSteps.length !== newSteps.length) {
    return true;
  }

  const sortedOld = [...oldSteps].sort((a, b) => a.cvid.localeCompare(b.cvid));
  const sortedNew = [...newSteps].sort((a, b) => a.cvid.localeCompare(b.cvid));

  return !isEqual(sortedOld, sortedNew);
};

/**
 * Check if checklist items have changes
 * @param oldItems - The old items
 * @param newItems - The new items
 * @returns True if there are differences
 */
export const hasChecklistItemChanges = (
  oldItems: ChecklistItemType[],
  newItems: ChecklistItemType[],
) => {
  if (oldItems.length !== newItems.length) {
    return true;
  }

  // Check if any changes occurred
  return oldItems.some((item) => {
    const newItem = newItems.find((newItem) => newItem.id === item.id);
    return (
      newItem &&
      (item.isCompleted !== newItem.isCompleted ||
        item.isVisible !== newItem.isVisible ||
        item.isShowAnimation !== newItem.isShowAnimation)
    );
  });
};

/**
 * Checks if all condition IDs in rules conditions exist and are ready in client conditions
 * @param conditions - Array of rules conditions (hideRules, autoStartRules, etc.)
 * @param clientConditions - Array of client conditions from Redis socket data
 * @returns True if all condition IDs exist and are ready (have isActive status), false otherwise
 */
export const conditionsIsReady = (
  conditions: RulesCondition[],
  clientConditions: ClientCondition[],
  allowedTypes: RulesType[] = [RulesType.ELEMENT, RulesType.TEXT_INPUT, RulesType.TEXT_FILL],
): boolean => {
  if (!clientConditions || clientConditions.length === 0) {
    return false;
  }

  const allowedConditions = flattenConditions(conditions, allowedTypes);
  console.log('conditionIds', allowedConditions);
  const clientConditionIds = clientConditions
    .filter((cc) => cc.isActive !== undefined)
    .map((cc) => cc.conditionId);
  console.log('clientConditionIds', clientConditionIds);

  // Check if all condition IDs exist in client conditions with feedback
  return allowedConditions.every((conditions) => clientConditionIds.includes(conditions.id));
};

/**
 * Resolve clientConditions with latest states from clientConditionReports
 * @param clientConditions - Business conditions (metadata)
 * @param clientConditionReports - Client feedback conditions
 * @returns Resolved clientConditions with latest states
 */
export const resolveConditionStates = (
  clientConditions: ClientCondition[],
  clientConditionReports: ClientCondition[],
): ClientCondition[] => {
  // Create a map of client reports for quick lookup
  const reportsMap = new Map(
    clientConditionReports.map((report) => [report.conditionId, report.isActive]),
  );

  // Update clientConditions with latest states from reports
  return clientConditions.map((condition) => {
    const reportValue = reportsMap.get(condition.conditionId);
    return {
      ...condition,
      isActive: reportValue !== undefined ? reportValue : condition.isActive,
    };
  });
};

/**=========================== CHECKLIST UTILITIES ================================**/

/**
 * Gets the initial display of a checklist
 * @param checklist - The checklist to get the initial display of
 * @returns The initial display of the checklist
 */
export const getChecklistInitialDisplay = (
  customContentVersion: CustomContentVersion,
): ChecklistInitialDisplay => {
  const latestSession = customContentVersion.session.latestSession;
  const checklistData = customContentVersion.data as unknown as ChecklistData;
  if (!latestSession || checklistIsDimissed(latestSession.bizEvent)) {
    return checklistData.initialDisplay;
  }
  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const hiddenOrSeenEvents = latestSession.bizEvent?.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_HIDDEN ||
      event.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );

  if (!hiddenOrSeenEvents || hiddenOrSeenEvents.length === 0) {
    return checklistData.initialDisplay;
  }

  // Get the latest hidden or seen event
  const latestHiddenOrSeenEvent = hiddenOrSeenEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return ChecklistInitialDisplay.EXPANDED;
  }

  return ChecklistInitialDisplay.BUTTON;
};

/**
 * Checks if a checklist item is clicked
 * @param content - The content to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is clicked, false otherwise
 */
const checklistItemIsClicked = (
  customContentVersion: CustomContentVersion,
  checklistItem: ChecklistItemType,
) => {
  const latestSession = customContentVersion.session.latestSession;
  if (!latestSession) {
    return false;
  }
  const bizEvents = latestSession.bizEvent || [];
  return !!bizEvents.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_CLICKED &&
      (event.data as any)?.checklist_task_id === checklistItem.id,
  );
};

/**
 * Checks if a checklist item should show animation
 * @param checklist - The checklist to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item should show animation, false otherwise
 */
const checklistIsShowAnimation = (
  customContentVersion: CustomContentVersion,
  checklistItem: ChecklistItemType,
) => {
  const latestSession = customContentVersion.session.latestSession;
  // If there is no latest session or the checklist is dismissed, don't show animation
  if (!latestSession || checklistIsDimissed(latestSession.bizEvent)) {
    return false;
  }

  const bizEvents = latestSession.bizEvent || [];

  const taskCompletedEvents = bizEvents.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
      (event.data as any)?.checklist_task_id === checklistItem.id,
  );

  // If there are no task completed events, don't show animation
  if (taskCompletedEvents.length === 0) {
    return false;
  }

  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const hiddenOrSeenEvents = bizEvents.filter(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_HIDDEN ||
      event.event?.codeName === BizEvents.CHECKLIST_SEEN,
  );

  // If there are no hidden or seen events, show animation, because the checklist item is completed
  if (!hiddenOrSeenEvents || hiddenOrSeenEvents.length === 0) {
    return true;
  }

  // Get the latest hidden or seen event
  const latestHiddenOrSeenEvent = hiddenOrSeenEvents.reduce((latest, current) => {
    return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
  });

  // If the latest event is CHECKLIST_SEEN, don't show animation
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return false;
  }

  // If the latest event is CHECKLIST_HIDDEN, check if there's a CHECKLIST_TASK_COMPLETED
  // event for this specific item that occurred after the last SEEN event
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_HIDDEN) {
    // Get the last SEEN event
    const lastCompletedEvent = taskCompletedEvents.reduce((latest, current) => {
      return new Date(current.createdAt) > new Date(latest.createdAt) ? current : latest;
    });

    // Check if the task was completed after the last SEEN event
    const lastCompletedTime = new Date(lastCompletedEvent.createdAt);
    const lastHiddenTime = new Date(latestHiddenOrSeenEvent.createdAt);

    return lastCompletedTime >= lastHiddenTime;
  }

  return false;
};

/**
 * Checks if a checklist item is completed
 * @param content - The content to check
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is completed, false otherwise
 */
const checklistItemIsCompleted = (
  bizEvents: BizEventWithEvent[] | undefined,
  checklistItem: ChecklistItemType,
) => {
  return !!bizEvents?.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
      (event.data as any)?.checklist_task_id === checklistItem.id,
  );
};

/**
 * Checks if a checklist item can be completed based on completion order and item status
 * @param completionOrder - The completion order
 * @param items - The items to check
 * @param currentItem - The current item to check
 * @returns True if the checklist item can be completed, false otherwise
 */
const canCompleteChecklistItem = (
  completionOrder: 'any' | 'ordered',
  items: ChecklistItemType[],
  currentItem: ChecklistItemType,
): boolean => {
  const currentIndex = items.findIndex((item) => item.id === currentItem.id);

  // For 'any' order, items can be completed in any order
  if (completionOrder === 'any') {
    return true;
  }

  // For 'ordered' completion, check if all previous items are completed
  if (completionOrder === 'ordered') {
    const previousItems = items.slice(0, currentIndex);
    return previousItems.every((item) => item.isCompleted);
  }

  return false;
};

/**
 * Evaluates checklist items including completion, visibility, and animation status
 * @param customContentVersion - The content version to process
 * @param options - The options to evaluate the checklist items
 * @returns The evaluated items with updated properties
 */
export const evaluateChecklistItems = async (
  customContentVersion: CustomContentVersion,
  options: RulesEvaluationOptions,
) => {
  const checklistData = customContentVersion.data as unknown as ChecklistData;
  const items = checklistData.items;

  // Process items sequentially to handle ordered completion dependency
  const processedItems: ChecklistItemType[] = [];

  for (const item of items) {
    const isClicked = checklistItemIsClicked(customContentVersion, item) || item.isClicked || false;

    // Check completion conditions using item's isClicked state
    const activeConditions = await evaluateRulesConditions(item.completeConditions, {
      ...options,
      customEvaluators: {
        [RulesType.TASK_IS_CLICKED]: () => isClicked,
      },
    });

    const isShowAnimation = checklistIsShowAnimation(customContentVersion, item);

    // For ordered completion, we need to check against the current state of items
    // Use the processed items so far plus the original remaining items
    const currentItemsState: ChecklistItemType[] = [
      ...processedItems,
      ...items.slice(processedItems.length),
    ];

    const isCompleted: boolean =
      item.isCompleted ||
      checklistItemIsCompleted(customContentVersion.session.latestSession?.bizEvent, item)
        ? true
        : canCompleteChecklistItem(checklistData.completionOrder, currentItemsState, item) &&
          isConditionsActived(activeConditions);

    // Check visibility conditions
    let isVisible = true;
    if (item.onlyShowTask) {
      const visibleConditions = await evaluateRulesConditions(item.onlyShowTaskConditions, options);
      isVisible = isConditionsActived(visibleConditions);
    }

    // Add updated item to the array
    processedItems.push({
      ...item,
      isShowAnimation,
      isCompleted,
      isVisible,
    });
  }

  return processedItems;
};

export const extractChecklistTrackConditions = (
  customContentSession: CustomContentSession,
  allowedTypes: RulesType[] = [RulesType.ELEMENT, RulesType.TEXT_INPUT, RulesType.TEXT_FILL],
): TrackCondition[] => {
  // Pre-allocate array with estimated capacity to reduce memory reallocations
  const trackConditions: TrackCondition[] = [];
  // Extract metadata once to avoid repeated property access
  const contentId = customContentSession.content.id;
  const contentType = customContentSession.content.type as ContentDataType;
  const versionId = customContentSession.version.id;

  if (contentType !== ContentDataType.CHECKLIST) {
    return trackConditions;
  }

  const trackConditionBase = {
    contentId,
    contentType,
    versionId,
  };

  const checklistData = customContentSession.version.checklist;
  const items = checklistData.items;
  // Process all conditions in a single pass
  for (const item of items) {
    // Process complete conditions if they exist and the item is not completed
    if (item?.completeConditions?.length > 0 && !item.isCompleted) {
      const completeConditions = flattenConditions(item.completeConditions, allowedTypes);
      for (const condition of completeConditions) {
        trackConditions.push({
          ...trackConditionBase,
          condition,
        });
      }
    }

    // Process only show task conditions if they exist
    if (item.onlyShowTask && item.onlyShowTaskConditions?.length > 0) {
      const onlyShowTaskConditions = flattenConditions(item.onlyShowTaskConditions, allowedTypes);
      for (const condition of onlyShowTaskConditions) {
        trackConditions.push({
          ...trackConditionBase,
          condition,
        });
      }
    }
  }

  return trackConditions;
};

/**
 * Checks if a checklist has show animation items
 * @param items - The items to check
 * @returns True if the checklist has show animation items, false otherwise
 */
export const checklistHasShowAnimationItems = (items: ChecklistItemType[]) => {
  return items.some((item) => item.isCompleted && item.isVisible && item.isShowAnimation);
};

/**
 * Checks if a checklist has new completed items
 * @param currentItems - The current items
 * @param previousItems - The previous items
 * @returns True if the checklist has new completed items, false otherwise
 */
export const checklistHasNewCompletedItems = (
  currentItems: ChecklistItemType[],
  previousItems: ChecklistItemType[],
): boolean => {
  // Get visible completed item IDs from previous collapsed state
  const previousCompletedIds = new Set(
    previousItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  // Get visible completed item IDs from current state
  const currentCompletedIds = new Set(
    currentItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  // Check if there are any new completed items (items that are completed now but weren't before)
  for (const itemId of currentCompletedIds) {
    if (!previousCompletedIds.has(itemId)) {
      return true;
    }
  }

  return false;
};

/**
 * Extracts new completed items from a checklist
 * @param currentItems - The current items
 * @param previousItems - The previous items
 * @returns The new completed items
 */

export const extractChecklistNewCompletedItems = (
  currentItems: ChecklistItemType[],
  previousItems: ChecklistItemType[],
) => {
  // Get visible completed item IDs from previous collapsed state
  const previousCompletedIds = new Set<string>(
    previousItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  // Get visible completed item IDs from current state
  const currentCompletedIds = new Set<string>(
    currentItems.filter((item) => item.isCompleted && item.isVisible).map((item) => item.id),
  );

  return Array.from(currentCompletedIds).filter((id) => !previousCompletedIds.has(id));
};

/**
 * Extracts show animation items from a checklist
 * @param items - The items
 * @returns The show animation items
 */
export const extractChecklistShowAnimationItems = (items: ChecklistItemType[]) => {
  return items?.filter((item) => item.isShowAnimation).map((item) => item.id);
};

/**
 * Check if content sessions have changes in key data
 * @param oldSession - The original content session
 * @param newSession - The updated content session
 * @returns True if there are changes in theme, attributes, or steps theme
 */
export const hasContentSessionChanges = (
  oldSession: CustomContentSession,
  newSession: CustomContentSession,
): boolean => {
  // Basic validation - should be comparing the same session
  if (oldSession.id !== newSession.id) {
    return true;
  }
  const oldVersion = oldSession.version;
  const newVersion = newSession.version;

  // Check version theme changes using utility function
  if (hasSessionThemeChanges(oldVersion.theme, newVersion.theme)) {
    return true;
  }

  // Check attributes changes using utility function
  if (hasSessionAttributeChanges(oldSession.attributes || [], newSession.attributes || [])) {
    return true;
  }

  // Check steps changes using utility function
  if (hasSessionStepChanges(oldVersion.steps || [], newVersion.steps || [])) {
    return true;
  }

  if (
    hasChecklistItemChanges(oldVersion.checklist?.items || [], newVersion.checklist?.items || [])
  ) {
    return true;
  }

  return false;
};
