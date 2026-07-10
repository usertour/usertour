import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildContent, buildEnvironment, buildProject, buildVersion } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';

const CREATE = `mutation($input: CreateApiTokenInput!){
  createApiToken(input: $input){ token }
}`;

/**
 * v2 content analytics — contract-level e2e. Deep metric correctness lives in
 * the mapper unit spec (synthetic domain payloads); here we prove the typed
 * envelope, the range defaults, and the auth/env-scope chain over real HTTP.
 */
describe('API v2 content analytics (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let otherEnvironmentId: string;
  let foreignEnvironmentId: string;
  let contentId: string;
  let ownerToken: string;
  let ownerUserId: string;
  let foreignProjectId: string;

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const input: Record<string, unknown> = { name: 'k', scopes, projectIds: [projectId] };
    // Env-targeted scopes must NAME environments (server rule) — default to the suite env(s).
    input.environmentIds = environmentIds ?? [environmentId, otherEnvironmentId];
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  function api(path: string, token?: string) {
    const req = request(app.getHttpServer()).get(path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  const base = () => `/v2/projects/${projectId}/content/${contentId}/analytics`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-analytics' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    otherEnvironmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    await buildVersion(prisma, { contentId, sequence: 0 });

    foreignProjectId = (await buildProject(prisma, { name: 'api-v2-analytics-foreign' })).id;
    foreignEnvironmentId = (await buildEnvironment(prisma, { projectId: foreignProjectId })).id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await teardownProject(prisma, foreignProjectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('returns the typed envelope with range defaults (flow, no sessions yet)', async () => {
    const token = await mint([Capability.AnalyticsRead]);
    const res = await api(`${base()}?environmentId=${environmentId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      object: 'contentAnalytics',
      contentId,
      contentType: 'flow',
      environmentId,
      timezone: 'UTC',
      uniqueStarts: 0,
      totalStarts: 0,
      uniqueCompletions: 0,
      totalCompletions: 0,
    });
    // The union carries only the flow variant's fields — no foreign keys, no
    // internal views/completions vocabulary.
    expect(res.body).not.toHaveProperty('uniqueViews');
    expect(res.body).not.toHaveProperty('tasks');
    expect(res.body).not.toHaveProperty('blocks');
    // Defaults: trailing 30 days as ISO dates.
    expect(res.body.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(res.body.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Array.isArray(res.body.byDay)).toBe(true);
    // Flow breakdown: always an array, even on the empty path (domain returns false there).
    expect(Array.isArray(res.body.steps)).toBe(true);
  });

  it('question analytics returns an empty result set for a flow without questions', async () => {
    const token = await mint([Capability.AnalyticsRead]);
    const res = await api(`${base()}/questions?environmentId=${environmentId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ results: [] });
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api(`${base()}?environmentId=${environmentId}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('rejects a token without analytics:read (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(`${base()}?environmentId=${environmentId}`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects an environment outside the token env scope (403 E1029)', async () => {
    const token = await mint([Capability.AnalyticsRead], [otherEnvironmentId]);
    const res = await api(`${base()}?environmentId=${environmentId}`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1029');
  });

  it('404s an unknown content (E1004) and a foreign-project environment (E1026)', async () => {
    const token = await mint([Capability.AnalyticsRead]);
    const missing = await api(
      `/v2/projects/${projectId}/content/does-not-exist/analytics?environmentId=${environmentId}`,
      token,
    );
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('E1004');

    // Env-targeted tokens always carry an allowlist now, so a foreign-project
    // environment trips the scope check first — 403 E1029, which also avoids
    // leaking whether the foreign environment exists.
    const foreignEnv = await api(`${base()}?environmentId=${foreignEnvironmentId}`, token);
    expect(foreignEnv.status).toBe(403);
    expect(foreignEnv.body.error.code).toBe('E1029');
  });
});
