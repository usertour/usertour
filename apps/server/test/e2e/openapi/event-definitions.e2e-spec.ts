import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildEvent } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/** Real-DB contract test for `GET /v1/event-definitions`. */
describe('OpenAPI /v1/event-definitions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;
  let fxPage: OpenApiFixture;

  const foreignCodeName = 'evt_foreign_zzz';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-events-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-events-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-events-inactive',
      isActive: false,
    });

    await buildEvent(prisma, { projectId: fxA.projectId, codeName: 'evt_a' });
    await buildEvent(prisma, { projectId: fxA.projectId, codeName: 'evt_b' });
    await buildEvent(prisma, { projectId: fxB.projectId, codeName: foreignCodeName });

    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-events-page' });
    for (let i = 0; i < 3; i++) {
      await buildEvent(prisma, { projectId: fxPage.projectId, codeName: `evt_page_${i}` });
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
          path: '/v1/event-definitions',
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
        path: '/v1/event-definitions',
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('list contract', () => {
    it('lists event definitions with the public shape', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/event-definitions',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      const byCode = new Map(res.body.results.map((e: { codeName: string }) => [e.codeName, e]));
      expect(byCode.has('evt_a')).toBe(true);
      expect(byCode.get('evt_a')).toMatchObject({ object: OpenApiObjectType.EVENT_DEFINITION });
    });
  });

  describe('pagination', () => {
    it('traverses pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/event-definitions',
        token: fxPage.apiKey,
        query: { limit: 2 },
      });
      expect(p1.status).toBe(200);
      expect(p1.body.results).toHaveLength(2);
      expect(typeof p1.body.next).toBe('string');

      const cursor = new URLSearchParams(p1.body.next.split('?')[1]).get('cursor');
      const p2 = await openapi(app, {
        method: 'get',
        path: '/v1/event-definitions',
        token: fxPage.apiKey,
        query: { limit: 2, cursor: cursor as string },
      });
      expect(p2.status).toBe(200);
      expect(p2.body.results).toHaveLength(1);

      const ids = [
        ...p1.body.results.map((e: { id: string }) => e.id),
        ...p2.body.results.map((e: { id: string }) => e.id),
      ];
      expect(new Set(ids).size).toBe(3);
    });

    it('rejects a limit below 1 (validation, 400)', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/event-definitions',
        token: fxPage.apiKey,
        query: { limit: 0 },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("does not leak another environment's events into the list", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/event-definitions',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body.results.map((e: { codeName: string }) => e.codeName)).not.toContain(
        foreignCodeName,
      );
    });
  });
});
