import { PrismaClient } from '@prisma/client';
import { cuid } from '@usertour/helpers';
import { ContentConfigObject } from '@usertour/types';

const prisma = new PrismaClient();

async function main() {
  const versions = await prisma.version.findMany({ include: { steps: true } });
  for (const version of versions) {
    if (!version.config) {
      continue;
    }
    const config = version.config as ContentConfigObject;
    let hasChanges = false;
    if (config?.autoStartRules) {
      config.autoStartRules = config.autoStartRules.map((rule) => ({
        ...rule,
        id: cuid(),
      }));
      hasChanges = true;
    }
    if (config?.hideRules) {
      config.hideRules = config.hideRules.map((rule) => ({
        ...rule,
        id: cuid(),
      }));
      hasChanges = true;
    }
    if (hasChanges) {
      await prisma.version.update({
        where: { id: version.id },
        data: { config },
      });
    }
  }
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
