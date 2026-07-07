import { INestApplication } from '@nestjs/common';
import { AttributeBizType } from '@/attributes/models/attribute.model';
import { BizAttributeTypes, Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildAttribute,
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildProject,
  buildSegment,
} from '../factories';
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

  it('404s on a segmentId from another project (no cross-tenant segment oracle)', async () => {
    const own = await buildSegment(prisma, {
      projectId: fx.projectId,
      environmentId: fx.environmentId,
    });
    const other = await buildProject(prisma, { name: 'api-v2-companies-foreign' });
    const foreign = await buildSegment(prisma, { projectId: other.id });
    // own segment filters fine (dataType ALL → no rows excluded) ...
    expect((await api('get', v2path(`?segmentId=${own.id}`), v2Token)).status).toBe(200);
    // ... but another project's segment id is a hard 404, not a silent all-rows
    // result that would leak its existence / apply a foreign segment's rules.
    const res = await api('get', v2path(`?segmentId=${foreign.id}`), v2Token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1025');
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

  async function mint(scopes: Capability[]): Promise<string> {
    const minted = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'kw', scopes, projectIds: [fx.projectId] } },
      token: ownerToken,
    });
    return gqlData(minted).createApiToken.token;
  }
  const auth = (method: 'put' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](v2path(path)).set('Authorization', `Bearer ${token}`);

  it('PUT upserts a company (create → merge), then DELETE removes it (204)', async () => {
    const token = await mint([
      Capability.CompanyWrite,
      Capability.CompanyRead,
      Capability.CompanyDelete,
    ]);
    const created = await auth('put', '/co-write-x', token).send({ attributes: { plan: 'free' } });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ id: 'co-write-x', object: 'company' });
    expect(created.body.attributes).toMatchObject({ plan: 'free' });

    const updated = await auth('put', '/co-write-x', token).send({ attributes: { seats: 5 } });
    expect(updated.body.attributes).toMatchObject({ plan: 'free', seats: 5 }); // merged

    expect((await auth('delete', '/co-write-x', token).send()).status).toBe(204);
    expect((await api('get', v2path('/co-write-x'), token)).status).toBe(404);
  });

  it('PUT then DELETE a company membership (204; 404 once removed)', async () => {
    const token = await mint([Capability.CompanyWrite, Capability.CompanyRead]);
    await auth('put', '/co-mem-x', token).send({ attributes: {} });

    const m = await auth('put', '/co-mem-x/memberships/bu-parity-jane', token).send({
      attributes: { role: 'member' },
    });
    expect(m.status).toBe(204);
    // membership visible via the company users expand (external ids)
    const linked = await api('get', v2path('/co-mem-x?expand=users'), token);
    expect(linked.body.users.map((u: { id: string }) => u.id)).toContain('bu-parity-jane');

    expect(
      (await auth('delete', '/co-mem-x/memberships/bu-parity-jane', token).send()).status,
    ).toBe(204);
    const again = await auth('delete', '/co-mem-x/memberships/bu-parity-jane', token).send();
    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('E1003');
  });

  it('membership PUT rejects a type-mismatched attribute (400 E1017), like the user/company upsert', async () => {
    // A membership Number attribute; a string value must be REJECTED (strict v2),
    // not silently dropped — the same guard user/company upsert already run.
    await buildAttribute(prisma, {
      projectId: fx.projectId,
      bizType: AttributeBizType.MEMBERSHIP,
      dataType: BizAttributeTypes.Number,
      codeName: 'seat_count',
    });
    const token = await mint([Capability.CompanyWrite]);
    const res = await auth('put', '/co-parity-acme/memberships/bu-parity-jane', token).send({
      attributes: { seat_count: 'lots' },
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('membership PUT 404s when the user (E1001) or company (E1002) is missing', async () => {
    const token = await mint([Capability.CompanyWrite]);
    const noUser = await auth('put', '/co-parity-acme/memberships/no-such-user', token).send({});
    expect(noUser.status).toBe(404);
    expect(noUser.body.error.code).toBe('E1001');

    const noCompany = await auth('put', '/no-such-co/memberships/bu-parity-jane', token).send({});
    expect(noCompany.status).toBe(404);
    expect(noCompany.body.error.code).toBe('E1002');
  });

  it('PUT rejects a token without company:write (403 E1012)', async () => {
    const res = await auth('put', '/whatever', v2Token).send({ attributes: {} }); // v2Token: company:read
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
