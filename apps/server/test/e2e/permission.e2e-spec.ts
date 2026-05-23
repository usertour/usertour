import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, isPermissionDenied, signToken } from './auth';
import { createTestApp } from './create-test-app';
import {
  ALLOW_ROLE,
  DENY_ROLES,
  ENDPOINTS,
  ROLES,
  type Endpoint,
  type Role,
  type Seed,
} from './endpoints';
import {
  createAttribute,
  createBizUser,
  createContent,
  createEnvironment,
  createEvent,
  createIntegration,
  createIntegrationObjectMapping,
  createLocalization,
  createMembership,
  createProject,
  createSegment,
  createSession,
  createTheme,
  createUser,
  createVersion,
} from './factories';

/**
 * Real HTTP authorization contract for every role-gated GraphQL endpoint.
 *
 * Boots the full app against a test database, seeds one project with a member
 * at each role (OWNER/ADMIN/VIEWER) plus a non-member, and fires real
 * operations via supertest. For each endpoint the spec asserts the *deny*
 * direction for every role that must NOT reach it — the guard throws before
 * the resolver runs, so this is side-effect free even for mutations. For
 * queries it additionally asserts the lowest allowed role is NOT denied
 * (queries are read-only); mutation allow direction is intentionally not
 * exercised over HTTP (it would create/delete/publish/email) — it is covered
 * compositionally by the matrix + decorator unit tests.
 *
 * The endpoint table lives in `./endpoints` (shared with smoke scripts under
 * test/smoke). Each row carries the required tier as a literal (R/W/O), so the
 * contract is independent of the server's capability map; a wrong tier there
 * fails independently of the implementation it checks.
 *
 * Run with DATABASE_URL pointed at a migrated test DB:
 *   DATABASE_URL=...usertour_test... pnpm test:e2e
 */
describe('Permission authorization (HTTP e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const token = {} as Record<Role, string>;
  const seed: Seed = {};

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await createProject(prisma, { name: 'perm-e2e' });
    seed.projectId = project.id;
    for (const role of ROLES) {
      const user = await createUser(prisma);
      seed[`user_${role}`] = user.id;
      token[role] = signToken(app, user.id);
      // NONE has no membership anywhere; ELSEWHERE belongs to a *different*
      // project (seeded below) — neither is a member of `project`.
      if (role !== 'NONE' && role !== 'ELSEWHERE') {
        await createMembership(prisma, user.id, project.id, role);
      }
    }

    // Foreign project used only to give ELSEWHERE an OWNER membership *somewhere
    // else*, so cross-project deny tests exercise the IDOR shape where the user
    // is authenticated and has memberships, just not on the target project.
    const projectB = await createProject(prisma, { name: 'perm-e2e-foreign' });
    seed.projectBId = projectB.id;
    await createMembership(prisma, seed.user_ELSEWHERE, projectB.id, 'OWNER');

    const environment = await createEnvironment(prisma, project.id, { name: 'e2e-env' });
    const content = await createContent(prisma, project.id, environment.id);
    const version = await createVersion(prisma, content.id);
    const bizUser = await createBizUser(prisma, environment.id);
    const session = await createSession(prisma, {
      bizUserId: bizUser.id,
      contentId: content.id,
      versionId: version.id,
    });
    const attribute = await createAttribute(prisma, project.id);
    const theme = await createTheme(prisma, project.id);
    const event = await createEvent(prisma, project.id);
    const localization = await createLocalization(prisma, project.id);
    const segment = await createSegment(prisma, project.id, environment.id);
    const integration = await createIntegration(prisma, environment.id);
    const mapping = await createIntegrationObjectMapping(prisma, integration.id);
    Object.assign(seed, {
      environmentId: environment.id,
      contentId: content.id,
      versionId: version.id,
      sessionId: session.id,
      attributeId: attribute.id,
      themeId: theme.id,
      eventId: event.id,
      localizationId: localization.id,
      segmentId: segment.id,
      integrationId: integration.id,
      mappingId: mapping.id,
    });
  }, 60000);

  afterAll(async () => {
    if (prisma && seed.projectId) {
      await prisma.integrationObjectMapping.deleteMany({
        where: { integrationId: seed.integrationId },
      });
      await prisma.integration.deleteMany({ where: { environmentId: seed.environmentId } });
      await prisma.bizSession.deleteMany({ where: { contentId: seed.contentId } });
      await prisma.bizUser.deleteMany({ where: { environmentId: seed.environmentId } });
      // findManyVersionLocations (allow direction) materializes these rows.
      await prisma.versionOnLocalization.deleteMany({ where: { versionId: seed.versionId } });
      await prisma.version.deleteMany({ where: { contentId: seed.contentId } });
      await prisma.content.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.segment.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.localization.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.event.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.theme.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.attribute.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.environment.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: seed.projectId } });
      if (seed.projectBId) {
        await prisma.userOnProject.deleteMany({ where: { projectId: seed.projectBId } });
      }
      await prisma.user.deleteMany({
        where: { id: { in: ROLES.map((role) => seed[`user_${role}`]) } },
      });
      await prisma.project.deleteMany({ where: { id: seed.projectId } });
      if (seed.projectBId) {
        await prisma.project.deleteMany({ where: { id: seed.projectBId } });
      }
    }
    await app?.close();
  });

  const denied = (role: Role, ep: Endpoint) =>
    graphql(app, { query: ep.doc, variables: ep.vars(seed), token: token[role] }).then(
      isPermissionDenied,
    );

  it('covers every role-gated endpoint', () => {
    expect(ENDPOINTS).toHaveLength(93);
  });

  for (const ep of ENDPOINTS) {
    describe(ep.key, () => {
      for (const role of DENY_ROLES[ep.tier]) {
        it(`denies ${role}`, async () => {
          expect(await denied(role, ep)).toBe(true);
        });
      }
      // The allow direction is exercised for queries only: they don't destroy
      // fixtures or reach external services (a few lazily materialize a child
      // row, which teardown cleans up). Mutation allow is not fired — it would
      // create/delete/publish/email — and is covered by the unit matrix.
      // `denyOnly` further skips queries that would call an external service.
      if (ep.op === 'query' && !ep.denyOnly) {
        const role = ALLOW_ROLE[ep.tier];
        it(`allows ${role}`, async () => {
          expect(await denied(role, ep)).toBe(false);
        });
      }
    });
  }
});
