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
  LauncherData,
  SessionAttribute,
  SessionTheme,
  SessionStep,
  ConditionWaitTimer,
  ClientCondition,
  TrackCondition,
  CustomContentSession,
  StartContentOptions,
  ClientContext,
} from '@usertour/types';

import {
  ConditionExtractionMode,
  CustomContentVersion,
  BizEventWithEvent,
  BizSessionWithEvents,
  ContentWithContentOnEnvironments,
  Step,
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
  isArray,
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

/**
 * Content types that follow singleton pattern - only one active session per type at a time
 * Unlike LAUNCHER which can have multiple concurrent sessions
 */
export const SINGLETON_CONTENT_TYPES = [ContentDataType.FLOW, ContentDataType.CHECKLIST];

// ============================================================================
// Rule Checking Functions
// ============================================================================

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

// ============================================================================
// Event Finding Functions
// ============================================================================

/**
 * Finds the latest event from an array of business events
 * @param bizEvents - Array of business events to search through
 * @returns The latest event based on creation date
 */
export const findLatestEvent = (bizEvents: BizEventWithEvent[]) => {
  const initialValue = bizEvents[0];
  const lastEvent = bizEvents.reduce(
    (accumulator: typeof initialValue, currentValue: typeof initialValue) => {
      const currentDate = new Date(currentValue.createdAt);
      const accumulatorDate = new Date(accumulator.createdAt);
      if (isAfter(currentDate, accumulatorDate)) {
        return currentValue;
      }
      return accumulator;
    },
    initialValue,
  );
  return lastEvent;
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

/**
 * Finds the latest step CVID from step seen events
 * @param bizEvents - Array of business events to search through
 * @returns The latest step CVID or undefined if not found
 */
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

/**
 * Finds the current step CVID
 * @param customContentVersion - The custom content version
 * @param options - The start content options
 * @returns The current step CVID
 */
export const findCurrentStepCvid = (
  customContentVersion: CustomContentVersion,
  options?: StartContentOptions,
): string | undefined => {
  const { stepCvid } = options ?? {};
  const steps = customContentVersion?.steps ?? [];
  const session = customContentVersion.session;
  const contentType = customContentVersion.content.type as ContentDataType;

  if (stepCvid) {
    return stepCvid;
  }

  if (!sessionIsAvailable(session.latestSession, contentType)) {
    return steps?.[0]?.cvid;
  }

  const currentStepId = session.latestSession.currentStepId;
  const currentStepCvid = steps.find((step) => step.id === currentStepId)?.cvid ?? null;

  return currentStepCvid || findLatestStepCvid(session.latestSession?.bizEvent);
};

/**
 * Finds the latest step seen event from business events
 * @param bizEvents - Array of business events to search through
 * @returns The latest step seen event or null if not found
 */
export const findLatestStepSeenEvent = (
  bizEvents: BizEventWithEvent[] | undefined,
): BizEventWithEvent | null => {
  if (!bizEvents?.length) {
    return null;
  }

  // Use reduce to find the latest event instead of sorting the entire array
  // This is more efficient (O(n) vs O(n log n)) when we only need the latest one
  const stepSeenEvents = bizEvents.filter(
    (event) => event?.event?.codeName === BizEvents.FLOW_STEP_SEEN,
  );

  if (!stepSeenEvents.length) {
    return null;
  }

  return stepSeenEvents.reduce((latest, current) => {
    return isAfter(new Date(current.createdAt), new Date(latest.createdAt)) ? current : latest;
  });
};

// ============================================================================
// Content Status Checking Functions
// ============================================================================

/**
 * Checks if a checklist is dismissed based on business events
 * @param bizEvents - Array of business events to check
 * @returns The dismissed event if found, undefined otherwise
 */
export const checklistIsDimissed = (bizEvents: BizEventWithEvent[] | undefined) => {
  return bizEvents?.find((event) => event?.event?.codeName === BizEvents.CHECKLIST_DISMISSED);
};

/**
 * Checks if a flow is dismissed based on business events
 * @param bizEvents - Array of business events to check
 * @returns The dismissed event if found, undefined otherwise
 */
export const flowIsDismissed = (bizEvents: BizEventWithEvent[] | undefined) => {
  return bizEvents?.find((event) => event?.event?.codeName === BizEvents.FLOW_ENDED);
};

/**
 * Checks if a launcher is dismissed based on business events
 * @param bizEvents - Array of business events to check
 * @returns The dismissed event if found, undefined otherwise
 */
export const launcherIsDismissed = (bizEvents: BizEventWithEvent[] | undefined) => {
  return bizEvents?.find((event) => event?.event?.codeName === BizEvents.LAUNCHER_DISMISSED);
};

// ============================================================================
// Content Filtering Functions
// ============================================================================

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

/**
 * Gets the latest event from other content versions
 * @param currentContent - The current content version
 * @param contents - Array of all content versions
 * @returns The latest event from other content versions
 */
const getLatestEvent = (currentContent: CustomContentVersion, contents: CustomContentVersion[]) => {
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
      bizEvents.push(...sessionBizEvents);
    }
  }
  return findLatestEvent(bizEvents);
};

