import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildBizUser, buildContent, buildSession, buildVersion } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/** Real-DB contract test for the `/v1/content-sessions` endpoints. */
describe('OpenAPI /v1/content-sessions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;
  let fxPage: OpenApiFixture;

  let mainSessionId: string;
  let mainContentId: string;
  let deleteSessionId: string;
  let pageContentId: string;
  let foreignSessionId: string;

  // Seed content + version + bizUser + session, all wired to one environment.
  const seedSession = async (
    fx: OpenApiFixture,
    reuse?: { contentId: string; versionId: string },
  ) => {
    let { contentId, versionId } = reuse ?? {};
    if (!contentId || !versionId) {
      const content = await buildContent(prisma, {
        projectId: fx.projectId,
        environmentId: fx.environmentId,
      });
      contentId = content.id;
      versionId = (await buildVersion(prisma, { contentId })).id;
    }
    const bizUser = await buildBizUser(prisma, { environmentId: fx.environmentId });
    const session = await buildSession(prisma, {
      bizUserId: bizUser.id,
      contentId,
      versionId,
      environmentId: fx.environmentId,
      projectId: fx.projectId,
    });
    return { contentId, versionId, sessionId: session.id };
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-sessions-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-sessions-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-sessions-inactive',
      isActive: false,
    });

    const main = await seedSession(fxA);
    mainSessionId = main.sessionId;
    mainContentId = main.contentId;

    deleteSessionId = (await seedSession(fxA)).sessionId;
    foreignSessionId = (await seedSession(fxB)).sessionId;

    // One content with three sessions, for deterministic pagination.
    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-sessions-page' });
    const pageContent = await buildContent(prisma, {
      projectId: fxPage.projectId,
      environmentId: fxPage.environmentId,
    });
    pageContentId = pageContent.id;
    const pageVersionId = (await buildVersion(prisma, { contentId: pageContentId })).id;
    for (let i = 0; i < 3; i++) {
      await seedSession(fxPage, { contentId: pageContentId, versionId: pageVersionId });
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
          path: `/v1/content-sessions/${mainSessionId}`,
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
        path: `/v1/content-sessions/${mainSessionId}`,
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('read contract', () => {
    it('gets a session by id', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content-sessions/${mainSessionId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: mainSessionId,
        object: OpenApiObjectType.CONTENT_SESSION,
        contentId: mainContentId,
      });
      expect(typeof res.body.completed).toBe('boolean');
    });

    it('lists sessions for a content', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content-sessions',
        token: fxA.apiKey,
        query: { contentId: mainContentId },
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results.map((s: { id: string }) => s.id)).toContain(mainSessionId);
    });

    it('returns 404 listing sessions for an unknown content', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content-sessions',
        token: fxA.apiKey,
        query: { contentId: 'does-not-exist' },
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });

    it('returns 404 for an unknown session', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content-sessions/does-not-exist',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1005');
    });
  });

  describe('end contract', () => {
    // The positive end path is intentionally not asserted here: ending a session
    // runs analytics that require FLOW_STEP_SEEN / FLOW_ENDED events to exist for
    // the project, which is beyond a contract-test fixture. We cover the
    // auth/not-found/scoping contract of the endpoint, which is what matters for
    // the public API surface.
    it('returns 404 ending an unknown session', async () => {
      const res = await openapi(app, {
        method: 'post',
        path: '/v1/content-sessions/does-not-exist/end',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1005');
    });
  });

  describe('delete contract', () => {
    it('deletes a session, then it is gone', async () => {
      const del = await openapi(app, {
        method: 'delete',
        path: `/v1/content-sessions/${deleteSessionId}`,
        token: fxA.apiKey,
      });
      expect(del.status).toBe(200);
      expect(del.body).toEqual({
        id: deleteSessionId,
        object: OpenApiObjectType.CONTENT_SESSION,
        deleted: true,
      });

      const gone = await openapi(app, {
        method: 'get',
        path: `/v1/content-sessions/${deleteSessionId}`,
        token: fxA.apiKey,
      });
      expect(gone.status).toBe(404);
      expect(gone.body.error.code).toBe('E1005');
    });
  });

  describe('pagination', () => {
    it('traverses session pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/content-sessions',
        token: fxPage.apiKey,
        query: { contentId: pageContentId, limit: 2 },
      });
      expect(p1.status).toBe(200);
      expect(p1.body.results).toHaveLength(2);
      expect(p1.body.previous).toBeNull();
      expect(typeof p1.body.next).toBe('string');

      const cursor = new URLSearchParams(p1.body.next.split('?')[1]).get('cursor');
      const p2 = await openapi(app, {
        method: 'get',
        path: '/v1/content-sessions',
        token: fxPage.apiKey,
        query: { contentId: pageContentId, limit: 2, cursor: cursor as string },
      });
      expect(p2.status).toBe(200);
      expect(p2.body.results).toHaveLength(1);
      expect(p2.body.previous).not.toBeNull();

      const ids = [
        ...p1.body.results.map((s: { id: string }) => s.id),
        ...p2.body.results.map((s: { id: string }) => s.id),
      ];
      expect(new Set(ids).size).toBe(3);
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("cannot read another environment's session — 404", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content-sessions/${foreignSessionId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1005');
    });

    it("cannot end another environment's session — 404", async () => {
      const res = await openapi(app, {
        method: 'post',
        path: `/v1/content-sessions/${foreignSessionId}/end`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1005');
    });

    it("delete with another environment's key does not remove the row", async () => {
      // Note: the delete endpoint reports deleted:true unconditionally, but the
      // underlying delete is environment-scoped, so the foreign row must survive.
      await openapi(app, {
        method: 'delete',
        path: `/v1/content-sessions/${foreignSessionId}`,
        token: fxA.apiKey,
      });

      const survivor = await prisma.bizSession.findUnique({ where: { id: foreignSessionId } });
      expect(survivor).not.toBeNull();
    });
  });
});
