import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildProject, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';

// The URL-refusal assertions depend on the DEFAULT egress policy; pin the
// switch before AppModule loads (config.ts reads it at import time) so a local
// `.env` with ALLOW_PRIVATE_NETWORK_EGRESS=true cannot flip them.
const prevPrivateEgress = process.env.ALLOW_PRIVATE_NETWORK_EGRESS;
process.env.ALLOW_PRIVATE_NETWORK_EGRESS = 'false';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createTestApp } = require('../create-test-app') as typeof import('../create-test-app');

/**
 * REST error-contract slice for /v2 webhooks — the corners the capability
 * matrix (authz) and the GraphQL functional spec don't reach: the documented
 * HTTP statuses. E0054 (refused URL) must be 400 and E0061 (unknown or
 * cross-environment id) must be 404 — both previously leaked as 500/400.
 */
describe('API v2 /webhooks error contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let otherEnvironmentId: string;
  let token: string;
  let ownerUserId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-webhooks' })).id;
    await buildSubscription(prisma, { projectId, planType: 'starter' });
    environmentId = (await buildEnvironment(prisma, { projectId, name: 'Production' })).id;
    otherEnvironmentId = (await buildEnvironment(prisma, { projectId, name: 'Staging' })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerUserId = owner.user.id;

    const res = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'wh',
          scopes: [Capability.WebhookRead, Capability.WebhookManage],
          projectIds: [projectId],
          environmentIds: [environmentId, otherEnvironmentId],
        },
      },
      token: owner.token,
    });
    token = gqlData(res).createApiToken.token;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
    process.env.ALLOW_PRIVATE_NETWORK_EGRESS = prevPrivateEgress ?? '';
  });

  const base = (envId: string) => `/v2/projects/${projectId}/environments/${envId}/webhooks`;
  const authed = (method: 'get' | 'post' | 'patch', path: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  it('refuses a private / non-HTTPS URL with 400 E0054', async () => {
    for (const url of ['https://127.0.0.1/hook', 'http://e2e-receiver.invalid/hook']) {
      const res = await authed('post', base(environmentId)).send({
        url,
        topics: ['event.tracked'],
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E0054');
    }
  });

  it('returns 404 E0061 for an unknown webhook id', async () => {
    const res = await authed('get', `${base(environmentId)}/cmsy00000000000000000000`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E0061');
  });

  it('omits the secret for a read-only token (secret = forgery capability)', async () => {
    const created = await authed('post', base(environmentId)).send({
      url: 'https://e2e-readonly-secret.invalid/hook',
      topics: ['event.tracked'],
    });
    expect(created.status).toBe(201);

    const readonlyRes = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'wh-readonly',
          scopes: [Capability.WebhookRead],
          projectIds: [projectId],
          environmentIds: [environmentId],
        },
      },
      token: (await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' })).token,
    });
    const readonlyToken = gqlData(readonlyRes).createApiToken.token;

    const res = await request(app.getHttpServer())
      .get(`${base(environmentId)}/${created.body.id}`)
      .set('Authorization', `Bearer ${readonlyToken}`);
    expect(res.status).toBe(200);
    expect(res.body.url).toBeDefined();
    expect(res.body).not.toHaveProperty('secret');
  });

  it('exposes the secret on get/create but NOT on update (exposure hygiene)', async () => {
    const created = await authed('post', base(environmentId)).send({
      url: 'https://e2e-secret-check.invalid/hook',
      topics: ['event.tracked'],
    });
    expect(created.status).toBe(201);
    expect(created.body.secret).toMatch(/^whsec_/); // one-time handoff

    const read = await authed('get', `${base(environmentId)}/${created.body.id}`);
    expect(read.body.secret).toMatch(/^whsec_/); // single-object read: for wiring

    // A PATCH response needs no secret — carrying it would land the key in
    // HTTP logs and MCP agent context (update_webhook returns this object).
    const updated = await authed('patch', `${base(environmentId)}/${created.body.id}`).send({
      description: 'renamed',
    });
    expect(updated.status).toBe(200);
    expect(updated.body.description).toBe('renamed');
    expect(updated.body).not.toHaveProperty('secret');
  });

  it("returns the same 404 for another environment's webhook (no existence leak)", async () => {
    const created = await authed('post', base(otherEnvironmentId)).send({
      url: 'https://e2e-receiver.invalid/hook',
      topics: ['event.tracked'],
    });
    expect(created.status).toBe(201);

    const res = await authed('get', `${base(environmentId)}/${created.body.id}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E0061');
  });
});