/**
 * Mapping of content types to their dismissed event names
 */
const dismissedEventMapping = {
  [ContentDataType.FLOW]: BizEvents.FLOW_ENDED,
  [ContentDataType.LAUNCHER]: BizEvents.LAUNCHER_DISMISSED,
  [ContentDataType.CHECKLIST]: BizEvents.CHECKLIST_DISMISSED,
};

/**
 * Checks if the duration between two dates is greater than the specified duration
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
 * Checks if content is allowed by auto-start rules setting
 * @param customContentVersion - The custom content version to check
 * @param customContentVersions - All custom content versions for context
 * @returns True if allowed, false otherwise
 */
export const isAllowedByAutoStartRulesSetting = (
  customContentVersion: CustomContentVersion,
  customContentVersions: CustomContentVersion[],
) => {
  const now = new Date();

  const { frequency, startIfNotComplete } = customContentVersion.config.autoStartRulesSetting;
  const completedSessions = customContentVersion.session.completedSessions;
  const totalSessions = customContentVersion.session.totalSessions;

  // if the content is completed, it will not be shown again when startIfNotComplete is true
  if (startIfNotComplete && completedSessions > 0) {
    return false;
  }

  // if the frequency is not set, the content will be shown
  if (!frequency) {
    return true;
  }

  const contentType = customContentVersion.content.type as ContentDataType;

  const lastEvent = getLatestEvent(customContentVersion, customContentVersions);
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
    if (totalSessions > 0) {
      return false;
    }
    return true;
  }

  const dismissedEventName = dismissedEventMapping[contentType];
  const dismissedEvent = contentEvents?.find((e) => e?.event?.codeName === dismissedEventName);

  if (!dismissedEvent) {
    return true;
  }

  const dismissedEventDate = new Date(dismissedEvent.createdAt);

  if (frequency.frequency === Frequency.MULTIPLE) {
    if (frequency.every.times && totalSessions >= frequency.every.times) {
      return false;
    }
  }
  if (frequency.frequency === Frequency.MULTIPLE || frequency.frequency === Frequency.UNLIMITED) {
    if (
      !isGreaterThenDuration(
        now,
        dismissedEventDate,
        frequency.every.unit,
        frequency.every.duration,
      )
    ) {
      return false;
    }
  }
  return true;
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
    return false;
  }

  return true;
};

/**
 * Filters the available auto-start custom content versions
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @param clientConditions - The client conditions
 * @param waitTimers - The wait timer conditions
 * @returns The available auto-start custom content versions
 */
export const filterAvailableAutoStartContentVersions = (
  customContentVersions: CustomContentVersion[],
  contentType: ContentDataType,
  clientConditions: ClientCondition[],
  waitTimers?: ConditionWaitTimer[],
) => {
  const firedWaitTimerVersionIds = waitTimers
    ?.filter((waitTimer) => waitTimer.activated)
    .map((waitTimer) => waitTimer.versionId);

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
        waitTimers &&
        !isAllowedByConditionWaitTimers(customContentVersion, firedWaitTimerVersionIds)
      ) {
        return false;
      }

      return true;
    })
    .sort(priorityCompare);
};

