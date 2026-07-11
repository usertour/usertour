import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { TeamService } from '@/team/team.service';

import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSegment,
  buildSubscription,
  buildUser,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Membership environment scope (UserOnProject.allowedEnvironmentIds) on the web
 * GraphQL surface: a restricted member may only act on their environments —
 * publish targeting an out-of-scope environment is refused (E0055), in-scope
 * succeeds, and OWNER is exempt by design.
 */
describe('member environment scope (gql e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let allowedEnvId: string;
  let blockedEnvId: string;
  let adminToken: string;
  let ownerToken: string;
  let adminUserId: string;
  let ownerUserId: string;

  const PUBLISH = `mutation ($data: VersionIdInput!) {
    publishedContentVersion(data: $data) { id }
  }`;

  async function seedPublishableVersion() {
    const content = await buildContent(prisma, {
      projectId,
      environmentId: allowedEnvId,
      type: 'flow',
    });
    const version = await buildVersion(prisma, { contentId: content.id, sequence: 0 });
    return version.id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'member-env-scope' })).id;
    allowedEnvId = (await buildEnvironment(prisma, { projectId })).id;
    blockedEnvId = (await buildEnvironment(prisma, { projectId })).id;

    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const admin = await buildAuthorizedUser(prisma, app, { projectId, role: 'ADMIN' });
    adminToken = admin.token;
    adminUserId = admin.user.id;
    await prisma.userOnProject.updateMany({
      where: { userId: adminUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId] },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, adminUserId] } } });
    }
    await app?.close();
  });

  it('refuses publish to an environment outside the membership scope (E0055)', async () => {
    const versionId = await seedPublishableVersion();
    const res = await graphql(app, {
      token: adminToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: blockedEnvId } },
    });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('E0055');
  });

  it('allows publish within the membership scope', async () => {
    const versionId = await seedPublishableVersion();
    const res = await graphql(app, {
      token: adminToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: allowedEnvId } },
    });
    expect(gqlData(res).publishedContentVersion?.id).toBeTruthy();
  });

  it('refuses environment-scoped reads outside the membership scope (E0055)', async () => {
    const USERS = `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
      queryBizUser(query: $query, orderBy: $orderBy, first: $first) { totalCount }
    }`;
    const denied = await graphql(app, {
      token: adminToken,
      query: USERS,
      variables: {
        query: { environmentId: blockedEnvId },
        orderBy: { field: 'createdAt', direction: 'desc' },
        first: 10,
      },
    });
    expect(denied.body.errors?.[0]?.extensions?.code).toBe('E0055');

    const allowed = await graphql(app, {
      token: adminToken,
      query: USERS,
      variables: {
        query: { environmentId: allowedEnvId },
        orderBy: { field: 'createdAt', direction: 'desc' },
        first: 10,
      },
    });
    expect(gqlData(allowed).queryBizUser.totalCount).toBe(0);
  });

  it("refuses adding an OUT-OF-SCOPE environment's user to a segment (E0055)", async () => {
    // Segment membership is env-scoped (the bizUser belongs to an environment).
    // The membership mutation carries only internal ids, so the guard resolves the
    // env from the bizUser — an env-restricted member must not touch a blocked-env
    // user's segment membership.
    const segment = await buildSegment(prisma, {
      projectId,
      environmentId: allowedEnvId,
      dataType: 3, // MANUAL
    });
    const blockedUser = await buildBizUser(prisma, { environmentId: blockedEnvId });
    const res = await graphql(app, {
      token: adminToken,
      query: `mutation ($data: CreateBizUserOnSegment!) {
        createBizUserOnSegment(data: $data) { success }
      }`,
      variables: {
        data: { userOnSegment: [{ segmentId: segment.id, bizUserId: blockedUser.id, data: {} }] },
      },
    });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('E0055');
  });

  it("allows adding an IN-SCOPE environment's user to a segment", async () => {
    const segment = await buildSegment(prisma, {
      projectId,
      environmentId: allowedEnvId,
      dataType: 3, // MANUAL
    });
    const allowedUser = await buildBizUser(prisma, { environmentId: allowedEnvId });
    const res = await graphql(app, {
      token: adminToken,
      query: `mutation ($data: CreateBizUserOnSegment!) {
        createBizUserOnSegment(data: $data) { success }
      }`,
      variables: {
        data: { userOnSegment: [{ segmentId: segment.id, bizUserId: allowedUser.id, data: {} }] },
      },
    });
    expect(gqlData(res).createBizUserOnSegment?.success).toBe(true);
  });

  it('changeTeamMemberRole no longer accepts an environment restriction (write gate closed)', async () => {
    // The member environment allowlist has NO write path until the member-
    // permission (RBAC) design lands — the enforcement above stays dormant
    // machinery, seeded here via prisma only. The mutation must reject the
    // old field outright rather than silently ignore it.
    const CHANGE =
      'mutation ($data: ChangeTeamMemberRoleInput!) { changeTeamMemberRole(data: $data) }';
    const rejected = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: { projectId, userId: adminUserId, role: 'ADMIN', environmentIds: [blockedEnvId] },
      },
    });
    expect(rejected.body.errors?.length).toBeGreaterThan(0); // unknown input field

    // A plain role change still works and leaves the seeded restriction alone.
    const ok = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: { data: { projectId, userId: adminUserId, role: 'ADMIN' } },
    });
    expect(gqlData(ok).changeTeamMemberRole).toBe(true);
    const row = await prisma.userOnProject.findFirst({ where: { userId: adminUserId, projectId } });
    expect(row?.allowedEnvironmentIds).toEqual([allowedEnvId]);
  });

  it('OWNER is exempt even with a restriction row present', async () => {
    await prisma.userOnProject.updateMany({
      where: { userId: ownerUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId] },
    });
    const versionId = await seedPublishableVersion();
    const res = await graphql(app, {
      token: ownerToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: blockedEnvId } },
    });
    expect(gqlData(res).publishedContentVersion?.id).toBeTruthy();
  });

  it('deleting an environment strips it from member allowlists (empty stays [], fail-closed)', async () => {
    const doomed = await buildEnvironment(prisma, { projectId });
    // admin: restriction survives minus the dead id; solo: restriction empties out.
    await prisma.userOnProject.updateMany({
      where: { userId: adminUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId, doomed.id] },
    });
    const solo = await buildAuthorizedUser(prisma, app, { projectId, role: 'ADMIN' });
    await prisma.userOnProject.updateMany({
      where: { userId: solo.user.id, projectId },
      data: { allowedEnvironmentIds: [doomed.id] },
    });

    const res = await graphql(app, {
      token: ownerToken,
      query: 'mutation ($data: DeleteEnvironmentInput!) { deleteEnvironments(data: $data) { id } }',
      variables: { data: { id: doomed.id } },
    });
    expect(gqlData(res).deleteEnvironments?.id).toBe(doomed.id);

    const adminRow = await prisma.userOnProject.findFirst({
      where: { userId: adminUserId, projectId },
    });
    expect(adminRow?.allowedEnvironmentIds).toEqual([allowedEnvId]);
    // The emptied restriction must NOT widen to null (all environments).
    const soloRow = await prisma.userOnProject.findFirst({
      where: { userId: solo.user.id, projectId },
    });
    expect(soloRow?.allowedEnvironmentIds).toEqual([]);

    await prisma.userOnProject.deleteMany({ where: { userId: solo.user.id } });
    await prisma.user.deleteMany({ where: { id: solo.user.id } });
  });

  it('invite accept filters environments deleted since the invite was created', async () => {
    // assignUserToProject is the single funnel every accept path (register,
    // SSO x2, logged-in) pushes the invite's env restriction through.
    const team = app.get(TeamService);
    await buildSubscription(prisma, { projectId }); // BUSINESS: unlimited seats
    const doomed = await buildEnvironment(prisma, { projectId });
    await prisma.environment.update({ where: { id: doomed.id }, data: { deleted: true } });

    const invitee = await buildUser(prisma);
    const row = await prisma.$transaction((tx) =>
      team.assignUserToProject(tx, invitee.id, projectId, 'ADMIN', [doomed.id, allowedEnvId]),
    );
    expect(row.allowedEnvironmentIds).toEqual([allowedEnvId]);

    // All envs dead → the restriction stays [] (fail-closed), never null.
    const invitee2 = await buildUser(prisma);
    const row2 = await prisma.$transaction((tx) =>
      team.assignUserToProject(tx, invitee2.id, projectId, 'ADMIN', [doomed.id]),
    );
    expect(row2.allowedEnvironmentIds).toEqual([]);

    await prisma.userOnProject.deleteMany({ where: { userId: { in: [invitee.id, invitee2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [invitee.id, invitee2.id] } } });
  });
});
