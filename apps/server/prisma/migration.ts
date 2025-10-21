import { cuid } from '@usertour/helpers';
import {
  ContentConfigObject,
  RulesCondition,
  ChecklistData,
  ContentDataType,
} from '@usertour/types';
import { PrismaClient } from '@prisma/client';

/**
 * Assign unique IDs to rules that don't have them
 * @param rules - Array of rules conditions to process
 * @returns Updated rules with IDs assigned
 */
const assignConditionIds = (
  rules: ContentConfigObject['autoStartRules'] | ContentConfigObject['hideRules'],
) => {
  const rulesCondition: RulesCondition[] = [...rules];
  for (let j = 0; j < rulesCondition.length; j++) {
    const rule = rulesCondition[j];
    // Always assign ID to every rule, regardless of type
    if (!rule.id) {
      rule.id = cuid();
    }
    // If it's a group with nested conditions, recursively process them
    if (rule.type === 'group' && rule.conditions) {
      rulesCondition[j].conditions = assignConditionIds(rule.conditions);
    }
  }
  return rulesCondition;
};

/**
 * Check if all conditions have IDs (including nested conditions)
 * @param rules - Array of rules conditions to check
 * @returns true if all conditions have IDs, false otherwise
 */
const allConditionsHaveIds = (
  rules: ContentConfigObject['autoStartRules'] | ContentConfigObject['hideRules'],
): boolean => {
  if (!rules || rules.length === 0) return true;

  for (const rule of rules) {
    // Check if current rule has ID
    if (!rule.id) {
      return false;
    }
    // If it's a group with nested conditions, recursively check them
    if (rule.type === 'group' && rule.conditions) {
      if (!allConditionsHaveIds(rule.conditions)) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Process config conditions (autoStartRules and hideRules)
 * @param config - Version config object
 * @returns Object with updated config and whether changes were made
 */
const processConfigConditions = (
  config: ContentConfigObject,
): { config: ContentConfigObject; hasChanges: boolean } => {
  const updatedConfig = { ...config };
  let hasChanges = false;

  // Check if this version already has all condition IDs
  const autoStartRulesComplete = allConditionsHaveIds(updatedConfig?.autoStartRules);
  const hideRulesComplete = allConditionsHaveIds(updatedConfig?.hideRules);

  if (!autoStartRulesComplete || !hideRulesComplete) {
    if (updatedConfig?.autoStartRules && !autoStartRulesComplete) {
      updatedConfig.autoStartRules = assignConditionIds(updatedConfig.autoStartRules);
      hasChanges = true;
    }
    if (updatedConfig?.hideRules && !hideRulesComplete) {
      updatedConfig.hideRules = assignConditionIds(updatedConfig.hideRules);
      hasChanges = true;
    }
  }

  return { config: updatedConfig, hasChanges };
};

/**
 * Process checklist conditions (completeConditions and onlyShowTaskConditions)
 * @param checklistData - Checklist data object
 * @returns Object with updated checklist data and whether changes were made
 */
const processChecklistConditions = (
  checklistData: ChecklistData,
): { data: ChecklistData; hasChanges: boolean } => {
  const updatedData = { ...checklistData };
  let hasChanges = false;

  if (updatedData?.items && Array.isArray(updatedData.items)) {
    for (const item of updatedData.items) {
      // Process completeConditions
      if (item.completeConditions && !allConditionsHaveIds(item.completeConditions)) {
        item.completeConditions = assignConditionIds(item.completeConditions);
        hasChanges = true;
      }

      // Process onlyShowTaskConditions
      if (item.onlyShowTaskConditions && !allConditionsHaveIds(item.onlyShowTaskConditions)) {
        item.onlyShowTaskConditions = assignConditionIds(item.onlyShowTaskConditions);
        hasChanges = true;
      }
    }
  }

  return { data: updatedData, hasChanges };
};

/**
 * Migrate version configurations to add condition IDs
 * @param prisma - Prisma client instance
 * @param batchSize - Number of versions to process in each batch (default: 100)
 * @returns Migration result with counts
 */
export const migrateConditionIds = async (prisma: PrismaClient, batchSize = 100): Promise<void> => {
  let configProcessedCount = 0;
  let checklistProcessedCount = 0;
  let skippedCount = 0;
  let offset = 0;
  let hasMore = true;

  console.log('Starting version condition IDs migration...');

  while (hasMore) {
    // Process versions in batches to avoid memory issues
    const versions = await prisma.version.findMany({
      select: {
        id: true,
        config: true,
        data: true,
        content: {
          select: {
            type: true,
          },
        },
      },
      skip: offset,
      take: batchSize,
      orderBy: { id: 'asc' }, // Ensure consistent ordering
    });

    if (versions.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Processing batch: ${offset + 1}-${offset + versions.length} versions`);

    for (const version of versions) {
      let hasChanges = false;
      const updateData: any = {};

      // Process config conditions (autoStartRules and hideRules)
      if (version.config) {
        const configResult = processConfigConditions(version.config as ContentConfigObject);
        if (configResult.hasChanges) {
          updateData.config = configResult.config;
          hasChanges = true;
          configProcessedCount++;
        }
      }

      // Process checklist data if content type is CHECKLIST
      if (version.content?.type === ContentDataType.CHECKLIST && version.data) {
        const checklistResult = processChecklistConditions(
          version.data as unknown as ChecklistData,
        );
        if (checklistResult.hasChanges) {
          updateData.data = checklistResult.data;
          hasChanges = true;
          checklistProcessedCount++;
        }
      }

      if (hasChanges) {
        await prisma.version.update({
          where: { id: version.id },
          data: updateData,
        });
        console.log(`Updated version ${version.id} with condition IDs`);
      } else {
        skippedCount++;
      }
    }

    offset += batchSize;

    // If we got fewer results than batch size, we've reached the end
    if (versions.length < batchSize) {
      hasMore = false;
    }
  }

  console.log(
    `Migration completed: ${configProcessedCount} configs updated, ${checklistProcessedCount} checklists updated, ${skippedCount} versions skipped`,
  );
};
