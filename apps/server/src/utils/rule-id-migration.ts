import { cuid } from '@usertour/helpers';
import { ContentConfigObject, RulesCondition } from '@usertour/types';
import { PrismaClient } from '@prisma/client';

/**
 * Add unique IDs to rules that don't have them
 * @param rules - Array of rules conditions to process
 * @returns Updated rules with IDs assigned
 */
export const addIdToRules = (
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
      rulesCondition[j].conditions = addIdToRules(rule.conditions);
    }
  }
  return rulesCondition;
};

/**
 * Check if all rules have complete IDs (including nested conditions)
 * @param rules - Array of rules conditions to check
 * @returns true if all rules have IDs, false otherwise
 */
export const hasCompleteIds = (
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
      if (!hasCompleteIds(rule.conditions)) {
        return false;
      }
    }
  }
  return true;
};

/**
 * Migration result interface
 */
export interface MigrationResult {
  processedCount: number;
  skippedCount: number;
}

/**
 * Migrate version configurations to add rule IDs
 * @param prisma - Prisma client instance
 * @returns Migration result with counts
 */
export const migrateVersionRuleIds = async (prisma: PrismaClient): Promise<MigrationResult> => {
  const versions = await prisma.version.findMany({ include: { steps: true } });
  let processedCount = 0;
  let skippedCount = 0;

  for (const version of versions) {
    if (!version.config) {
      continue;
    }
    const config = version.config as ContentConfigObject;

    // Check if this version already has complete IDs
    const autoStartRulesComplete = hasCompleteIds(config?.autoStartRules);
    const hideRulesComplete = hasCompleteIds(config?.hideRules);

    if (autoStartRulesComplete && hideRulesComplete) {
      skippedCount++;
      console.log(`Skipping version ${version.id} - already has complete IDs`);
      continue;
    }

    let hasChanges = false;
    if (config?.autoStartRules && !autoStartRulesComplete) {
      config.autoStartRules = addIdToRules(config.autoStartRules);
      hasChanges = true;
    }
    if (config?.hideRules && !hideRulesComplete) {
      config.hideRules = addIdToRules(config.hideRules);
      hasChanges = true;
    }
    if (hasChanges) {
      await prisma.version.update({
        where: { id: version.id },
        data: { config },
      });
      processedCount++;
      console.log(`Updated version ${version.id} with rule IDs`);
    }
  }

  console.log(
    `Migration completed: ${processedCount} versions updated, ${skippedCount} versions skipped`,
  );

  return { processedCount, skippedCount };
};
