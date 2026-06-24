import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

/**
 * Test fixture builders, written in the outline-style "recursive override"
 * shape: every helper takes `(prisma, overrides?)`, fills missing parent FKs
 * by recursively building them, and inherits sane defaults from a per-call
 * `unique()` counter that keeps per-project unique columns (codeName /
 * locale / name / externalId / …) from colliding when one project seeds
 * multiple rows of the same kind.
 *
 * Usage shapes:
 *
 *   // bare — auto-builds project + environment + content + version + step
 *   const step = await buildStep(prisma);
 *
 *   // share a single project across many resources (the prep-fixture case)
 *   const project = await buildProject(prisma);
 *   const environment = await buildEnvironment(prisma, { projectId: project.id });
 *   const content = await buildContent(prisma, {
 *     projectId: project.id,
 *     environmentId: environment.id,
 *   });
 *
 *   // role aliases — same buildUser body, different role default
 *   const admin = await buildAdmin(prisma, { projectId: project.id });
 *
 * Pattern rules:
 *   1. `overrides: Partial<Prisma.XUncheckedCreateInput> = {}` — caller fills only what
 *      they care about, raw FK ids accepted directly (no `connect: { id }`
 *      wrapping needed).
 *   2. Each parent FK gets a `if (!overrides.xId) { … }` block that recursively
 *      builds the parent. Always pass already-derived ids down the chain so a
 *      single buildContent doesn't fork into two unrelated projects.
 *   3. Defaults use the `unique()` counter (NOT faker) so failed tests are
 *      deterministically reproducible. Trade-off: less random coverage; we
 *      consciously favor debuggability.
 */

