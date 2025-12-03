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
        updatedAt: true, // Include updatedAt to preserve it during migration
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
        // Explicitly set updatedAt to its current value to prevent Prisma from auto-updating it
        // When updatedAt is explicitly provided, Prisma won't override it
        await prisma.version.update({
          where: { id: version.id },
          data: {
            ...updateData,
            updatedAt: version.updatedAt, // Preserve the original updatedAt value
          },
        });
        console.log(`Updated version ${version.id} with condition IDs (updatedAt preserved)`);
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

/**
 * Validation result for a single version
 */
export interface VersionValidationResult {
  versionId: string;
  isValid: boolean;
  issues: string[];
}

/**
 * Overall validation result
 */
export interface ValidationResult {
  totalVersions: number;
  validVersions: number;
  invalidVersions: number;
  invalidVersionDetails: VersionValidationResult[];
  isAllValid: boolean;
}

/**
 * Recursively find all rules without IDs and collect their paths
 * @param rules - Array of rules conditions to check
 * @param path - Current path in the rule tree (for error reporting)
 * @returns Array of paths to rules without IDs
 */
const findRulesWithoutIds = (
  rules: ContentConfigObject['autoStartRules'] | ContentConfigObject['hideRules'],
  path = 'root',
): string[] => {
  const missingIds: string[] = [];

  if (!rules || rules.length === 0) {
    return missingIds;
  }

  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const currentPath = `${path}[${i}]`;

    // Check if current rule has ID
    if (!rule.id) {
      missingIds.push(`${currentPath} (type: ${rule.type || 'unknown'})`);
    }

    // If it's a group with nested conditions, recursively check them
    if (rule.type === 'group' && rule.conditions) {
      const nestedMissing = findRulesWithoutIds(rule.conditions, `${currentPath}.conditions`);
      missingIds.push(...nestedMissing);
    }
  }

  return missingIds;
};

/**
 * Validate a single version's condition IDs
 * @param version - Version object from database
 * @returns Validation result for this version
 */
const validateVersion = (version: {
  id: string;
  config: any;
  data: any;
  content?: { type: string } | null;
}): VersionValidationResult => {
  const issues: string[] = [];

  // Validate config conditions (autoStartRules and hideRules)
  if (version.config) {
    const config = version.config as ContentConfigObject;

    if (config.autoStartRules) {
      const missingAutoStart = findRulesWithoutIds(config.autoStartRules, 'config.autoStartRules');
      if (missingAutoStart.length > 0) {
        issues.push(
          `autoStartRules missing IDs: ${missingAutoStart.length} rule(s) - ${missingAutoStart.join(', ')}`,
        );
      }
    }

    if (config.hideRules) {
      const missingHide = findRulesWithoutIds(config.hideRules, 'config.hideRules');
      if (missingHide.length > 0) {
        issues.push(
          `hideRules missing IDs: ${missingHide.length} rule(s) - ${missingHide.join(', ')}`,
        );
      }
    }
  }

  // Validate checklist data if content type is CHECKLIST
  if (version.content?.type === ContentDataType.CHECKLIST && version.data) {
    const checklistData = version.data as ChecklistData;

    if (checklistData.items && Array.isArray(checklistData.items)) {
      for (let i = 0; i < checklistData.items.length; i++) {
        const item = checklistData.items[i];
        const itemPath = `data.items[${i}]`;

        if (item.completeConditions) {
          const missingComplete = findRulesWithoutIds(
            item.completeConditions,
            `${itemPath}.completeConditions`,
          );
          if (missingComplete.length > 0) {
            issues.push(
              `${itemPath}.completeConditions missing IDs: ${missingComplete.length} rule(s) - ${missingComplete.join(', ')}`,
            );
          }
        }

        if (item.onlyShowTaskConditions) {
          const missingOnlyShow = findRulesWithoutIds(
            item.onlyShowTaskConditions,
            `${itemPath}.onlyShowTaskConditions`,
          );
          if (missingOnlyShow.length > 0) {
            issues.push(
              `${itemPath}.onlyShowTaskConditions missing IDs: ${missingOnlyShow.length} rule(s) - ${missingOnlyShow.join(', ')}`,
            );
          }
        }
      }
    }
  }

  return {
    versionId: version.id,
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * Validate that all versions have complete condition IDs after migration
 * This function checks all versions in the database to ensure that:
 * 1. All rules in config.autoStartRules have IDs (including nested conditions)
 * 2. All rules in config.hideRules have IDs (including nested conditions)
 * 3. All rules in checklist items' completeConditions have IDs (including nested conditions)
 * 4. All rules in checklist items' onlyShowTaskConditions have IDs (including nested conditions)
 *
 * @param prisma - Prisma client instance
 * @param batchSize - Number of versions to process in each batch (default: 100)
 * @returns Validation result with detailed information about any missing IDs
 *
 * @example
 * const result = await validateConditionIds(prisma);
 * if (result.isAllValid) {
 *   console.log('All versions have complete condition IDs!');
 * } else {
 *   console.log(`Found ${result.invalidVersions} versions with missing IDs`);
 *   result.invalidVersionDetails.forEach(detail => {
 *     console.log(`Version ${detail.versionId}:`, detail.issues);
 *   });
 * }
 */
export const validateConditionIds = async (
  prisma: PrismaClient,
  batchSize = 100,
): Promise<ValidationResult> => {
  const invalidVersionDetails: VersionValidationResult[] = [];
  let offset = 0;
  let hasMore = true;
  let totalVersions = 0;

  console.log('Starting condition IDs validation...');

  while (hasMore) {
    // Fetch versions in batches to avoid memory issues
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
      orderBy: { id: 'asc' },
    });

    if (versions.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Validating batch: ${offset + 1}-${offset + versions.length} versions`);

    for (const version of versions) {
      totalVersions++;
      const validationResult = validateVersion(version);

      if (!validationResult.isValid) {
        invalidVersionDetails.push(validationResult);
      }
    }

    offset += batchSize;

    // If we got fewer results than batch size, we've reached the end
    if (versions.length < batchSize) {
      hasMore = false;
    }
  }

  const validVersions = totalVersions - invalidVersionDetails.length;
  const invalidVersions = invalidVersionDetails.length;
  const isAllValid = invalidVersions === 0;

  console.log(
    `Validation completed: ${validVersions} valid, ${invalidVersions} invalid out of ${totalVersions} total versions`,
  );

  if (!isAllValid) {
    console.log('\nInvalid versions:');
    for (const detail of invalidVersionDetails) {
      console.log(`\nVersion ${detail.versionId}:`);
      for (const issue of detail.issues) {
        console.log(`  - ${issue}`);
      }
    }
  }

  return {
    totalVersions,
    validVersions,
    invalidVersions,
    invalidVersionDetails,
    isAllValid,
  };
};
