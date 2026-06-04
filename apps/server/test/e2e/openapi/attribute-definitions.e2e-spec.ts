import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildAttribute } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

// AttributeBizType: 1 = USER, 2 = COMPANY (see common/openapi/types mapBizType).
const BIZ_TYPE_USER = 1;
const BIZ_TYPE_COMPANY = 2;

/**
 * Real-DB contract test for `GET /v1/attribute-definitions` (replaces the old
 * mocked-Prisma e2e). Covers scope filtering, ordering, pagination, validation,
 * and project-scoped isolation.
 */
describe('OpenAPI /v1/attribute-definitions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;
  let fxPage: OpenApiFixture;

  const foreignCodeName = 'attr_foreign_zzz';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-attrs-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-attrs-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-attrs-inactive',
      isActive: false,
    });

    await buildAttribute(prisma, {
      projectId: fxA.projectId,
      bizType: BIZ_TYPE_USER,
      codeName: 'attr_user_a',
    });
    await buildAttribute(prisma, {
      projectId: fxA.projectId,
      bizType: BIZ_TYPE_USER,
      codeName: 'attr_user_b',
    });
    await buildAttribute(prisma, {
      projectId: fxA.projectId,
      bizType: BIZ_TYPE_COMPANY,
      codeName: 'attr_company_a',
    });

    await buildAttribute(prisma, {
      projectId: fxB.projectId,
      bizType: BIZ_TYPE_USER,
      codeName: foreignCodeName,
    });

    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-attrs-page' });
    for (let i = 0; i < 3; i++) {
      await buildAttribute(prisma, {
        projectId: fxPage.projectId,
        bizType: BIZ_TYPE_USER,
        codeName: `attr_page_${i}`,
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
          path: '/v1/attribute-definitions',
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
        path: '/v1/attribute-definitions',
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('scope filtering', () => {
    it('returns only user-scoped attributes for scope=user', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
        query: { scope: 'user' },
      });
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(
        res.body.results.every((a: { scope: string }) => a.scope === OpenApiObjectType.USER),
      ).toBe(true);
      const codeNames = res.body.results.map((a: { codeName: string }) => a.codeName);
      expect(codeNames).toEqual(expect.arrayContaining(['attr_user_a', 'attr_user_b']));
      expect(codeNames).not.toContain('attr_company_a');
    });

    it('returns only company-scoped attributes for scope=company', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
        query: { scope: 'company' },
      });
      expect(res.status).toBe(200);
      expect(
        res.body.results.every((a: { scope: string }) => a.scope === OpenApiObjectType.COMPANY),
      ).toBe(true);
      expect(res.body.results.map((a: { codeName: string }) => a.codeName)).toContain(
        'attr_company_a',
      );
    });

    it('returns all scopes when none is specified', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      const scopes = new Set(res.body.results.map((a: { scope: string }) => a.scope));
      expect(scopes.has(OpenApiObjectType.USER)).toBe(true);
      expect(scopes.has(OpenApiObjectType.COMPANY)).toBe(true);
    });

    it('rejects an invalid scope (validation, 400)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
        query: { scope: 'not-a-scope' },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('ordering', () => {
    it('sorts by -codeName descending', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
        query: { scope: 'user', orderBy: '-codeName' },
      });
      expect(res.status).toBe(200);
      const codeNames: string[] = res.body.results.map((a: { codeName: string }) => a.codeName);
      const sorted = [...codeNames].sort((x, y) => y.localeCompare(x));
      expect(codeNames).toEqual(sorted);
    });
  });

  describe('pagination', () => {
    it('traverses pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxPage.apiKey,
        query: { limit: 2 },
      });
      expect(p1.status).toBe(200);
      expect(p1.body.results).toHaveLength(2);
      expect(typeof p1.body.next).toBe('string');

      const cursor = new URLSearchParams(p1.body.next.split('?')[1]).get('cursor');
      const p2 = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxPage.apiKey,
        query: { limit: 2, cursor: cursor as string },
      });
      expect(p2.status).toBe(200);
      expect(p2.body.results).toHaveLength(1);

      const ids = [
        ...p1.body.results.map((a: { id: string }) => a.id),
        ...p2.body.results.map((a: { id: string }) => a.id),
      ];
      expect(new Set(ids).size).toBe(3);
    });

    it('rejects a limit below 1 (validation, 400)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxPage.apiKey,
        query: { limit: 0 },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("does not leak another environment's attributes into the list", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/attribute-definitions',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body.results.map((a: { codeName: string }) => a.codeName)).not.toContain(
        foreignCodeName,
      );
    });
  });
});
