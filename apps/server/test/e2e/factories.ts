import { PrismaClient } from '@prisma/client';

/**
 * Minimal fixture factories for e2e specs — each creates one row with sane
 * defaults plus optional overrides, returning the created record. Compose
 * them per spec; pass a unique tag to keep parallel specs from colliding and
 * to make cleanup easy (e.g. delete by projectId).
 */
let counter = 0;
const unique = () => `e2e-${Date.now()}-${counter++}`;

export const createProject = (prisma: PrismaClient, data: Record<string, any> = {}) =>
  prisma.project.create({ data: { name: `proj-${unique()}`, ...data } });

export const createUser = (prisma: PrismaClient, data: Record<string, any> = {}) =>
  prisma.user.create({ data: { email: `${unique()}@test.local`, ...data } });

export const createMembership = (
  prisma: PrismaClient,
  userId: string,
  projectId: string,
  role: string,
) =>
  prisma.userOnProject.create({
    data: { userId, projectId, role: role as any, actived: true },
  });

export const createEnvironment = (
  prisma: PrismaClient,
  projectId: string,
  data: Record<string, any> = {},
) => prisma.environment.create({ data: { projectId, name: `env-${unique()}`, ...data } });

export const createContent = (
  prisma: PrismaClient,
  projectId: string,
  environmentId: string,
  data: Record<string, any> = {},
) => prisma.content.create({ data: { projectId, environmentId, ...data } });

export const createVersion = async (
  prisma: PrismaClient,
  contentId: string,
  data: Record<string, any> = {},
) => {
  const version = await prisma.version.create({ data: { contentId, ...data } });
  // Mirror the admin createContent flow: the freshly created version becomes
  // the content's "currently being edited" version, so subsequent
  // addContentSteps / updateContentStep / upsertVersionLocationData calls
  // pass `contentVersionIsEditable` and exercise the real write path. Without
  // this link, those mutations short-circuit on a ParamsError.
  await prisma.content.update({
    where: { id: contentId },
    data: { editedVersionId: version.id },
  });
  return version;
};

export const createBizUser = (prisma: PrismaClient, environmentId: string) =>
  // BizUser is unique on (environmentId, externalId); without a per-call id,
  // seeding two BizUsers in the same env hits a P2002 dup. Mirror
  // createBizCompany's shape.
  prisma.bizUser.create({ data: { environmentId, externalId: `bu-${unique()}` } });

export const createSession = (
  prisma: PrismaClient,
  args: { bizUserId: string; contentId: string; versionId: string },
) => prisma.bizSession.create({ data: args });

// Attribute / Event / Theme / Localization / Segment all carry per-project
// unique constraints (codeName / name / locale). The factories give every
// call a unique value so seeding multiple rows in one project doesn't hit
// P2002.
export const createAttribute = (prisma: PrismaClient, projectId: string) =>
  prisma.attribute.create({ data: { projectId, codeName: `attr_${unique()}` } });

export const createTheme = (prisma: PrismaClient, projectId: string) =>
  prisma.theme.create({ data: { projectId, name: `theme-${unique()}` } });

export const createEvent = (prisma: PrismaClient, projectId: string) =>
  prisma.event.create({ data: { projectId, codeName: `evt_${unique()}` } });

export const createLocalization = (prisma: PrismaClient, projectId: string) => {
  const slug = unique().replace(/-/g, '_');
  return prisma.localization.create({
    data: { projectId, locale: slug, name: slug, code: slug },
  });
};

export const createSegment = (prisma: PrismaClient, projectId: string, environmentId: string) =>
  prisma.segment.create({ data: { projectId, environmentId, name: `seg-${unique()}` } });

export const createIntegration = (prisma: PrismaClient, environmentId: string) =>
  prisma.integration.create({ data: { provider: 'salesforce', environmentId } });

export const createIntegrationObjectMapping = (prisma: PrismaClient, integrationId: string) =>
  prisma.integrationObjectMapping.create({
    data: { integrationId, sourceObjectType: 'account', destinationObjectType: 'company' },
  });

export const createAccessToken = (prisma: PrismaClient, environmentId: string) =>
  prisma.accessToken.create({ data: { environmentId, name: `tok-${unique()}` } });

export const createStep = (prisma: PrismaClient, versionId: string) =>
  prisma.step.create({ data: { versionId, type: 'tooltip' } });

export const createBizCompany = (prisma: PrismaClient, environmentId: string) =>
  prisma.bizCompany.create({ data: { environmentId, externalId: `co-${unique()}` } });

export const createInvite = (prisma: PrismaClient, projectId: string, invitedByUserId: string) =>
  prisma.invite.create({
    data: {
      projectId,
      userId: invitedByUserId,
      email: `invite-${unique()}@local`,
      name: `pending-${unique()}`,
      role: 'VIEWER' as any,
    },
  });

/**
 * Seeds a BUSINESS-plan Subscription and links the project to it. BUSINESS
 * has `environmentLimit: 'unlimited'` and `teamMemberLimit: 'unlimited'`, so
 * every plan-gated mutation (createEnvironments / inviteTeamMember /…) gets a
 * clear runway in the permission spot-check. The project's `subscriptionId`
 * column is what `resolveProjectFeatures` keys on to find the subscription.
 */
export const createSubscription = async (
  prisma: PrismaClient,
  projectId: string,
  // Lowercase to match the PlanType enum values in @usertour/types
  // (the server stores them lowercase: 'hobby' / 'starter' / 'business' …).
  // Anything else falls through `PLAN_FEATURES[planType] ?? HOBBY` and
  // silently lands on HOBBY's 1-env / 1-member limit.
  planType = 'business',
) => {
  const subscriptionId = `sub_e2e_${unique()}`;
  const subscription = await prisma.subscription.create({
    data: {
      subscriptionId,
      lookupKey: `lookup_e2e_${unique()}`,
      planType,
      interval: 'monthly',
      projectId,
      status: 'active',
    },
  });
  await prisma.project.update({ where: { id: projectId }, data: { subscriptionId } });
  return subscription;
};
