import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildBizCompany, buildBizUser, buildBizUserOnCompany } from '../factories';
import { buildAuthorizedUser } from '../gql/_support';
import { createTestApp } from '../create-test-app';
import { OpenApiFixture, openapi, seedApiFixture, teardownApiFixture } from '../openapi';

/**
 * Parity contract for the rebuilt v2 companies (environment-scoped): BYTE-IDENTICAL
 * JSON to the frozen v1 endpoint, including the users expand.
 */
describe('API v2 /companies parity with v1 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fx: OpenApiFixture;
  let ownerToken: string;
  let ownerUserId: string;
  let v2Token: string;
  const externalId = 'co-parity-acme';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function v2path(suffix = ''): string {
    return `/v2/projects/${fx.projectId}/environments/${fx.environmentId}/companies${suffix}`;
  }
  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fx = await seedApiFixture(prisma, { projectName: 'api-v2-companies-parity' });
    const owner = await buildAuthorizedUser(prisma, app, {
      projectId: fx.projectId,
      role: 'OWNER',
    });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: { name: 'k', scopes: [Capability.CompanyRead], projectIds: [fx.projectId] },
      },
      token: ownerToken,
    });
    v2Token = gqlData(minted).createApiToken.token;

    const company = await buildBizCompany(prisma, {
      environmentId: fx.environmentId,
      externalId,
      data: { plan: 'pro' },
    });
    const bizUser = await buildBizUser(prisma, {
      environmentId: fx.environmentId,
      externalId: 'bu-parity-jane',
      data: { name: 'Jane' },
    });
    await buildBizUserOnCompany(prisma, {
      bizUserId: bizUser.id,
      bizCompanyId: company.id,
      data: { role: 'admin' },
    });
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: fx.projectId } });
      await teardownApiFixture(prisma, fx);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('returns byte-identical company JSON on v1 and v2 (base)', async () => {
    const v1 = await openapi(app, { method: 'get', path: '/v1/companies', token: fx.apiKey });
    const v2 = await api('get', v2path(), v2Token);
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
    const v1item = v1.body.results.find((c: { id: string }) => c.id === externalId);
    const v2item = v2.body.results.find((c: { id: string }) => c.id === externalId);
    expect(v1item).toBeDefined();
    expect(v2item).toEqual(v1item);
  });

  it('returns byte-identical company JSON on v1 and v2 (expand=users)', async () => {
    const v1 = await openapi(app, {
      method: 'get',
      path: '/v1/companies',
      token: fx.apiKey,
      query: { expand: 'users' },
    });
    const v2 = await api('get', v2path('?expand=users'), v2Token);
    const v1item = v1.body.results.find((c: { id: string }) => c.id === externalId);
    const v2item = v2.body.results.find((c: { id: string }) => c.id === externalId);
    expect(v1item.users).toEqual([
      expect.objectContaining({ id: 'bu-parity-jane', object: 'user' }),
    ]);
    expect(v2item).toEqual(v1item);
  });

  it('returns 404 for an unknown company (E1002)', async () => {
    const res = await api('get', v2path('/nope'), v2Token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1002');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: { name: 'k2', scopes: [Capability.ContentRead], projectIds: [fx.projectId] },
      },
      token: ownerToken,
    });
    const token = gqlData(minted).createApiToken.token;
    const res = await api('get', v2path(), token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
