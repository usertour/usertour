import { PrismaClient } from '@prisma/client';
import { cuid } from '@usertour/helpers';
import { ContentConfigObject, RulesCondition } from '@usertour/types';

const prisma = new PrismaClient();

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

async function main() {
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

  // Step 4: Create initial user if none exists
  const user = await prisma.user.findFirst();
  if (user) {
    console.log('User already exists...');
    return;
  }

  const user1 = await prisma.user.create({
    data: {
      email: 'lisa@simpson.com',
      name: 'Lisa',
      password: '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyuiXe/QLSUG6xNekdHgTGmrpHEfIoxm', // secret42
    },
  });

  console.log('Initial user created:', { user1 });
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
