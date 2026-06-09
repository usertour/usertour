import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/** Contract test for the v2 content-versions endpoints (list/get + questions expand). */
describe('API v2 /content-versions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let contentId: string;
  let versionId: string;

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

    projectId = (await buildProject(prisma, { name: 'api-v2-versions' })).id;
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    versionId = (await buildVersion(prisma, { contentId, sequence: 0 })).id;
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

  it('gets a content version by id (questions null without expand)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/${versionId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: versionId, object: 'contentVersion', number: 0 });
    expect(res.body.questions).toBeNull();
  });

  it('lists versions for a content', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=${contentId}`,
      token,
    );
    expect(res.status).toBe(200);
    expect(res.body.results.map((v: { id: string }) => v.id)).toContain(versionId);
  });

  it('returns questions as an array when expanded', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions/${versionId}?expand=questions`,
      token,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it('returns 404 for an unknown version (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content-versions/nope`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('returns 404 listing versions for an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=nope`,
      token,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.BizdataRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content-versions?contentId=${contentId}`,
      token,
    );
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
