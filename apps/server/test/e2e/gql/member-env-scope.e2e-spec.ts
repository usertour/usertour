import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { EmailService } from '@/modules/common/services/email.service';
import { TeamService } from '@/modules/team/services/team.service';

import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildBizUser,
  buildContent,
  buildEnvironment,
  buildProject,
  buildSegment,
  buildSession,
  buildSubscription,
  buildUser,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * EDITOR publish whitelist (UserOnProject.allowedEnvironmentIds) on the web
 * GraphQL surface: an editor may publish only to whitelisted environments
 * (E0060 otherwise) while reads and every other write stay unrestricted by
 * membership; ADMIN and OWNER publish anywhere by capability. Also pins the
 * whitelist's write paths (invite / change role) and its maintenance
 * (environment deletion, invite acceptance).
 */
describe('editor publish whitelist (gql e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let allowedEnvId: string;
  let blockedEnvId: string;
  let editorToken: string;
  let ownerToken: string;
  let editorUserId: string;
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
    // Invite delivery is stubbed: the subject is the whitelist persisted on the
    // invite row, not SMTP (which the sandbox has no route to).
    app = await createTestApp((builder) =>
      builder.overrideProvider(EmailService).useValue({ send: async () => undefined }),
    );
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'member-env-scope' })).id;
    allowedEnvId = (await buildEnvironment(prisma, { projectId })).id;
    blockedEnvId = (await buildEnvironment(prisma, { projectId })).id;

    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const editor = await buildAuthorizedUser(prisma, app, { projectId, role: 'EDITOR' });
    editorToken = editor.token;
    editorUserId = editor.user.id;
    await prisma.userOnProject.updateMany({
      where: { userId: editorUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId] },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, editorUserId] } } });
    }
    await app?.close();
  });

  it('refuses publish to an environment outside the editor whitelist (E0060)', async () => {
    const versionId = await seedPublishableVersion();
    const res = await graphql(app, {
      token: editorToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: blockedEnvId } },
    });
    expect(res.body.errors?.[0]?.extensions?.code).toBe('E0060');
  });

  it('allows publish within the editor whitelist', async () => {
    const versionId = await seedPublishableVersion();
    const res = await graphql(app, {
      token: editorToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: allowedEnvId } },
    });
    expect(gqlData(res).publishedContentVersion?.id).toBeTruthy();
  });

  it('does NOT restrict environment-scoped reads: the whitelist bounds publishing only', async () => {
    const USERS = `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
      queryBizUser(query: $query, orderBy: $orderBy, first: $first) { totalCount }
    }`;
    for (const environmentId of [blockedEnvId, allowedEnvId]) {
      const res = await graphql(app, {
        token: editorToken,
        query: USERS,
        variables: {
          query: { environmentId },
          orderBy: { field: 'createdAt', direction: 'desc' },
          first: 10,
        },
      });
      expect(res.body.errors).toBeUndefined();
      expect(gqlData(res).queryBizUser.totalCount).toBe(0);
    }
  });

  it('does NOT restrict segment membership writes in a non-whitelisted environment', async () => {
    // Segment membership is env-scoped (the bizUser belongs to an environment),
    // but the editor whitelist is about PUBLISHING — other writes go through
    // in every environment of the project.
    const segment = await buildSegment(prisma, {
      projectId,
      environmentId: blockedEnvId,
      dataType: 3, // MANUAL
    });
    const blockedUser = await buildBizUser(prisma, { environmentId: blockedEnvId });
    const res = await graphql(app, {
      token: editorToken,
      query: `mutation ($data: CreateBizUserOnSegment!) {
        createBizUserOnSegment(data: $data) { success }
      }`,
      variables: {
        data: { userOnSegment: [{ segmentId: segment.id, bizUserId: blockedUser.id, data: {} }] },
      },
    });
    expect(gqlData(res).createBizUserOnSegment?.success).toBe(true);
  });

  it('changeTeamMemberRole writes the whitelist for EDITOR and clears it for other roles', async () => {
    const CHANGE =
      'mutation ($data: ChangeTeamMemberRoleInput!) { changeTeamMemberRole(data: $data) }';
    const rowOf = () =>
      prisma.userOnProject.findFirst({ where: { userId: editorUserId, projectId } });

    // Widen the editor to both environments.
    const widened = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: {
          projectId,
          userId: editorUserId,
          role: 'EDITOR',
          allowedEnvironmentIds: [allowedEnvId, blockedEnvId],
        },
      },
    });
    expect(gqlData(widened).changeTeamMemberRole).toBe(true);
    expect((await rowOf())?.allowedEnvironmentIds).toEqual([allowedEnvId, blockedEnvId]);

    // An environment that is not the project's is refused outright.
    const foreignProject = await buildProject(prisma, { name: 'other' });
    const foreign = await buildEnvironment(prisma, { projectId: foreignProject.id });
    const rejected = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: {
          projectId,
          userId: editorUserId,
          role: 'EDITOR',
          allowedEnvironmentIds: [foreign.id],
        },
      },
    });
    expect(rejected.body.errors?.length).toBeGreaterThan(0);
    expect((await rowOf())?.allowedEnvironmentIds).toEqual([allowedEnvId, blockedEnvId]);
    await teardownProject(prisma, foreignProject.id);

    // EDITOR without a list = may publish nowhere (explicit empty, never null).
    const emptied = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: { data: { projectId, userId: editorUserId, role: 'EDITOR' } },
    });
    expect(gqlData(emptied).changeTeamMemberRole).toBe(true);
    expect((await rowOf())?.allowedEnvironmentIds).toEqual([]);

    // Promoting out of EDITOR drops the list — ADMIN publishes anywhere by capability.
    const promoted = await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: {
          projectId,
          userId: editorUserId,
          role: 'ADMIN',
          allowedEnvironmentIds: [allowedEnvId],
        },
      },
    });
    expect(gqlData(promoted).changeTeamMemberRole).toBe(true);
    expect((await rowOf())?.allowedEnvironmentIds).toBeNull();
    const versionId = await seedPublishableVersion();
    const asAdmin = await graphql(app, {
      token: editorToken,
      query: PUBLISH,
      variables: { data: { versionId, environmentId: blockedEnvId } },
    });
    expect(gqlData(asAdmin).publishedContentVersion?.id).toBeTruthy();

    // Back to the fixture state for the tests below.
    await graphql(app, {
      token: ownerToken,
      query: CHANGE,
      variables: {
        data: {
          projectId,
          userId: editorUserId,
          role: 'EDITOR',
          allowedEnvironmentIds: [allowedEnvId],
        },
      },
    });
    expect((await rowOf())?.allowedEnvironmentIds).toEqual([allowedEnvId]);
  });

  it('inviteTeamMember stores the whitelist on the invite for EDITOR only', async () => {
    await buildSubscription(prisma, { projectId }); // BUSINESS: unlimited seats
    const INVITE = 'mutation ($data: InviteTeamMemberInput!) { inviteTeamMember(data: $data) }';
    const invite = async (email: string, role: string, allowedEnvironmentIds?: string[]) =>
      graphql(app, {
        token: ownerToken,
        query: INVITE,
        variables: { data: { projectId, email, name: 'x', role, allowedEnvironmentIds } },
      });

    const editorRes = await invite('whitelist-editor@example.com', 'EDITOR', [allowedEnvId]);
    expect(gqlData(editorRes).inviteTeamMember).toBe(true);
    const editorInvite = await prisma.invite.findFirst({
      where: { projectId, email: 'whitelist-editor@example.com' },
    });
    expect(editorInvite?.allowedEnvironmentIds).toEqual([allowedEnvId]);

    const viewerRes = await invite('whitelist-viewer@example.com', 'VIEWER', [allowedEnvId]);
    expect(gqlData(viewerRes).inviteTeamMember).toBe(true);
    const viewerInvite = await prisma.invite.findFirst({
      where: { projectId, email: 'whitelist-viewer@example.com' },
    });
    expect(viewerInvite?.allowedEnvironmentIds).toBeNull();

    const ownerRes = await invite('whitelist-owner@example.com', 'OWNER');
    expect(ownerRes.body.errors?.length).toBeGreaterThan(0);
  });

  it('OWNER publishes anywhere even with a whitelist row present', async () => {
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

  it('does NOT restrict session mutations by environment', async () => {
    const seedSession = async (environmentId: string, state = 0) => {
      const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
      const version = await buildVersion(prisma, { contentId: content.id, sequence: 0 });
      const bizUser = await buildBizUser(prisma, { environmentId });
      return buildSession(prisma, {
        contentId: content.id,
        versionId: version.id,
        bizUserId: bizUser.id,
        environmentId,
        projectId,
        state,
      });
    };
    const END = 'mutation ($sessionId: String!) { endSession(sessionId: $sessionId) }';

    // The guard lets the call THROUGH (no E0060) in the non-whitelisted
    // environment too. The session is seeded already-ended (state 1) so the
    // domain declines with a plain `false` — the subject here is the guard.
    const blockedSession = await seedSession(blockedEnvId, 1);
    const res = await graphql(app, {
      token: editorToken,
      query: END,
      variables: { sessionId: blockedSession.id },
    });
    expect(res.body.errors).toBeUndefined();
    expect(gqlData(res).endSession).toBe(false);
  });

  it('deleting an environment strips it from editor whitelists (empty stays [])', async () => {
    const doomed = await buildEnvironment(prisma, { projectId });
    // editor: whitelist survives minus the dead id; solo: whitelist empties out.
    await prisma.userOnProject.updateMany({
      where: { userId: editorUserId, projectId },
      data: { allowedEnvironmentIds: [allowedEnvId, doomed.id] },
    });
    const solo = await buildAuthorizedUser(prisma, app, { projectId, role: 'EDITOR' });
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

    const editorRow = await prisma.userOnProject.findFirst({
      where: { userId: editorUserId, projectId },
    });
    expect(editorRow?.allowedEnvironmentIds).toEqual([allowedEnvId]);
    // The emptied whitelist stays an explicit [] rather than null.
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
      team.assignUserToProject(tx, invitee.id, projectId, 'EDITOR', [doomed.id, allowedEnvId]),
    );
    expect(row.allowedEnvironmentIds).toEqual([allowedEnvId]);

    // All envs dead → the whitelist stays [] (may publish nowhere), never null.
    const invitee2 = await buildUser(prisma);
    const row2 = await prisma.$transaction((tx) =>
      team.assignUserToProject(tx, invitee2.id, projectId, 'EDITOR', [doomed.id]),
    );
    expect(row2.allowedEnvironmentIds).toEqual([]);

    await prisma.userOnProject.deleteMany({ where: { userId: { in: [invitee.id, invitee2.id] } } });
    await prisma.user.deleteMany({ where: { id: { in: [invitee.id, invitee2.id] } } });
  });
});
