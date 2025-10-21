import { PrismaClient } from '@prisma/client';
import { migrateConditionIds } from './migration';

const prisma = new PrismaClient();

async function main() {
  // Migrate condition IDs
  await migrateConditionIds(prisma);

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
