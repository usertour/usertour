import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildEvent, buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Exercises src/api/shared/pagination.ts end-to-end (the reimplemented cursor
 * pagination + previous-URL resolution) via a v2 list endpoint — the one piece
 * of new logic the per-resource specs didn't cover.
 */
describe('API v2 cursor pagination (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let token: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  function path(qs: string): string {
    return `/v2/projects/${projectId}/event-definitions?${qs}`;
  }
  function get(p: string) {
    return request(app.getHttpServer()).get(p).set('Authorization', `Bearer ${token}`);
  }
  function cursorOf(next: string | null): string | null {
    return next ? new URLSearchParams(next.split('?')[1]).get('cursor') : null;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-pagination' })).id;
    await buildEnvironment(prisma, { projectId });
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    const minted = await graphql(app, {
      query: CREATE,
      variables: {
        input: { name: 'k', scopes: [Capability.EventRead], projectIds: [projectId] },
      },
      token: ownerToken,
    });
    token = gqlData(minted).createApiToken.token;

    for (let i = 0; i < 5; i++) {
      await buildEvent(prisma, { projectId, codeName: `evt_page_${i}` });
    }
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await prisma.userOnProject.deleteMany({ where: { projectId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  it('traverses all pages via the real cursor with no overlap; previous appears after page 1', async () => {
    const p1 = await get(path('limit=2'));
    expect(p1.status).toBe(200);
    expect(p1.body.results).toHaveLength(2);
    expect(p1.body.previous).toBeNull();
    expect(typeof p1.body.next).toBe('string');

    const p2 = await get(path(`limit=2&cursor=${cursorOf(p1.body.next)}`));
    expect(p2.body.results).toHaveLength(2);
    expect(p2.body.previous).not.toBeNull();
    expect(typeof p2.body.next).toBe('string');

    const p3 = await get(path(`limit=2&cursor=${cursorOf(p2.body.next)}`));
    expect(p3.body.results).toHaveLength(1);
    expect(p3.body.next).toBeNull();
    expect(p3.body.previous).not.toBeNull();

    const ids = [...p1.body.results, ...p2.body.results, ...p3.body.results].map(
      (e: { id: string }) => e.id,
    );
    expect(new Set(ids).size).toBe(5);
  });

  it('returns the empty final page for an unknown/exhausted cursor (not a 400)', async () => {
    // A server-issued `next` whose tail rows were deleted is indistinguishable
    // from a garbage cursor — both get the empty final page so a sync client
    // following our own link never crashes on "invalid cursor".
    const res = await get(path('limit=2&cursor=not-a-real-cursor'));
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([]);
    expect(res.body.next).toBeNull();
    expect(res.body.previous).toBeNull();
  });
});
