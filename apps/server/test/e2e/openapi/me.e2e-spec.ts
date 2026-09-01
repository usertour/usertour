import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * `GET /v2/me` — the projectless discovery route integration platforms use
 * for credential tests and project/environment pickers. Asserts it reflects
 * the token's real scope: projects with a live membership only, environments
 * filtered by the token's allowlist.
 */
describe('OpenAPI v2 /me (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let envA: string;
  let envB: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function createToken(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const input: Record<string, unknown> = { name: 'me-e2e', scopes, projectIds: [projectId] };
    if (environmentIds) {
      input.environmentIds = environmentIds;
    }
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  const me = (token?: string) => {
    const req = request(app.getHttpServer()).get('/v2/me');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'me-e2e' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    envA = (await buildEnvironment(prisma, { projectId, name: 'me-env-a' })).id;
    envB = (await buildEnvironment(prisma, { projectId, name: 'me-env-b' })).id;
  }, 60000);

  afterAll(async () => {
    if (prisma && projectId) {
      await prisma.apiTokenOnProject.deleteMany({ where: { projectId } });
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('returns the token name and its projects with all environments', async () => {
    // A project-level scope needs no environment allowlist — null = all.
    const token = await createToken([Capability.ThemeRead]);
    const res = await me(token);
    expect(res.status).toBe(200);
    expect(res.body.object).toBe('me');
    expect(res.body.tokenName).toBe('me-e2e');

    const project = res.body.projects.find((row: { id: string }) => row.id === projectId);
    expect(project?.name).toBe('me-e2e');
    const environmentIds = project.environments.map((row: { id: string }) => row.id);
    expect(environmentIds).toEqual(expect.arrayContaining([envA, envB]));
  });

  it('filters environments to the token allowlist', async () => {
    const token = await createToken([Capability.WebhookManage], [envA]);
    const res = await me(token);
    expect(res.status).toBe(200);
    const project = res.body.projects.find((row: { id: string }) => row.id === projectId);
    expect(project.environments.map((row: { id: string }) => row.id)).toEqual([envA]);
  });

  it('rejects a missing header (401) and an unknown token (403)', async () => {
    expect((await me()).status).toBe(401);
    expect((await me('utp_definitely_not_a_token')).status).toBe(403);
  });
});
