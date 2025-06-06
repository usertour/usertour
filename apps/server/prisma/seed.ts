import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

enum SegmentDataType {
  ALL = 1,
  CONDITION = 2,
  MANUAL = 3,
}

enum SegmentBizType {
  USER = 1,
  COMPANY = 2,
}

const usedSegmentIds = [
  'cm7w4yt8m05vddj0o9o2aov4w',
  'cm86pmvff052q2ulka6rkyoyr',
  'cm8rmc7ht0kgwjdriyoh1gktc',
  'cm8rxwjyd0nhgjdritflga0ac',
  'cm93rer4a08wevqhtl0v8btiu',
  'cm99r4wc60hsdy2bn1a37bwpz',
  'cm9h9bed01982y2bn3kl3q1eu',
  'cm9h9e5hq19fby2bnd3r2u7b7',
  'cmagcsv7i000314e19yurmwtx',
  'cmah089ew00n91485mry5mdls',
];

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
          environmentId: bizSession.content?.environmentId ?? undefined,
        },
      });
      console.log(`Processed ${index + 1}/${bizSessions.length} bizSessions`);
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
          environmentId: bizSession?.environmentId ?? undefined,
        },
      });
      console.log(`Processed ${index + 1}/${bizAnswers.length} bizAnswers`);
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
          projectId: content.environment?.projectId ?? undefined,
        },
      });
      console.log(`Processed ${index + 1}/${contents.length} contents`);
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
        if (!content.environmentId) {
          console.warn(`Skipping content ${content.id}: No environmentId found`);
          continue;
        }

        if (!content.publishedVersionId) {
          console.warn(`Skipping content ${content.id}: No publishedVersionId found`);
          continue;
        }

        await prisma.contentOnEnvironment.create({
          data: {
            environmentId: content.environmentId,
            contentId: content.id,
            published: content.published ?? false,
            publishedVersionId: content.publishedVersionId,
          },
        });
        console.log(
          `Processed ${index + 1}/${contents2.length} published contents without contentOnEnvironments records`,
        );
      } catch (error) {
        console.error(`Failed to create contentOnEnvironment for content ${content.id}:`, error);
      }
    }

    console.log('\nData backfill completed successfully!');
  } catch (error) {
    console.error('Error during data backfill:', error);
  }

  const segments = await prisma.segment.findMany({
    where: { projectId: null },
    include: { environment: true },
  });
  console.log(`Found ${segments.length} segments without projectId to update`);

  for (const [index, segment] of segments.entries()) {
    if (!segment.environment) {
      console.warn(`Skipping segment ${segment.id}: No environment found`);
      continue;
    }
    await prisma.segment.update({
      where: { id: segment.id },
      data: { projectId: segment.environment.projectId },
    });
    console.log(`Processed ${index + 1}/${segments.length} segments for projectId backfill`);
  }

  const projects = await prisma.project.findMany({
    include: { segments: true },
  });
  console.log(`Found ${projects.length} projects to process for segment cleanup`);

  for (const project of projects) {
    console.log(`\nProcessing project ${project.id}...`);

    const bizUserSegments = project.segments.filter(
      (segment) =>
        segment.bizType === SegmentBizType.USER && segment.dataType === SegmentDataType.ALL,
    );
    console.log(`Found ${bizUserSegments.length} USER segments with ALL data type`);

    const bizCompanySegments = project.segments.filter(
      (segment) =>
        segment.bizType === SegmentBizType.COMPANY && segment.dataType === SegmentDataType.ALL,
    );
    console.log(`Found ${bizCompanySegments.length} COMPANY segments with ALL data type`);

    if (bizUserSegments.length > 1) {
      const usedUserSegments = bizUserSegments.filter((segment) =>
        usedSegmentIds.includes(segment.id),
      );
      console.log(`Found ${usedUserSegments.length} used USER segments`);

      if (usedUserSegments.length > 0) {
        // Keep all used segments, delete others
        const segmentsToDelete = bizUserSegments
          .filter((segment) => !usedSegmentIds.includes(segment.id))
          .map((segment) => segment.id);

        if (segmentsToDelete.length > 0) {
          console.log(`Deleting ${segmentsToDelete.length} unused USER segments`);
          await prisma.segment.deleteMany({
            where: {
              projectId: project.id,
              bizType: SegmentBizType.USER,
              dataType: SegmentDataType.ALL,
              id: { in: segmentsToDelete },
            },
          });
        }
      } else {
        // Keep first segment, delete others
        const segmentsToDelete = bizUserSegments.slice(1).map((segment) => segment.id);

        if (segmentsToDelete.length > 0) {
          console.log(`Deleting ${segmentsToDelete.length} USER segments, keeping first one`);
          await prisma.segment.deleteMany({
            where: {
              projectId: project.id,
              bizType: SegmentBizType.USER,
              dataType: SegmentDataType.ALL,
              id: { in: segmentsToDelete },
            },
          });
        }
      }
    }

    if (bizCompanySegments.length > 1) {
      const usedCompanySegments = bizCompanySegments.filter((segment) =>
        usedSegmentIds.includes(segment.id),
      );
      console.log(`Found ${usedCompanySegments.length} used COMPANY segments`);

      if (usedCompanySegments.length > 0) {
        // Keep all used segments, delete others
        const segmentsToDelete = bizCompanySegments
          .filter((segment) => !usedSegmentIds.includes(segment.id))
          .map((segment) => segment.id);

        if (segmentsToDelete.length > 0) {
          console.log(`Deleting ${segmentsToDelete.length} unused COMPANY segments`);
          await prisma.segment.deleteMany({
            where: {
              projectId: project.id,
              bizType: SegmentBizType.COMPANY,
              dataType: SegmentDataType.ALL,
              id: { in: segmentsToDelete },
            },
          });
        }
      } else {
        // Keep first segment, delete others
        const segmentsToDelete = bizCompanySegments.slice(1).map((segment) => segment.id);

        if (segmentsToDelete.length > 0) {
          console.log(`Deleting ${segmentsToDelete.length} COMPANY segments, keeping first one`);
          await prisma.segment.deleteMany({
            where: {
              projectId: project.id,
              bizType: SegmentBizType.COMPANY,
              dataType: SegmentDataType.ALL,
              id: { in: segmentsToDelete },
            },
          });
        }
      }
    }
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
