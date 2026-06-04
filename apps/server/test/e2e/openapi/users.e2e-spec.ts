import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildBizUser } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/**
 * Real-DB contract test for the public `/v1/users` endpoints. This is the
 * template the other OpenAPI resources replicate (Phase 2): API-key auth
 * contract, CRUD shape, real cursor pagination, and cross-environment tenant
 * isolation (IDOR). Boots the full AppModule against the migrated test DB.
 */
describe('OpenAPI /v1/users (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture; // primary tenant
  let fxB: OpenApiFixture; // foreign tenant (for IDOR)
  let fxInactive: OpenApiFixture; // deactivated key
  let fxPage: OpenApiFixture; // isolated 3-user fixture for deterministic pagination

  const foreignUserExternalId = 'u-ext-foreign';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-users-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-users-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-users-inactive',
      isActive: false,
    });

    // A user that exists ONLY in tenant B — used to prove A's key can't see it.
    await buildBizUser(prisma, {
      environmentId: fxB.environmentId,
      externalId: foreignUserExternalId,
    });

    // Exactly three users in an isolated tenant so pagination counts are deterministic.
    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-users-page' });
    for (let i = 0; i < 3; i++) {
      await buildBizUser(prisma, {
        environmentId: fxPage.environmentId,
        externalId: `u-page-${i}`,
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
          path: '/v1/users',
          rawAuthHeader: c.rawAuthHeader,
          token: c.token,
        });
        expect(res.status).toBe(c.status);
        expect(res.body.error.code).toBe(c.code);
        expect(res.body.error).toHaveProperty('message');
        expect(res.body.error).toHaveProperty('doc_url');
      });
    }

    it('rejects an inactive key (403 E1000)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/users',
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });

    it('accepts a valid active key (200)', async () => {
      const res = await openapi(app, { method: 'get', path: '/v1/users', token: fxA.apiKey });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.results)).toBe(true);
    });
  });

  describe('CRUD contract', () => {
    const externalId = 'u-ext-crud';

    it('upserts a user and returns the public shape', async () => {
      const res = await openapi(app, {
        method: 'post',
        path: '/v1/users',
        token: fxA.apiKey,
        body: { id: externalId, attributes: { plan: 'pro' } },
      });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        id: externalId,
        object: OpenApiObjectType.USER,
        attributes: { plan: 'pro' },
        companies: null,
        memberships: null,
      });
      expect(typeof res.body.createdAt).toBe('string');
    });

    it('reads the user back by id', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/users/${externalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: externalId,
        object: OpenApiObjectType.USER,
        attributes: { plan: 'pro' },
      });
    });

    it('includes the user in the list envelope', async () => {
      const res = await openapi(app, { method: 'get', path: '/v1/users', token: fxA.apiKey });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body).toHaveProperty('next');
      expect(res.body).toHaveProperty('previous');
      expect(res.body.results.map((u: { id: string }) => u.id)).toContain(externalId);
    });

    it('deletes the user', async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: `/v1/users/${externalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: externalId,
        object: OpenApiObjectType.USER,
        deleted: true,
      });
    });

    it('returns 404 for the deleted user', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/users/${externalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1001');
    });
  });

  describe('pagination', () => {
    it('traverses pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/users',
        token: fxPage.apiKey,
        query: { limit: 2 },
      });
      expect(p1.status).toBe(200);
      expect(p1.body.results).toHaveLength(2);
      expect(p1.body.previous).toBeNull();
      expect(typeof p1.body.next).toBe('string');

      const cursor = new URLSearchParams(p1.body.next.split('?')[1]).get('cursor');
      expect(cursor).toBeTruthy();

      const p2 = await openapi(app, {
        method: 'get',
        path: '/v1/users',
        token: fxPage.apiKey,
        query: { limit: 2, cursor: cursor as string },
      });
      expect(p2.status).toBe(200);
      expect(p2.body.results).toHaveLength(1);
      expect(p2.body.previous).not.toBeNull();

      const ids = [
        ...p1.body.results.map((u: { id: string }) => u.id),
        ...p2.body.results.map((u: { id: string }) => u.id),
      ];
      // 3 distinct ids across both pages → no overlap, full coverage
      expect(new Set(ids).size).toBe(3);
    });

    it('rejects a limit below 1 (validation, 400)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/users',
        token: fxPage.apiKey,
        query: { limit: 0 },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("cannot read another environment's user — 404, not 200", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/users/${foreignUserExternalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1001');
    });

    it("cannot delete another environment's user, and the row survives", async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: `/v1/users/${foreignUserExternalId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1001');

      const survivor = await prisma.bizUser.findFirst({
        where: { environmentId: fxB.environmentId, externalId: foreignUserExternalId },
      });
      expect(survivor).not.toBeNull();
    });
  });
});
