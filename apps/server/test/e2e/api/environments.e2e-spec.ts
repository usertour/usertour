import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/** Contract test for the v2 environments read endpoints (list + get). */
describe('API v2 /environments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let primaryEnvId: string;
  let otherEnvId: string;

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

  const base = () => `/v2/projects/${projectId}/environments`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-environments' })).id;
    primaryEnvId = (
      await buildEnvironment(prisma, { projectId, isPrimary: true, name: 'Production' })
    ).id;
    otherEnvId = (await buildEnvironment(prisma, { projectId, name: 'Staging' })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
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

  it('lists environments with the v2 shape', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(200);
    const ids = res.body.results.map((e: { id: string }) => e.id);
    expect(ids).toEqual(expect.arrayContaining([primaryEnvId, otherEnvId]));
    expect(res.body.results).toContainEqual(
      expect.objectContaining({ id: primaryEnvId, object: 'environment', isPrimary: true }),
    );
  });

  it('paginates with limit (next cursor set when more remain)', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}?limit=1`, token);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.next).toEqual(expect.stringContaining('cursor='));
  });

  it('gets an environment by id', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}/${primaryEnvId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: primaryEnvId, object: 'environment', name: 'Production' });
  });

  it('returns 404 for an unknown environment (E1026)', async () => {
    const token = await mint([Capability.EnvironmentRead]);
    const res = await api('get', `${base()}/nope`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1026');
  });

  it('rejects listing without environment:read (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', base(), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
