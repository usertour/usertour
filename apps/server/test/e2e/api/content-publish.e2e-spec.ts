import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
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
  let projectId: string;
  let environmentId: string;
  let contentId: string;
  let versionId: string;
  let otherVersionId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds: [projectId] } },
      token: ownerToken,
    });
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
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    versionId = (await buildVersion(prisma, { contentId, sequence: 0 })).id;

    // A version under a different content, to prove cross-content publish is rejected.
    const other = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    otherVersionId = (await buildVersion(prisma, { contentId: other.id, sequence: 0 })).id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
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
});
