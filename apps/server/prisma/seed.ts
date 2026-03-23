import { PrismaClient } from '@prisma/client';
import { migrateConditionIds, validateConditionIds } from './migration';

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
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