/**
 * Filters the available launcher custom content versions
 * @param customContentVersions - The custom content versions
 * @param clientConditions - The client conditions
 * @returns The available launcher custom content versions
 */
export const filterAvailableLauncherContentVersions = (
  customContentVersions: CustomContentVersion[],
  clientConditions: ClientCondition[],
) => {
  const autoStartContentVersions = filterAvailableAutoStartContentVersions(
    customContentVersions,
    ContentDataType.LAUNCHER,
    clientConditions,
  );
  return autoStartContentVersions.filter(
    (contentVersion) => !launcherIsDismissed(contentVersion.session.latestSession?.bizEvent),
  );
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

    // Launcher is not eligible for auto-start, return false
    if (contentType === ContentDataType.LAUNCHER) {
      return false;
    }

    // Path 2: Check activated content versions (session-based)
    return sessionIsAvailable(customContentVersion.session.latestSession, contentType);
  });
};

// ============================================================================
// Session Management Functions
// ============================================================================

/**
 * Checks if a content type follows singleton pattern (only one active session per type)
 * @param contentType - The content type to check
 * @returns True if the content type is a singleton type, false otherwise
 */
export const isSingletonContentType = (contentType: ContentDataType): boolean => {
  return SINGLETON_CONTENT_TYPES.includes(contentType);
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
  }
  if (contentType === ContentDataType.FLOW) {
    if (latestSession && !flowIsDismissed(latestSession.bizEvent)) {
      return latestSession.id;
    }
  }

  if (contentType === ContentDataType.LAUNCHER) {
    if (latestSession && !launcherIsDismissed(latestSession.bizEvent)) {
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
  }
  if (contentType === ContentDataType.FLOW) {
    if (latestSession && !flowIsDismissed(latestSession.bizEvent)) {
      return true;
    }
  }
  if (contentType === ContentDataType.LAUNCHER) {
    if (latestSession && !launcherIsDismissed(latestSession.bizEvent)) {
      return true;
    }
  }
  return false;
};

/**
 * Finds the latest activated custom content version
 * @param customContentVersions - The custom content versions
 * @param contentType - The content type
 * @param clientConditions - The client conditions
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

// ============================================================================
// Condition Evaluation and Extraction Functions
// ============================================================================

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
 * Checks if all condition IDs in rules conditions exist and are ready in client conditions
 * @param conditions - Array of rules conditions (hideRules, autoStartRules, etc.)
 * @param clientConditions - Array of client conditions from Redis socket data
 * @param allowedTypes - Array of allowed condition types to filter by
 * @returns True if all condition IDs exist and are ready (have isActive status), false otherwise
 */
