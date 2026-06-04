import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildBizCompany, buildBizUser, buildBizUserOnCompany } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/** Real-DB contract test for the public `/v1/companies` endpoints. */
describe('OpenAPI /v1/companies (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;
  let fxPage: OpenApiFixture;

  const foreignCompanyExternalId = 'co-foreign';
  const expandCompanyExternalId = 'co-expand';
  const expandUserExternalId = 'u-expand';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-companies-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-companies-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-companies-inactive',
      isActive: false,
    });

    await buildBizCompany(prisma, {
      environmentId: fxB.environmentId,
      externalId: foreignCompanyExternalId,
    });

    // Company + user + membership in tenant A, for the expand block.
    const expandCompany = await buildBizCompany(prisma, {
      environmentId: fxA.environmentId,
      externalId: expandCompanyExternalId,
    });
    const expandUser = await buildBizUser(prisma, {
      environmentId: fxA.environmentId,
      externalId: expandUserExternalId,
    });
    await buildBizUserOnCompany(prisma, {
      bizUserId: expandUser.id,
      bizCompanyId: expandCompany.id,
    });

    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-companies-page' });
    for (let i = 0; i < 3; i++) {
      await buildBizCompany(prisma, {
        environmentId: fxPage.environmentId,
        externalId: `co-page-${i}`,
      });
    }
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const fx of [fxA, fxB, fxInactive, fxPage]) {
        if (fx) {
          await teardownApiFixture(prisma, fx);
        }
      }
    }
    await app?.close();
  });

  describe('auth contract', () => {
    for (const c of AUTH_CASES) {
      it(`rejects: ${c.name}`, async () => {
        const res = await openapi(app, {
          method: 'get',
          path: '/v1/companies',
          rawAuthHeader: c.rawAuthHeader,
          token: c.token,
        });
        expect(res.status).toBe(c.status);
        expect(res.body.error.code).toBe(c.code);
      });
    }

    it('rejects an inactive key (403 E1000)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/companies',
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('CRUD contract', () => {
    const externalId = 'co-crud';

    it('upserts a company and returns the public shape', async () => {
      const res = await openapi(app, {
        method: 'post',
        path: '/v1/companies',
        token: fxA.apiKey,
        body: { id: externalId, attributes: { plan: 'enterprise' } },
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: externalId,
        object: OpenApiObjectType.COMPANY,
        attributes: { plan: 'enterprise' },
        users: null,
        memberships: null,
      });
      expect(typeof res.body.createdAt).toBe('string');
    });

    it('reads the company back, lists it, then deletes it', async () => {
      const get = await openapi(app, {
        method: 'get',
        path: `/v1/companies/${externalId}`,
        token: fxA.apiKey,
      });
      expect(get.status).toBe(200);
      expect(get.body).toMatchObject({ id: externalId, object: OpenApiObjectType.COMPANY });

      const list = await openapi(app, { method: 'get', path: '/v1/companies', token: fxA.apiKey });
      expect(list.status).toBe(200);
      expect(list.body).toHaveProperty('results');
      expect(list.body.results.map((c: { id: string }) => c.id)).toContain(externalId);

      const del = await openapi(app, {
        method: 'delete',
        path: `/v1/companies/${externalId}`,
        token: fxA.apiKey,
      });
      expect(del.status).toBe(200);
      expect(del.body).toEqual({
        id: externalId,
        object: OpenApiObjectType.COMPANY,
        deleted: true,
      });

      const gone = await openapi(app, {
        method: 'get',
        path: `/v1/companies/${externalId}`,
        token: fxA.apiKey,
      });
      expect(gone.status).toBe(404);
      expect(gone.body.error.code).toBe('E1002');
    });
  });

  describe('expand', () => {
    it('expands memberships and the nested user', async () => {
      const m = await openapi(app, {
        method: 'get',
        path: `/v1/companies/${expandCompanyExternalId}`,
        token: fxA.apiKey,
        query: { expand: 'memberships' },
      });
      expect(m.status).toBe(200);
      expect(Array.isArray(m.body.memberships)).toBe(true);
      expect(m.body.memberships).toHaveLength(1);
      expect(m.body.memberships[0].object).toBe(OpenApiObjectType.COMPANY_MEMBERSHIP);

      const mu = await openapi(app, {
        method: 'get',
        path: `/v1/companies/${expandCompanyExternalId}`,
        token: fxA.apiKey,
        query: { expand: 'memberships.user' },
      });
      expect(mu.status).toBe(200);
      expect(mu.body.memberships[0].user).toMatchObject({
        id: expandUserExternalId,
        object: OpenApiObjectType.USER,
      });
    });
  });

  describe('pagination', () => {
    it('traverses pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/companies',
        token: fxPage.apiKey,
        query: { limit: 2 },
      });
      expect(p1.status).toBe(200);
      expect(p1.body.results).toHaveLength(2);
      expect(p1.body.previous).toBeNull();
      expect(typeof p1.body.next).toBe('string');

      const cursor = new URLSearchParams(p1.body.next.split('?')[1]).get('cursor');
      const p2 = await openapi(app, {
        method: 'get',
        path: '/v1/companies',
        token: fxPage.apiKey,
        query: { limit: 2, cursor: cursor as string },
      });
      expect(p2.status).toBe(200);
      expect(p2.body.results).toHaveLength(1);
      expect(p2.body.previous).not.toBeNull();

      const ids = [
        ...p1.body.results.map((c: { id: string }) => c.id),
        ...p2.body.results.map((c: { id: string }) => c.id),
      ];
      expect(new Set(ids).size).toBe(3);
    });

    it('rejects a limit below 1 (validation, 400)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/companies',
        token: fxPage.apiKey,
        query: { limit: 0 },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("cannot read another environment's company — 404, not 200", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/companies/${foreignCompanyExternalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1002');
    });

    it("cannot delete another environment's company, and the row survives", async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: `/v1/companies/${foreignCompanyExternalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1002');

      const survivor = await prisma.bizCompany.findFirst({
        where: { environmentId: fxB.environmentId, externalId: foreignCompanyExternalId },
      });
      expect(survivor).not.toBeNull();
    });
  });
});
