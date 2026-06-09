import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Shape contract for the rebuilt v2 content endpoint. Content is the one resource
 * whose v2 JSON intentionally differs from v1: per-environment publish state is
 * exposed as `environments[]` instead of the deprecated single publishedVersionId.
 */
describe('API v2 /content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let flowId: string;
  let flowVersionId: string;
  let publishedId: string;
  let publishedVersionId: string;

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

  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-content' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const flow = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'Onboarding',
      type: 'flow',
    });
    flowId = flow.id;
    flowVersionId = (await buildVersion(prisma, { contentId: flowId })).id;

    const published = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'Live',
      type: 'flow',
    });
    publishedId = published.id;
    publishedVersionId = (await buildVersion(prisma, { contentId: publishedId })).id;
    await prisma.contentOnEnvironment.create({
      data: { environmentId, contentId: publishedId, published: true, publishedVersionId },
    });
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

  it('lists content (200) with the v2 shape (environments[], no legacy fields)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content`, token);
    expect(res.status).toBe(200);
    const item = res.body.results.find((c: { id: string }) => c.id === flowId);
    expect(item).toMatchObject({ id: flowId, object: 'content', type: 'flow' });
    expect(Array.isArray(item.environments)).toBe(true);
    expect(item).not.toHaveProperty('publishedVersionId');
    expect(item).not.toHaveProperty('publishedVersion');
  });

  it('exposes per-environment publish state via environments[]', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${publishedId}`, token);
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, published: true, publishedVersionId }),
    );
  });

  it('returns an empty environments[] for unpublished content', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${flowId}`, token);
    expect(res.status).toBe(200);
    expect(res.body.environments).toEqual([]);
  });

  it('expands editedVersion and environments[i].publishedVersion', async () => {
    const token = await mint([Capability.ContentRead]);
    const edited = await api(
      'get',
      `/v2/projects/${projectId}/content/${flowId}?expand=editedVersion`,
      token,
    );
    expect(edited.body.editedVersion).toMatchObject({
      id: flowVersionId,
      object: 'contentVersion',
    });

    const pub = await api(
      'get',
      `/v2/projects/${projectId}/content/${publishedId}?expand=publishedVersion`,
      token,
    );
    const env = pub.body.environments.find(
      (e: { environmentId: string }) => e.environmentId === environmentId,
    );
    expect(env.publishedVersion).toMatchObject({
      id: publishedVersionId,
      object: 'contentVersion',
    });
  });

  it('filters by type server-side', async () => {
    const token = await mint([Capability.ContentRead]);
    const flows = await api('get', `/v2/projects/${projectId}/content?type=flow`, token);
    expect(flows.body.results.map((c: { id: string }) => c.id)).toContain(flowId);
    const checklists = await api('get', `/v2/projects/${projectId}/content?type=checklist`, token);
    expect(checklists.body.results.map((c: { id: string }) => c.id)).not.toContain(flowId);
  });

  it('returns 404 for an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/does-not-exist`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.BizdataRead]);
    const res = await api('get', `/v2/projects/${projectId}/content`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api('get', `/v2/projects/${projectId}/content`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('maps a bad expand enum to E1017 (zod validation)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content?expand=nope`, token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });
});