export const conditionsIsReady = (
  conditions: RulesCondition[],
  clientConditions: ClientCondition[],
  allowedTypes: RulesType[] = [RulesType.ELEMENT, RulesType.TEXT_INPUT, RulesType.TEXT_FILL],
): boolean => {
  const allowedConditions = flattenConditions(conditions, allowedTypes);

  // If no allowed conditions, return true (no conditions to check)
  if (allowedConditions.length === 0) {
    return true;
  }

  const clientConditionIds =
    clientConditions?.filter((cc) => cc.isActive !== undefined).map((cc) => cc.conditionId) ?? [];

  // Check if all condition IDs exist in client conditions with feedback
  return allowedConditions.every((condition) => clientConditionIds.includes(condition.id));
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

// ============================================================================
// Attribute Extraction Functions
// ============================================================================

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

/**
 * Extracts user attribute codes from launcher data
 * @param launcher - The launcher data
 * @returns Array of unique user attribute codes
 */
export const extractLauncherAttrCodes = (launcher: LauncherData): string[] => {
  const content = launcher?.tooltip?.content as unknown as ContentEditorRoot[];
  if (content && isArray(content)) {
    return extractUserAttrCodes(content);
  }
  return [];
};

/**
 * Extracts all user attribute codes from checklist data
 * @param checklist - The checklist data
 * @returns Array of unique user attribute codes found in the checklist data
 */
export const extractChecklistAttrCodes = (checklist: ChecklistData): string[] => {
  const content = checklist?.content as unknown as ContentEditorRoot[];
  if (content && isArray(content)) {
    return extractUserAttrCodes(content);
  }
  return [];
};

// ============================================================================
// Checklist Utility Functions
// ============================================================================

/**
 * Gets the initial display of a checklist
 * @param customContentVersion - The custom content version
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
    return isAfter(new Date(current.createdAt), new Date(latest.createdAt)) ? current : latest;
  });
  if (latestHiddenOrSeenEvent.event?.codeName === BizEvents.CHECKLIST_SEEN) {
    return ChecklistInitialDisplay.EXPANDED;
  }

  return ChecklistInitialDisplay.BUTTON;
};

/**
 * Checks if the checklist is expand pending
 * @param customContentVersion - The custom content version
 * @returns True if the checklist is expand pending, false otherwise
 */
export const isExpandPending = (customContentVersion: CustomContentVersion): boolean => {
  const latestSession = customContentVersion.session.latestSession;
  const checklistData = customContentVersion.data as unknown as ChecklistData;
  // Find the latest CHECKLIST_HIDDEN or CHECKLIST_SEEN event
  const seenEvents =
    latestSession?.bizEvent?.filter(
      (event) => event.event?.codeName === BizEvents.CHECKLIST_SEEN,
    ) ?? [];
  if (!latestSession || checklistIsDimissed(latestSession.bizEvent) || seenEvents.length === 0) {
    return checklistData.initialDisplay === ChecklistInitialDisplay.EXPANDED;
  }
  return false;
};

/**
 * Checks if a checklist item is clicked
 * @param bizEvents - The biz events from the latest session
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is clicked, false otherwise
 */
const checklistItemIsClicked = (
  bizEvents: BizEventWithEvent[] | undefined,
  checklistItem: ChecklistItemType,
) => {
  if (!bizEvents || checklistIsDimissed(bizEvents)) {
    return false;
  }
  return !!bizEvents.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_CLICKED &&
      (event.data as any)?.checklist_task_id === checklistItem.id,
  );
};

/**
 * Finds a checklist item completed event
 * @param bizEvents - The biz events from the latest session
 * @param checklistItem - The checklist item to check
 * @returns The checklist item completed event, or null if not found
 */
export const findChecklistItemCompletedEvent = (
  bizEvents: BizEventWithEvent[] | undefined,
  checklistItem: ChecklistItemType,
) => {
  return bizEvents?.find(
    (event) =>
      event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED &&
      (event.data as any)?.checklist_task_id === checklistItem.id,
  );
};

/**
 * Checks if a checklist item is completed
 * @param bizEvents - The biz events from the latest session
 * @param checklistItem - The checklist item to check
 * @returns True if the checklist item is completed, false otherwise
 */
export const checklistItemIsCompleted = (
  bizEvents: BizEventWithEvent[] | undefined,
  checklistItem: ChecklistItemType,
) => {
  if (!bizEvents || checklistIsDimissed(bizEvents)) {
    return false;
  }
  return Boolean(findChecklistItemCompletedEvent(bizEvents, checklistItem));
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
    const bizEvents = customContentVersion.session.latestSession?.bizEvent || [];
    const isClicked = checklistItemIsClicked(bizEvents, item) || item.isClicked || false;

    // Check completion conditions using item's isClicked state
    const activeConditions = await evaluateRulesConditions(item.completeConditions, {
      ...options,
      customEvaluators: {
        [RulesType.TASK_IS_CLICKED]: () => isClicked,
      },
    });

    // const isShowAnimation = checklistIsShowAnimation(bizEvents, item);

    // For ordered completion, we need to check against the current state of items
    // Use the processed items so far plus the original remaining items
    const currentItemsState: ChecklistItemType[] = [
      ...processedItems,
      ...items.slice(processedItems.length),
    ];

    const isCompleted: boolean =
      item.isCompleted || checklistItemIsCompleted(bizEvents, item)
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
      isShowAnimation: false,
      isCompleted,
      isVisible,
      isClicked,
    });
  }

  return processedItems;
};

