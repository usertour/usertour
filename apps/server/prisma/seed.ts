import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting data backfill...');

  try {
    // Step 1: Backfill bizSession.environmentId from related content
    console.log('Backfilling bizSession.environmentId...');
    const bizSessions = await prisma.bizSession.findMany({
      where: { environmentId: null },
      include: {
        content: true,
      },
    });
    console.log(`Found ${bizSessions.length} bizSessions to update`);

    for (const [index, bizSession] of bizSessions.entries()) {
      if (!bizSession.content?.environmentId) {
        console.warn(`Skipping bizSession ${bizSession.id}: No environmentId in content`);
        continue;
      }

      await prisma.bizSession.update({
        where: { id: bizSession.id },
        data: {
          environmentId: bizSession.content.environmentId,
        },
      });
      if (index % 100 === 0) {
        console.log(`Processed ${index + 1}/${bizSessions.length} bizSessions`);
      }
    }

    // Step 2: Backfill bizAnswer.environmentId from related content
    console.log('\nBackfilling bizAnswer.environmentId...');
    const bizAnswers = await prisma.bizAnswer.findMany({
      where: { environmentId: null },
    });
    console.log(`Found ${bizAnswers.length} bizAnswers to update`);

    for (const [index, bizAnswer] of bizAnswers.entries()) {
      const bizSession = await prisma.bizSession.findUnique({
        where: { id: bizAnswer.bizSessionId },
      });

      if (!bizSession?.environmentId) {
        console.warn(`Skipping bizAnswer ${bizAnswer.id}: No environmentId in bizSession`);
        continue;
      }

      await prisma.bizAnswer.update({
        where: { id: bizAnswer.id },
        data: {
          environmentId: bizSession.environmentId,
        },
      });
      if (index % 100 === 0) {
        console.log(`Processed ${index + 1}/${bizAnswers.length} bizAnswers`);
      }
    }

    // Step 3: Backfill content.projectId from related environment
    console.log('\nBackfilling content.projectId...');
    const contents = await prisma.content.findMany({
      where: { projectId: null },
      include: {
        environment: true,
      },
    });
    console.log(`Found ${contents.length} empty projectId contents to update`);

    for (const [index, content] of contents.entries()) {
      if (!content.environment?.projectId) {
        console.warn(`Skipping content ${content.id}: No projectId in environment`);
        continue;
      }

      await prisma.content.update({
        where: { id: content.id },
        data: {
          projectId: content.environment.projectId,
        },
      });
      if (index % 100 === 0) {
        console.log(`Processed ${index + 1}/${contents.length} contents`);
      }
    }

    const contents2 = await prisma.content.findMany({
      where: {
        published: true,
        publishedVersionId: {
          not: null,
        },
        contentOnEnvironments: {
          none: {},
        },
      },
    });
    console.log(
      `Found ${contents2.length} published contents without contentOnEnvironments records to update`,
    );

    for (const [index, content] of contents2.entries()) {
      try {
        await prisma.contentOnEnvironment.create({
          data: {
            environmentId: content.environmentId,
            contentId: content.id,
            published: true,
            publishedAt: content.publishedAt,
            publishedVersionId: content.publishedVersionId,
          },
        });
        if (index % 100 === 0) {
          console.log(
            `Processed ${index + 1}/${contents2.length} published contents without contentOnEnvironments records`,
          );
        }
      } catch (error) {
        console.error(`Failed to create contentOnEnvironment for content ${content.id}:`, error);
      }
    }

    console.log('\nData backfill completed successfully!');
  } catch (error) {
    console.error('Error during data backfill:', error);
  }

  // Step 4: Create initial user if none exists
  const user = await prisma.user.findFirst();
  if (user) {
    console.log('User already exists...');
    return;
  }

  console.log('Creating initial user...');
  await prisma.user.deleteMany();

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
