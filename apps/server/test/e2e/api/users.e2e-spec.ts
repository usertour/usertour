import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
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
 * Parity contract for the rebuilt v2 users (environment-scoped): the new
 * contract-first module must return BYTE-IDENTICAL JSON to the frozen v1 endpoint
 * — including the companies expand. Seed once, hit /v1 (env-key) and /v2 (token),
 * deep-equal the items.
 */
describe('API v2 /users parity with v1 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fx: OpenApiFixture;
  let ownerToken: string;
  let ownerUserId: string;
  let v2Token: string;
  const externalId = 'bu-parity-jane';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function v2path(suffix = ''): string {
    return `/v2/projects/${fx.projectId}/environments/${fx.environmentId}/users${suffix}`;
  }
  function api(method: 'get', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fx = await seedApiFixture(prisma, { projectName: 'api-v2-users-parity' });
    const owner = await buildAuthorizedUser(prisma, app, {
      projectId: fx.projectId,
      role: 'OWNER',
    });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: {
          name: 'k',
          scopes: [Capability.UserRead],
          projectIds: [fx.projectId],
          environmentIds: [fx.environmentId],
        },
      },
      token: ownerToken,
    });
    v2Token = gqlData(minted).createApiToken.token;

    const bizUser = await buildBizUser(prisma, {
      environmentId: fx.environmentId,
      externalId,
      data: { name: 'Jane', email: 'jane@example.com' },
    });
    const company = await buildBizCompany(prisma, {
      environmentId: fx.environmentId,
      externalId: 'co-parity-acme',
      data: { plan: 'pro' },
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

  it('returns byte-identical user JSON on v1 and v2 (base)', async () => {
    const v1 = await openapi(app, { method: 'get', path: '/v1/users', token: fx.apiKey });
    const v2 = await api('get', v2path(), v2Token);
    expect(v1.status).toBe(200);
    expect(v2.status).toBe(200);
    const v1item = v1.body.results.find((u: { id: string }) => u.id === externalId);
    const v2item = v2.body.results.find((u: { id: string }) => u.id === externalId);
    expect(v1item).toBeDefined();
    expect(v2item).toEqual(v1item);
  });

  it('returns byte-identical user JSON on v1 and v2 (expand=companies)', async () => {
    const v1 = await openapi(app, {
      method: 'get',
      path: '/v1/users',
      token: fx.apiKey,
      query: { expand: 'companies' },
    });
    const v2 = await api('get', v2path('?expand=companies'), v2Token);
    const v1item = v1.body.results.find((u: { id: string }) => u.id === externalId);
    const v2item = v2.body.results.find((u: { id: string }) => u.id === externalId);
    expect(v1item.companies).toEqual([
      expect.objectContaining({ id: 'co-parity-acme', object: 'company' }),
    ]);
    expect(v2item).toEqual(v1item);
  });

  it('returns 404 for an unknown user (E1001)', async () => {
    const res = await api('get', v2path('/nope'), v2Token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1001');
  });

  it('404s on a segmentId from another project (no cross-tenant segment oracle)', async () => {
    const own = await buildSegment(prisma, {
      projectId: fx.projectId,
      environmentId: fx.environmentId,
    });
    const other = await buildProject(prisma, { name: 'api-v2-users-foreign' });
    const foreign = await buildSegment(prisma, { projectId: other.id });
    // own segment filters fine (dataType ALL → no rows excluded) ...
    expect((await api('get', v2path(`?segmentId=${own.id}`), v2Token)).status).toBe(200);
    // ... but another project's segment id is a hard 404, not a silent all-rows
    // result that would leak its existence / apply a foreign segment's rules.
    const res = await api('get', v2path(`?segmentId=${foreign.id}`), v2Token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1025');
  });

  it('rejects a timezone-less createdAfter datetime (400 E1017 — ambiguous across deployments)', async () => {
    // "2026-07-10T00:00:00" parses in the SERVER local zone — the same request
    // would filter a different range on a UTC cloud vs a UTC+8 self-host.
    const bad = await api('get', `${v2path()}?createdAfter=2026-07-10T00:00:00`, v2Token);
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('E1017');

    // Unambiguous forms stay accepted: date-only and explicit-offset datetimes.
    expect((await api('get', `${v2path()}?createdAfter=2026-07-10`, v2Token)).status).toBe(200);
    expect(
      (await api('get', `${v2path()}?createdAfter=2026-07-10T00:00:00%2B08:00`, v2Token)).status,
    ).toBe(200);
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

  async function mint(scopes: Capability[], environmentIds?: string[]): Promise<string> {
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        // Env-targeted scopes must NAME environments (server rule) — default to the suite env.
        input: {
          name: 'kw',
          scopes,
          projectIds: [fx.projectId],
          environmentIds: environmentIds ?? [fx.environmentId],
        },
      },
      token: ownerToken,
    });
    return gqlData(minted).createApiToken.token;
  }

  it('PUT upserts a user (create → merge update), then DELETE removes it (204)', async () => {
    const token = await mint([Capability.UserWrite, Capability.UserRead, Capability.UserDelete]);
    const put = (id: string, body: object) =>
      request(app.getHttpServer())
        .put(v2path(`/${id}`))
        .set('Authorization', `Bearer ${token}`)
        .send(body);

    const created = await put('bu-write-bob', { attributes: { name: 'Bob' } });
    expect(created.status).toBe(200);
    expect(created.body).toMatchObject({ id: 'bu-write-bob', object: 'user' });
    expect(created.body.attributes).toMatchObject({ name: 'Bob' });

    const updated = await put('bu-write-bob', { attributes: { plan: 'pro' } });
    expect(updated.status).toBe(200);
    expect(updated.body.attributes).toMatchObject({ name: 'Bob', plan: 'pro' }); // merged

    const del = await request(app.getHttpServer())
      .delete(v2path('/bu-write-bob'))
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(204);

    const after = await api('get', v2path('/bu-write-bob'), token);
    expect(after.status).toBe(404);
  });

  it('PUT rejects an invalid attribute codeName (400 E1017)', async () => {
    const token = await mint([Capability.UserWrite]);
    const res = await request(app.getHttpServer())
      .put(v2path('/bu-bad-attr'))
      .set('Authorization', `Bearer ${token}`)
      .send({ attributes: { 'bad name': 'x' } }); // space breaks the codeName rule
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('PUT rejects a token without user:write (403 E1012)', async () => {
    const res = await request(app.getHttpServer())
      .put(v2path('/whatever'))
      .set('Authorization', `Bearer ${v2Token}`) // v2Token carries only user:read
      .send({ attributes: {} });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('DELETE 404 for an unknown user (E1001)', async () => {
    const token = await mint([Capability.UserDelete]);
    const res = await request(app.getHttpServer())
      .delete(v2path('/nope'))
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1001');
  });
});
