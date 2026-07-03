import { PrismaClient } from '@prisma/client';
import { migrateConditionIds, validateConditionIds } from './migration';
import { backfillProjectDefaults } from './project-defaults';

const prisma = new PrismaClient();

async function main() {
  // Migrate condition IDs
  await migrateConditionIds(prisma);

  // Validate migration result
  const result = await validateConditionIds(prisma);
  if (result.isAllValid) {
    console.log('✅ All versions have complete condition IDs!');
  } else {
    console.log(`❌ Found ${result.invalidVersions} versions with missing IDs`);
  }

  // Backfill default events / attributes into projects created before a default
  // was added (idempotent; only touches projects actually missing one).
  const defaults = await backfillProjectDefaults(prisma);
  if (defaults.failed.length > 0) {
    for (const { projectId, error } of defaults.failed) {
      console.error(`❌ Project defaults backfill failed for ${projectId}: ${error}`);
    }
  }
  console.log(
    `✅ Project defaults backfill: ${defaults.backfilled} backfilled, ${defaults.failed.length} failed, ${defaults.total} total`,
  );
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
