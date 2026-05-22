import { PrismaService } from 'nestjs-prisma';

/**
 * Minimal fixture factories for e2e specs — each creates one row with sane
 * defaults plus optional overrides, returning the created record. Compose
 * them per spec; pass a unique tag to keep parallel specs from colliding and
 * to make cleanup easy (e.g. delete by projectId).
 */
let counter = 0;
const unique = () => `e2e-${Date.now()}-${counter++}`;

export const createProject = (prisma: PrismaService, data: Record<string, any> = {}) =>
  prisma.project.create({ data: { name: `proj-${unique()}`, ...data } });

export const createUser = (prisma: PrismaService, data: Record<string, any> = {}) =>
  prisma.user.create({ data: { email: `${unique()}@test.local`, ...data } });

export const createMembership = (
  prisma: PrismaService,
  userId: string,
  projectId: string,
  role: string,
) =>
  prisma.userOnProject.create({
    data: { userId, projectId, role: role as any, actived: true },
  });

export const createEnvironment = (
  prisma: PrismaService,
  projectId: string,
  data: Record<string, any> = {},
) => prisma.environment.create({ data: { projectId, name: `env-${unique()}`, ...data } });

export const createContent = (
  prisma: PrismaService,
  projectId: string,
  environmentId: string,
  data: Record<string, any> = {},
) => prisma.content.create({ data: { projectId, environmentId, ...data } });

export const createVersion = (
  prisma: PrismaService,
  contentId: string,
  data: Record<string, any> = {},
) => prisma.version.create({ data: { contentId, ...data } });

export const createBizUser = (prisma: PrismaService, environmentId: string) =>
  prisma.bizUser.create({ data: { environmentId } });

export const createSession = (
  prisma: PrismaService,
  args: { bizUserId: string; contentId: string; versionId: string },
) => prisma.bizSession.create({ data: args });

export const createAttribute = (prisma: PrismaService, projectId: string) =>
  prisma.attribute.create({ data: { projectId } });

export const createTheme = (prisma: PrismaService, projectId: string) =>
  prisma.theme.create({ data: { projectId } });

export const createEvent = (prisma: PrismaService, projectId: string) =>
  prisma.event.create({ data: { projectId } });

export const createLocalization = (prisma: PrismaService, projectId: string) =>
  prisma.localization.create({
    data: { projectId, locale: 'en', name: 'English', code: 'en' },
  });

export const createSegment = (prisma: PrismaService, projectId: string, environmentId: string) =>
  prisma.segment.create({ data: { projectId, environmentId } });

export const createIntegration = (prisma: PrismaService, environmentId: string) =>
  prisma.integration.create({ data: { provider: 'salesforce', environmentId } });

export const createIntegrationObjectMapping = (prisma: PrismaService, integrationId: string) =>
  prisma.integrationObjectMapping.create({
    data: { integrationId, sourceObjectType: 'account', destinationObjectType: 'company' },
  });
