import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { signToken } from '../auth';
import { buildMembership, buildUser } from '../factories';

type ProjectRole = 'OWNER' | 'ADMIN' | 'VIEWER';

/**
 * Create a user, add them to a project with the given role, and sign a JWT.
 * Returns the user + a bearer token ready for `graphql(app, { ..., token })`.
 * The User row is NOT project-scoped, so `teardownProject` won't remove it — the
 * spec should collect `user.id`s and delete them in `afterAll`.
 */
export async function buildAuthorizedUser(
  prisma: PrismaService,
  app: INestApplication,
  opts: { projectId: string; role?: ProjectRole },
) {
  const user = await buildUser(prisma);
  await buildMembership(prisma, {
    userId: user.id,
    projectId: opts.projectId,
    role: (opts.role ?? 'OWNER') as never,
  });
  return { user, token: signToken(app, user.id) };
}

/**
 * FK-ordered, project-scoped teardown — generalizes permission.e2e-spec's
 * afterAll to "everything under one project". Deletes child rows before parents;
 * biz tables are scoped through the project's environments. Tables a given spec
 * never created simply match zero rows. Does NOT delete User rows (not
 * project-scoped — track & delete those in the spec). The content.update step
 * nulls the self-referential edited/published version FKs before deleting
 * versions.
 */
export async function teardownProject(prisma: PrismaService, projectId: string): Promise<void> {
  const envs = await prisma.environment.findMany({ where: { projectId }, select: { id: true } });
  const environmentId = { in: envs.map((e) => e.id) };

  await prisma.bizAnswer.deleteMany({ where: { environmentId } });
  await prisma.bizEvent.deleteMany({ where: { bizUser: { environmentId } } });
  await prisma.attributeOnEvent.deleteMany({ where: { event: { projectId } } });
  await prisma.bizUserOnCompany.deleteMany({ where: { bizUser: { environmentId } } });
  await prisma.bizUserOnSegment.deleteMany({ where: { segment: { projectId } } });
  await prisma.bizCompanyOnSegment.deleteMany({ where: { segment: { projectId } } });
  await prisma.bizSession.deleteMany({ where: { content: { projectId } } });
  await prisma.bizCompany.deleteMany({ where: { environmentId } });
  await prisma.bizUser.deleteMany({ where: { environmentId } });
  await prisma.step.deleteMany({ where: { version: { content: { projectId } } } });
  await prisma.versionOnLocalization.deleteMany({ where: { version: { content: { projectId } } } });
  await prisma.contentOnEnvironment.deleteMany({ where: { content: { projectId } } });
  await prisma.content.updateMany({
    where: { projectId },
    data: { editedVersionId: null, publishedVersionId: null },
  });
  await prisma.version.deleteMany({ where: { content: { projectId } } });
  await prisma.content.deleteMany({ where: { projectId } });
  await prisma.segment.deleteMany({ where: { projectId } });
  await prisma.localization.deleteMany({ where: { projectId } });
  await prisma.event.deleteMany({ where: { projectId } });
  await prisma.theme.deleteMany({ where: { projectId } });
  await prisma.attribute.deleteMany({ where: { projectId } });
  await prisma.accessToken.deleteMany({ where: { environmentId } });
  await prisma.integrationObjectMapping.deleteMany({ where: { integration: { environmentId } } });
  await prisma.integration.deleteMany({ where: { environmentId } });
  await prisma.invite.deleteMany({ where: { projectId } });
  await prisma.environment.deleteMany({ where: { projectId } });
  await prisma.userOnProject.deleteMany({ where: { projectId } });
  await prisma.project.updateMany({ where: { id: projectId }, data: { subscriptionId: null } });
  await prisma.subscription.deleteMany({ where: { projectId } });
  await prisma.project.deleteMany({ where: { id: projectId } });
}
