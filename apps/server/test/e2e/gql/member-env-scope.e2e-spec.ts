import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
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

  it('changeTeamMemberRole sets and clears the environment restriction', async () => {
    const CHANGE =
      'mutation ($data: ChangeTeamMemberRoleInput!) { changeTeamMemberRole(data: $data) }';
    // set
    let res = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: { projectId, userId: adminUserId, role: 'ADMIN', environmentIds: [blockedEnvId] },
      },
    });
    expect(gqlData(res).changeTeamMemberRole).toBe(true);
    let row = await prisma.userOnProject.findFirst({ where: { userId: adminUserId, projectId } });
    expect(row?.allowedEnvironmentIds).toEqual([blockedEnvId]);
    // clear (null = all environments)
    res = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: { data: { projectId, userId: adminUserId, role: 'ADMIN', environmentIds: null } },
    });
    expect(gqlData(res).changeTeamMemberRole).toBe(true);
    row = await prisma.userOnProject.findFirst({ where: { userId: adminUserId, projectId } });
    expect(row?.allowedEnvironmentIds).toBeNull();
    // restore the fixture restriction for any later assertions
    await prisma.userOnProject.updateMany({
      where: { userId: adminUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId] },
    });
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
});
