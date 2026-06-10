import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Contract test for the v2 publish lifecycle:
 *   PUT    /v2/projects/:p/content/:id/environments/:envId   → publish a version
 *   DELETE /v2/projects/:p/content/:id/environments/:envId   → unpublish
 * Publish state is per-environment (ContentOnEnvironment); both verbs return the
 * content with a refreshed environments[].
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

  function api(method: 'get' | 'put' | 'delete', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  const envPath = () =>
    `/v2/projects/${projectId}/content/${contentId}/environments/${environmentId}`;

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

  it('publishes a version to an environment (PUT → 200, environments[] updated)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('put', envPath(), token).send({ versionId });
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
    const res = await api('put', envPath(), token).send({ versionId });
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, publishedVersionId: versionId }),
    );
  });

  it('unpublishes from an environment (DELETE → 200, environments[] cleared)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    // ensure published first
    await api('put', envPath(), token).send({ versionId });

    const res = await api('delete', envPath(), token);
    expect(res.status).toBe(200);
    expect(res.body.environments).toEqual([]);

    const read = await api('get', `/v2/projects/${projectId}/content/${contentId}`, token);
    expect(read.body.environments).toEqual([]);
  });

  it('rejects publish without the publish scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api('put', envPath(), token).send({ versionId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects unpublish without the publish scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api('delete', envPath(), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('returns 404 publishing an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api(
      'put',
      `/v2/projects/${projectId}/content/does-not-exist/environments/${environmentId}`,
      token,
    ).send({ versionId });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('returns 404 publishing a version from another content (E1004)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('put', envPath(), token).send({ versionId: otherVersionId });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('maps a missing versionId body to E1017 (zod validation)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentPublish]);
    const res = await api('put', envPath(), token).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });
});
