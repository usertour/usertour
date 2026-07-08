import { PrismaClient } from '@prisma/client';
import { migrateConditionIds, validateConditionIds } from './migration';
import { backfillProjectDefaults } from './project-defaults';

// PrismaClient always connects through the datasource `url` (the pooled PgBouncer
// endpoint); `directUrl` only applies to Prisma CLI commands. Seed is a short-lived
// boot-time script, so connect directly to avoid failing when the pooler has no
// free client slots during deploy overlap.
const prisma = new PrismaClient(
  process.env.DATABASE_DIRECT_URL ? { datasourceUrl: process.env.DATABASE_DIRECT_URL } : undefined,
);

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
    `✅ Project defaults backfill: ${defaults.total - defaults.failed.length}/${defaults.total} projects ok, ${defaults.failed.length} failed`,
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
