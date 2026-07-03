import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildContent,
  buildEnvironment,
  buildProject,
  buildUsableFlowVersion,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Contract test for the v2 publish lifecycle (POST action transitions, like
 * duplicate / restore / session end). Content is project-level, so the target
 * environment is a body parameter (alongside versionId), not a path scope:
 *   POST /v2/projects/:p/content/:id/publish    { environmentId, versionId }
 *   POST /v2/projects/:p/content/:id/unpublish  { environmentId }
 * Publish state is per-environment (ContentOnEnvironment); both return the content
 * with a refreshed environments[].
 */
describe('API v2 content publish (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let adminUserId: string;
  let projectId: string;
  let environmentId: string;
  let otherEnvironmentId: string;
  let contentId: string;
  let versionId: string;
  let otherVersionId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const input: Record<string, unknown> = { name: 'k', scopes, projectIds: [projectId] };
    if (environmentIds) {
      input.environmentIds = environmentIds;
    }
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get' | 'post', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  const base = () => `/v2/projects/${projectId}/content/${contentId}`;
  const publishPath = () => `${base()}/publish`;
  const unpublishPath = () => `${base()}/unpublish`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-publish' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    // A second environment in the same project, to prove environment-scoped tokens.
    otherEnvironmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    // A usable flow (theme + a step) so publish passes the strict validator.
    versionId = (await buildUsableFlowVersion(prisma, { contentId, projectId, sequence: 0 })).id;

    // A version under a different content, to prove cross-content publish is rejected.
    const other = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    otherVersionId = (await buildVersion(prisma, { contentId: other.id, sequence: 0 })).id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: { in: [ownerUserId, adminUserId] } } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: { in: [ownerUserId, adminUserId] } } });
    }
    await app?.close();
  });

  it('publishes a version to an environment (POST publish → 200, environments[] updated)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('post', publishPath(), token).send({ environmentId, versionId });
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, published: true, publishedVersionId: versionId }),
    );

    // INDEPENDENT read reflects the same live state.
    const read = await api('get', `/v2/projects/${projectId}/content/${contentId}`, token);
    expect(read.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, published: true, publishedVersionId: versionId }),
    );
  });

  it('is idempotent (re-publishing the same version → 200)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('post', publishPath(), token).send({ environmentId, versionId });
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, publishedVersionId: versionId }),
    );
  });

  it('unpublishes from an environment (POST unpublish → 200, environments[] cleared)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    // ensure published first
    await api('post', publishPath(), token).send({ environmentId, versionId });

    const res = await api('post', unpublishPath(), token).send({ environmentId });
    expect(res.status).toBe(200);
    expect(res.body.environments).toEqual([]);

    const read = await api('get', `/v2/projects/${projectId}/content/${contentId}`, token);
    expect(read.body.environments).toEqual([]);
  });

  it('records publish history rows with the acting token (either-or actor)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    await api('post', publishPath(), token).send({ environmentId, versionId });
    await api('post', unpublishPath(), token).send({ environmentId });

    const records = await prisma.contentPublishRecord.findMany({
      where: { contentId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    expect(records.map((r) => r.action)).toEqual(['unpublish', 'publish']);
    for (const record of records) {
      expect(record.versionId).toBe(versionId);
      expect(record.environmentId).toBe(environmentId);
      // API write → the token IS the actor; the user column stays empty (either-or).
      expect(record.actorTokenId).toBeTruthy();
      expect(record.actorUserId).toBeNull();
      expect(record.versionSequence).toBeGreaterThanOrEqual(0);
    }
  });

  it('rejects publish to an environment outside the token’s env scope (403 E1029)', async () => {
    // Token may publish only to `environmentId`; publishing to the other env is refused
    // BEFORE the service runs — the core "agent can't push to Production" guardrail.
    const token = await mint([Capability.ContentRead, Capability.ContentPublish], [environmentId]);
    const res = await api('post', publishPath(), token).send({
      environmentId: otherEnvironmentId,
      versionId,
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1029');
  });

  it('allows publish to an environment within the token’s env scope (200)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish], [environmentId]);
    const res = await api('post', publishPath(), token).send({ environmentId, versionId });
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, published: true }),
    );
  });

  it('member env ceiling caps the token: a restricted ADMIN cannot escape via an unrestricted key', async () => {
    // ADMIN member limited to `environmentId`; they mint a key WITHOUT env
    // restriction — the membership ceiling must still cap it (E1029), else a
    // restricted member escapes their environment scope by minting a key.
    const admin = await buildAuthorizedUser(prisma, app, { projectId, role: 'ADMIN' });
    adminUserId = admin.user.id;
    await prisma.userOnProject.updateMany({
      where: { userId: adminUserId, projectId },
      data: { allowedEnvironmentIds: [environmentId] },
    });
    const res = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'admin-unrestricted',
          scopes: [Capability.ContentRead, Capability.ContentPublish],
          projectIds: [projectId],
        },
      },
      token: admin.token,
    });
    const token = gqlData(res).createApiToken.token;

    const denied = await api('post', publishPath(), token).send({
      environmentId: otherEnvironmentId,
      versionId,
    });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('E1029');

    const allowed = await api('post', publishPath(), token).send({ environmentId, versionId });
    expect(allowed.status).toBe(200);
  });

  it('rejects publish without the publish scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api('post', publishPath(), token).send({ environmentId, versionId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects unpublish without the publish scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api('post', unpublishPath(), token).send({ environmentId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('returns 404 publishing an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api(
      'post',
      `/v2/projects/${projectId}/content/does-not-exist/publish`,
      token,
    ).send({ environmentId, versionId });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('returns 404 publishing a version from another content (E1004)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('post', publishPath(), token).send({
      environmentId,
      versionId: otherVersionId,
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('maps a missing body to E1017 (zod validation — environmentId + versionId required)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('post', publishPath(), token).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('rejects an environmentId not in the project (400 E1017)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('post', publishPath(), token).send({
      environmentId: 'not-in-project',
      versionId,
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('rejects publishing an unusable (empty, themeless) flow (422 E1027)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const empty = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    const emptyVersion = await buildVersion(prisma, { contentId: empty.id, sequence: 0 });
    const res = await api(
      'post',
      `/v2/projects/${projectId}/content/${empty.id}/publish`,
      token,
    ).send({ environmentId, versionId: emptyVersion.id });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('E1027');
  });
});