/**
 * Evaluates checklist items with client conditions
 * Extracts activated and deactivated condition IDs from client conditions
 * and evaluates checklist items with proper condition context
 * @param customContentVersion - The content version to process
 * @param clientContext - The client context for evaluation
 * @param clientConditions - The client conditions to extract IDs from
 * @returns The evaluated items with updated properties
 */
export const evaluateChecklistItemsWithContext = async (
  customContentVersion: CustomContentVersion,
  clientContext: ClientContext,
  clientConditions?: ClientCondition[],
): Promise<ChecklistItemType[]> => {
  // Extract activated and deactivated condition IDs
  const activatedIds = clientConditions
    ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === true)
    .map((clientCondition: ClientCondition) => clientCondition.conditionId);

  const deactivatedIds = clientConditions
    ?.filter((clientCondition: ClientCondition) => clientCondition.isActive === false)
    .map((clientCondition: ClientCondition) => clientCondition.conditionId);

  // Evaluate content versions with proper conditions
  return await evaluateChecklistItems(customContentVersion, {
    typeControl: {
      [RulesType.CURRENT_PAGE]: true,
      [RulesType.TIME]: true,
    },
    clientContext,
    activatedIds,
    deactivatedIds,
  });
};

/**
 * Extracts track conditions from checklist session
 * @param customContentSession - The custom content session
 * @param allowedTypes - Array of allowed condition types to filter by
 * @returns Array of track conditions
 */
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

/*  
/**
 * Extracts new completed items from a checklist
 * @param bizEvents - The biz events from the latest session
 * @param checklistItems - The checklist items to check
 * @returns The new completed items
 */
