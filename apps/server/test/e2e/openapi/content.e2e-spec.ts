import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildContent, buildVersion } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/** Real-DB contract test for the read-only `/v1/content` + `/v1/content-versions` endpoints. */
describe('OpenAPI /v1/content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;
  let fxPage: OpenApiFixture;

  let contentId: string;
  let versionId: string;
  let foreignContentId: string;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-content-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-content-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-content-inactive',
      isActive: false,
    });

    const content = await buildContent(prisma, {
      projectId: fxA.projectId,
      environmentId: fxA.environmentId,
      name: 'Onboarding flow',
    });
    contentId = content.id;
    const version = await buildVersion(prisma, { contentId }); // also sets content.editedVersionId
    versionId = version.id;

    const foreign = await buildContent(prisma, {
      projectId: fxB.projectId,
      environmentId: fxB.environmentId,
    });
    foreignContentId = foreign.id;

    fxPage = await seedApiFixture(prisma, { projectName: 'openapi-content-page' });
    for (let i = 0; i < 3; i++) {
      await buildContent(prisma, {
        projectId: fxPage.projectId,
        environmentId: fxPage.environmentId,
        name: `content-${i}`,
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
          path: '/v1/content',
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
        path: '/v1/content',
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('content read contract', () => {
    it('gets a content by id', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content/${contentId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: contentId, object: OpenApiObjectType.CONTENT });
      expect(res.body.editedVersionId).toBe(versionId);
    });

    it('expands editedVersion', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content/${contentId}`,
        token: fxA.apiKey,
        query: { expand: 'editedVersion' },
      });
      expect(res.status).toBe(200);
      expect(res.body.editedVersion).toMatchObject({
        id: versionId,
        object: OpenApiObjectType.CONTENT_VERSION,
      });
    });

    it('lists content', async () => {
      const res = await openapi(app, { method: 'get', path: '/v1/content', token: fxA.apiKey });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results.map((c: { id: string }) => c.id)).toContain(contentId);
    });

    it('returns 404 for an unknown content', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content/does-not-exist',
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });
  });

  describe('content-versions read contract', () => {
    it('gets a content version by id', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content-versions/${versionId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: versionId, object: OpenApiObjectType.CONTENT_VERSION });
    });

    it('lists versions for a content', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content-versions',
        token: fxA.apiKey,
        query: { contentId },
      });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('results');
      expect(res.body.results.map((v: { id: string }) => v.id)).toContain(versionId);
    });

    it('returns 404 listing versions for an unknown content', async () => {
      const res = await openapi(app, {
        method: 'get',
        path: '/v1/content-versions',
        token: fxA.apiKey,
        query: { contentId: 'does-not-exist' },
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });
  });

  describe('pagination', () => {
    it('traverses content pages via the real cursor with no overlap', async () => {
      const p1 = await openapi(app, {
        method: 'get',
        path: '/v1/content',
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
        path: '/v1/content',
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
        path: '/v1/content',
        token: fxPage.apiKey,
        query: { limit: 0 },
      });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("cannot read another environment's content — 404, not 200", async () => {
      const res = await openapi(app, {
        method: 'get',
        path: `/v1/content/${foreignContentId}`,
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });
  });
});