let counter = 0;
// Include the jest worker id + a random suffix so values never collide across
// parallel workers sharing the test DB. Two specs booting in the same
// millisecond would otherwise both emit `e2e-<ms>-0` and trip unique
// constraints (e.g. User.email, Subscription.subscriptionId).
const unique = () =>
  `e2e-${process.env.JEST_WORKER_ID ?? '0'}-${Date.now()}-${counter++}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

// ── root nodes (no parent FKs) ─────────────────────────────────────

export async function buildProject(
  prisma: PrismaClient,
  overrides: Partial<Prisma.ProjectUncheckedCreateInput> = {},
) {
  return prisma.project.create({
    data: { name: `proj-${unique()}`, ...overrides },
  });
}

export async function buildUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserUncheckedCreateInput> = {},
) {
  return prisma.user.create({
    data: { email: `${unique()}@test.local`, ...overrides },
  });
}

// ── one-level FKs ──────────────────────────────────────────────────

/**
 * Seeds a BUSINESS-plan Subscription and links the project to it. BUSINESS
 * has `environmentLimit: 'unlimited'` and `teamMemberLimit: 'unlimited'`, so
 * every plan-gated mutation gets a clear runway in the permission spot-check.
 * `planType` is **lowercase** to match the `PlanType` enum values in
 * `@usertour/types` — anything else falls through to HOBBY's 1-env / 1-member
 * limit. The project's `subscriptionId` column is what
 * `resolveProjectFeatures` keys on, so we update it inline.
 */
export async function buildSubscription(
  prisma: PrismaClient,
  overrides: Partial<Prisma.SubscriptionUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  const subscription = await prisma.subscription.create({
    data: {
      subscriptionId: `sub_e2e_${unique()}`,
      lookupKey: `lookup_e2e_${unique()}`,
      planType: 'business',
      interval: 'monthly',
      status: 'active',
      ...overrides,
      projectId: overrides.projectId,
    },
  });
  await prisma.project.update({
    where: { id: overrides.projectId },
    data: { subscriptionId: subscription.subscriptionId },
  });
  return subscription;
}

export async function buildMembership(
  prisma: PrismaClient,
  overrides: Partial<Prisma.UserOnProjectUncheckedCreateInput> = {},
) {
  if (!overrides.userId) {
    const user = await buildUser(prisma);
    overrides.userId = user.id;
  }
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  return prisma.userOnProject.create({
    data: {
      role: 'VIEWER',
      actived: true,
      ...overrides,
      userId: overrides.userId,
      projectId: overrides.projectId,
    },
  });
}

export async function buildEnvironment(
  prisma: PrismaClient,
  overrides: Partial<Prisma.EnvironmentUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  return prisma.environment.create({
    data: { name: `env-${unique()}`, ...overrides, projectId: overrides.projectId },
  });
}

export async function buildAttribute(
  prisma: PrismaClient,
  overrides: Partial<Prisma.AttributeUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  return prisma.attribute.create({
    data: { codeName: `attr_${unique()}`, ...overrides, projectId: overrides.projectId },
  });
}

export async function buildTheme(
  prisma: PrismaClient,
  overrides: Partial<Prisma.ThemeUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  return prisma.theme.create({
    data: { name: `theme-${unique()}`, ...overrides, projectId: overrides.projectId },
  });
}

export async function buildEvent(
  prisma: PrismaClient,
  overrides: Partial<Prisma.EventUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  return prisma.event.create({
    data: { codeName: `evt_${unique()}`, ...overrides, projectId: overrides.projectId },
  });
}

export async function buildLocalization(
  prisma: PrismaClient,
  overrides: Partial<Prisma.LocalizationUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  const slug = unique().replace(/-/g, '_');
  return prisma.localization.create({
    data: { locale: slug, name: slug, code: slug, ...overrides, projectId: overrides.projectId },
  });
}

export async function buildSegment(
  prisma: PrismaClient,
  overrides: Partial<Prisma.SegmentUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma, { projectId: overrides.projectId });
    overrides.environmentId = environment.id;
  }
  return prisma.segment.create({
    data: {
      name: `seg-${unique()}`,
      ...overrides,
      projectId: overrides.projectId,
      environmentId: overrides.environmentId,
    },
  });
}

export async function buildContent(
  prisma: PrismaClient,
  overrides: Partial<Prisma.ContentUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma, { projectId: overrides.projectId });
    overrides.environmentId = environment.id;
  }
  return prisma.content.create({
    data: {
      ...overrides,
      projectId: overrides.projectId,
      environmentId: overrides.environmentId,
    },
  });
}

/**
 * Creates the Version and also links it as Content.editedVersionId — that's
 * what the admin createContent flow does in production, and it's what makes
 * later step / version-localization mutations pass the
 * `contentVersionIsEditable` check.
 */
export async function buildVersion(
  prisma: PrismaClient,
  overrides: Partial<Prisma.VersionUncheckedCreateInput> = {},
) {
  if (!overrides.contentId) {
    const content = await buildContent(prisma);
    overrides.contentId = content.id;
  }
  const version = await prisma.version.create({
    data: { ...overrides, contentId: overrides.contentId },
  });
  await prisma.content.update({
    where: { id: overrides.contentId },
    data: { editedVersionId: version.id },
  });
  return version;
}

export async function buildStep(
  prisma: PrismaClient,
  overrides: Partial<Prisma.StepUncheckedCreateInput> = {},
) {
  if (!overrides.versionId) {
    const version = await buildVersion(prisma);
    overrides.versionId = version.id;
  }
  return prisma.step.create({
    data: { type: 'tooltip', ...overrides, versionId: overrides.versionId },
  });
}

/** A minimal renderable step body (one text block) — passes the usability validator. */
export const USABLE_STEP_DATA = [
  { children: [{ children: [{ element: { type: 'text', data: {} } }] }] },
];

/**
 * A flow version that passes the strict usability validator: a project theme +
 * one modal step with content. Use this when a test needs to actually publish.
 */
export async function buildUsableFlowVersion(
  prisma: PrismaClient,
  args: { contentId: string; projectId: string; sequence?: number },
) {
  const theme = await buildTheme(prisma, { projectId: args.projectId });
  const version = await buildVersion(prisma, {
    contentId: args.contentId,
    sequence: args.sequence ?? 0,
    themeId: theme.id,
  });
  await buildStep(prisma, {
    versionId: version.id,
    type: 'modal',
    sequence: 0,
    data: USABLE_STEP_DATA as unknown as Prisma.InputJsonValue,
  });
  return version;
}

export async function buildBizUser(
  prisma: PrismaClient,
  overrides: Partial<Prisma.BizUserUncheckedCreateInput> = {},
) {
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma);
    overrides.environmentId = environment.id;
  }
  return prisma.bizUser.create({
    data: { externalId: `bu-${unique()}`, ...overrides, environmentId: overrides.environmentId },
  });
}

export async function buildBizCompany(
  prisma: PrismaClient,
  overrides: Partial<Prisma.BizCompanyUncheckedCreateInput> = {},
) {
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma);
    overrides.environmentId = environment.id;
  }
  return prisma.bizCompany.create({
    data: { externalId: `co-${unique()}`, ...overrides, environmentId: overrides.environmentId },
  });
}

/**
 * Join row linking a BizUser to a BizCompany (a "company membership"). `data`
 * is a non-optional JsonB column (defaults to `{}`). The caller is responsible
 * for ensuring the bizUser and bizCompany live in the SAME environment — the
 * membership lookup joins on both externalIds within one environment, so a
 * cross-env pair would be unreachable.
 */
export async function buildBizUserOnCompany(
  prisma: PrismaClient,
  overrides: Partial<Prisma.BizUserOnCompanyUncheckedCreateInput> = {},
) {
  if (!overrides.bizUserId) {
    const bizUser = await buildBizUser(prisma);
    overrides.bizUserId = bizUser.id;
  }
  if (!overrides.bizCompanyId) {
    const bizCompany = await buildBizCompany(prisma);
    overrides.bizCompanyId = bizCompany.id;
  }
  return prisma.bizUserOnCompany.create({
    data: {
      data: {},
      ...overrides,
      bizUserId: overrides.bizUserId,
      bizCompanyId: overrides.bizCompanyId,
    },
  });
}

/**
 * Session FKs span three parents (bizUser, content, version). If only
 * `versionId` is provided we derive `contentId` from it — the two must agree
 * or the session is orphaned.
 */
export async function buildSession(
  prisma: PrismaClient,
  overrides: Partial<Prisma.BizSessionUncheckedCreateInput> = {},
) {
  if (!overrides.bizUserId) {
    const bizUser = await buildBizUser(prisma);
    overrides.bizUserId = bizUser.id;
  }
  if (!overrides.versionId) {
    const version = await buildVersion(prisma);
    overrides.versionId = version.id;
    overrides.contentId ??= version.contentId;
  }
  if (!overrides.contentId) {
    const version = await prisma.version.findUniqueOrThrow({
      where: { id: overrides.versionId },
      select: { contentId: true },
    });
    overrides.contentId = version.contentId;
  }
  return prisma.bizSession.create({
    data: {
      ...overrides,
      bizUserId: overrides.bizUserId,
      contentId: overrides.contentId,
      versionId: overrides.versionId,
    },
  });
}

export async function buildIntegration(
  prisma: PrismaClient,
  overrides: Partial<Prisma.IntegrationUncheckedCreateInput> = {},
) {
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma);
    overrides.environmentId = environment.id;
  }
  return prisma.integration.create({
    data: {
      provider: 'salesforce',
      ...overrides,
      environmentId: overrides.environmentId,
    },
  });
}

export async function buildIntegrationObjectMapping(
  prisma: PrismaClient,
  overrides: Partial<Prisma.IntegrationObjectMappingUncheckedCreateInput> = {},
) {
  if (!overrides.integrationId) {
    const integration = await buildIntegration(prisma);
    overrides.integrationId = integration.id;
  }
  return prisma.integrationObjectMapping.create({
    data: {
      sourceObjectType: 'account',
      destinationObjectType: 'company',
      ...overrides,
      integrationId: overrides.integrationId,
    },
  });
}

export async function buildAccessToken(
  prisma: PrismaClient,
  overrides: Partial<Prisma.AccessTokenUncheckedCreateInput> = {},
) {
  if (!overrides.environmentId) {
    const environment = await buildEnvironment(prisma);
    overrides.environmentId = environment.id;
  }
  return prisma.accessToken.create({
    data: { name: `tok-${unique()}`, ...overrides, environmentId: overrides.environmentId },
  });
}

export async function buildInvite(
  prisma: PrismaClient,
  overrides: Partial<Prisma.InviteUncheckedCreateInput> = {},
) {
  if (!overrides.projectId) {
    const project = await buildProject(prisma);
    overrides.projectId = project.id;
  }
  if (!overrides.userId) {
    // `userId` here is the *creator* of the invite, not the invited person.
    const user = await buildUser(prisma);
    overrides.userId = user.id;
  }
  return prisma.invite.create({
    data: {
      email: `invite-${unique()}@local`,
      name: `pending-${unique()}`,
      role: 'VIEWER',
      ...overrides,
      projectId: overrides.projectId,
      userId: overrides.userId,
    },
  });
}

// ── role-aliased user builders (sugar over buildUser + buildMembership) ──

/**
 * Builds a User + UserOnProject in a given project with the requested role in
 * one shot. Mirrors outline's `buildAdmin` / `buildViewer` sugar — the common
 * "I need an OWNER of this project" case is now a single line. If no project
 * is passed, builds a fresh one.
 */
type RoleBuilderOverrides = Partial<Prisma.UserUncheckedCreateInput> & { projectId?: string };

async function buildMember(
  prisma: PrismaClient,
  role: 'OWNER' | 'ADMIN' | 'VIEWER',
  overrides: RoleBuilderOverrides = {},
) {
  const { projectId, ...userOverrides } = overrides;
  const user = await buildUser(prisma, userOverrides);
  const resolvedProjectId = projectId ?? (await buildProject(prisma)).id;
  await buildMembership(prisma, {
    userId: user.id,
    projectId: resolvedProjectId,
    role,
  });
  return user;
}

export const buildOwner = (prisma: PrismaClient, overrides?: RoleBuilderOverrides) =>
  buildMember(prisma, 'OWNER', overrides);
export const buildAdmin = (prisma: PrismaClient, overrides?: RoleBuilderOverrides) =>
  buildMember(prisma, 'ADMIN', overrides);
export const buildViewer = (prisma: PrismaClient, overrides?: RoleBuilderOverrides) =>
  buildMember(prisma, 'VIEWER', overrides);