export const extractChecklistNewCompletedItems = (
  checklistItems: ChecklistItemType[],
  bizEvents: BizEventWithEvent[] | undefined,
) => {
  return checklistItems.filter(
    (item) => item.isCompleted && !findChecklistItemCompletedEvent(bizEvents, item),
  );
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
 * Checks the number of visible items
 * @param items - The items to check
 * @returns The number of visible items
 */
export const checklistVisibleItemsCount = (items: ChecklistItemType[]): number => {
  return items.filter((item) => item.isVisible).length;
};

/**
 * Checks the number of completed items
 * @param items - The items to check
 * @returns The number of completed items
 */
export const checklistCompletedItemsCount = (items: ChecklistItemType[]): number => {
  return items.filter((item) => item.isVisible).filter((item) => item.isCompleted).length;
};

/**
 * Calculates checklist progress based on completed and visible items
 * @param items - The checklist items
 * @param currentProgress - The current progress value (optional, used to ensure progress doesn't decrease)
 * @returns The calculated progress value (0-100)
 */
export const calculateChecklistProgress = (
  items: ChecklistItemType[],
  currentProgress?: number | null,
): number => {
  const totalVisibleItemsCount = checklistVisibleItemsCount(items);
  const completedItemsCount = checklistCompletedItemsCount(items);

  if (totalVisibleItemsCount === 0) {
    return currentProgress ?? 0;
  }

  const calculatedProgress = Math.round((completedItemsCount / totalVisibleItemsCount) * 100);
  const minProgress = currentProgress ?? 0;

  return Math.min(Math.max(calculatedProgress, minProgress), 100);
};

/**
 * Checks if there's at least one CHECKLIST_TASK_COMPLETED event
 * @param bizEvents - The business events to check
 * @returns True if there's at least one CHECKLIST_TASK_COMPLETED event, false otherwise
 */
const hasChecklistTaskCompletedEvent = (bizEvents: BizEventWithEvent[] | undefined): boolean => {
  return (
    bizEvents?.some((event) => event.event?.codeName === BizEvents.CHECKLIST_TASK_COMPLETED) ??
    false
  );
};

/**
 * Checks if CHECKLIST_COMPLETED event already exists
 * @param bizEvents - The business events to check
 * @returns True if CHECKLIST_COMPLETED event exists, false otherwise
 */
const hasChecklistCompletedEvent = (bizEvents: BizEventWithEvent[] | undefined): boolean => {
  return (
    bizEvents?.some((event) => event.event?.codeName === BizEvents.CHECKLIST_COMPLETED) ?? false
  );
};

/**
 * Checks if a checklist is all completed and can send CHECKLIST_COMPLETED event
 * @param items - The checklist items
 * @param latestSession - The latest session
 * @returns True if the checklist is all completed and can send the event, false otherwise
 */
export const canSendChecklistCompletedEvent = (
  items: ChecklistItemType[] = [],
  latestSession?: BizSessionWithEvents | undefined,
) => {
  // Check if all visible items are completed
  const visibleItemsCount = checklistVisibleItemsCount(items);
  const completedItemsCount = checklistCompletedItemsCount(items);

  if (visibleItemsCount === 0 || completedItemsCount !== visibleItemsCount) {
    return false;
  }

  // Check event prerequisites
  const bizEvents = latestSession?.bizEvent;

  // Must have at least one CHECKLIST_TASK_COMPLETED event
  if (!hasChecklistTaskCompletedEvent(bizEvents)) {
    return false;
  }

  // CHECKLIST_COMPLETED should only occur once
  if (hasChecklistCompletedEvent(bizEvents)) {
    return false;
  }

  return true;
};

// ============================================================================
// Session Comparison Functions
// ============================================================================

/**
 * Check if session attributes have changes
 * @param oldAttributes - The original attributes
 * @param newAttributes - The new attributes
 * @returns True if there are differences
 */
const hasSessionAttributeChanges = (
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
const hasSessionThemeChanges = (
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
const hasSessionStepChanges = (oldSteps: SessionStep[], newSteps: SessionStep[]): boolean => {
  if (oldSteps.length !== newSteps.length) {
    return true;
  }

  // Use id-based lookup to find corresponding steps, similar to hasChecklistItemChanges
  // This avoids issues with array comparison by using isEqual on individual steps
  return oldSteps.some((oldStep) => {
    const newStep = newSteps.find((step) => step.id === oldStep.id);

    // If step not found in newSteps, it's a change
    if (!newStep) {
      return true;
    }

    // Compare entire step objects using isEqual
    return !isEqual(oldStep, newStep);
  });
};

/**
 * Check if checklist items have changes
 * @param oldItems - The old items
 * @param newItems - The new items
 * @returns True if there are differences
 */
const hasChecklistItemChanges = (oldItems: ChecklistItemType[], newItems: ChecklistItemType[]) => {
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
 * Checks if launcher data has changes
 * @param oldLauncher - The old launcher data
 * @param newLauncher - The new launcher data
 * @returns True if there are differences
 */
const hasLauncherDataChanges = (oldLauncher: LauncherData, newLauncher: LauncherData): boolean => {
  return !isEqual(oldLauncher, newLauncher);
};

/**
 * Check if content sessions have changes in key data
 * @param oldCustomSession - The original content session
 * @param newCustomSession - The updated content session
 * @returns True if there are changes in theme, attributes, or steps theme
 */
export const hasContentSessionChanges = (
  oldCustomSession: CustomContentSession,
  newCustomSession: CustomContentSession,
): boolean => {
  const normalize = (obj: any): any => {
    return JSON.parse(JSON.stringify(obj));
  };
  const oldSession = normalize(oldCustomSession) as CustomContentSession;
  const newSession = normalize(newCustomSession) as CustomContentSession;

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

  if (hasLauncherDataChanges(oldVersion.launcher, newVersion.launcher)) {
    return true;
  }

  if (!isEqual(oldSession.expandPending, newSession.expandPending)) {
    return true;
  }

  if (!isEqual(oldSession.currentStep, newSession.currentStep)) {
    return true;
  }

  return false;
};
