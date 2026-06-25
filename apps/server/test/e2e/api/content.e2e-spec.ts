import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildContent,
  buildEnvironment,
  buildProject,
  buildTheme,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Shape contract for the rebuilt v2 content endpoint. Content is the one resource
 * whose v2 JSON intentionally differs from v1: per-environment publish state is
 * exposed as `environments[]` instead of the deprecated single publishedVersionId.
 */
describe('API v2 /content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let flowId: string;
  let flowVersionId: string;
  let publishedId: string;
  let publishedVersionId: string;
  let themeId: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'k', scopes, projectIds: [projectId] } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
  }

  function api(method: 'get' | 'post' | 'patch' | 'delete', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-content' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
    themeId = (await buildTheme(prisma, { projectId })).id;

    const flow = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'Onboarding',
      type: 'flow',
    });
    flowId = flow.id;
    flowVersionId = (await buildVersion(prisma, { contentId: flowId })).id;

    const published = await buildContent(prisma, {
      projectId,
      environmentId,
      name: 'Live',
      type: 'flow',
    });
    publishedId = published.id;
    publishedVersionId = (await buildVersion(prisma, { contentId: publishedId })).id;
    await prisma.contentOnEnvironment.create({
      data: { environmentId, contentId: publishedId, published: true, publishedVersionId },
    });
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

  it('lists content (200) with the v2 shape (environments[], no legacy fields)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content`, token);
    expect(res.status).toBe(200);
    const item = res.body.results.find((c: { id: string }) => c.id === flowId);
    expect(item).toMatchObject({ id: flowId, object: 'content', type: 'flow' });
    expect(Array.isArray(item.environments)).toBe(true);
    expect(item).toHaveProperty('buildUrl');
    expect(item).not.toHaveProperty('publishedVersionId');
    expect(item).not.toHaveProperty('publishedVersion');
  });

  it('exposes per-environment publish state via environments[]', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${publishedId}`, token);
    expect(res.status).toBe(200);
    expect(res.body.environments).toContainEqual(
      expect.objectContaining({ environmentId, published: true, publishedVersionId }),
    );
  });

  it('returns an empty environments[] for unpublished content', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${flowId}`, token);
    expect(res.status).toBe(200);
    expect(res.body.environments).toEqual([]);
  });

  it('expands editedVersion and environments[i].publishedVersion', async () => {
    const token = await mint([Capability.ContentRead]);
    const edited = await api(
      'get',
      `/v2/projects/${projectId}/content/${flowId}?expand=editedVersion`,
      token,
    );
    expect(edited.body.editedVersion).toMatchObject({
      id: flowVersionId,
      object: 'contentVersion',
    });

    const pub = await api(
      'get',
      `/v2/projects/${projectId}/content/${publishedId}?expand=publishedVersion`,
      token,
    );
    const env = pub.body.environments.find(
      (e: { environmentId: string }) => e.environmentId === environmentId,
    );
    expect(env.publishedVersion).toMatchObject({
      id: publishedVersionId,
      object: 'contentVersion',
    });
  });

  it('filters by type server-side', async () => {
    const token = await mint([Capability.ContentRead]);
    const flows = await api('get', `/v2/projects/${projectId}/content?type=flow`, token);
    expect(flows.body.results.map((c: { id: string }) => c.id)).toContain(flowId);
    const checklists = await api('get', `/v2/projects/${projectId}/content?type=checklist`, token);
    expect(checklists.body.results.map((c: { id: string }) => c.id)).not.toContain(flowId);
  });

  it('filters by name server-side (case-insensitive substring)', async () => {
    const token = await mint([Capability.ContentRead]);
    // "Onboarding" matches the lowercase substring "onb"; "Live" does not.
    const res = await api('get', `/v2/projects/${projectId}/content?name=onb`, token);
    const ids = res.body.results.map((c: { id: string }) => c.id);
    expect(ids).toContain(flowId);
    expect(ids).not.toContain(publishedId);
  });

  it('returns 404 for an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/does-not-exist`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.UserRead]);
    const res = await api('get', `/v2/projects/${projectId}/content`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects a missing Authorization header (401 E1010)', async () => {
    const res = await api('get', `/v2/projects/${projectId}/content`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('E1010');
  });

  it('maps a bad expand enum to E1017 (zod validation)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content?expand=nope`, token);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('creates, renames, and deletes content (CRUD)', async () => {
    const token = await mint([
      Capability.ContentRead,
      Capability.ContentCreate,
      Capability.ContentUpdate,
      Capability.ContentDelete,
    ]);

    // create
    const created = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'flow',
      name: 'Created via API',
      themeId,
    });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({
      object: 'content',
      type: 'flow',
      name: 'Created via API',
    });
    expect(typeof created.body.editedVersionId).toBe('string');
    const id = created.body.id;

    // rename
    const renamed = await api('patch', `/v2/projects/${projectId}/content/${id}`, token).send({
      name: 'Renamed',
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.name).toBe('Renamed');

    // delete
    const deleted = await api('delete', `/v2/projects/${projectId}/content/${id}`, token);
    expect(deleted.status).toBe(204);

    // gone
    const gone = await api('get', `/v2/projects/${projectId}/content/${id}`, token);
    expect(gone.status).toBe(404);
  });

  it('refuses to delete published content, allows it once unpublished (409 E1028)', async () => {
    const token = await mint([
      Capability.ContentCreate,
      Capability.ContentDelete,
      Capability.ContentRead,
    ]);
    // a fresh content published into the environment (don't touch shared fixtures)
    const c = await buildContent(prisma, { projectId, environmentId });
    const v = await buildVersion(prisma, { contentId: c.id });
    await prisma.contentOnEnvironment.create({
      data: { environmentId, contentId: c.id, published: true, publishedVersionId: v.id },
    });

    // published → delete blocked
    const blocked = await api('delete', `/v2/projects/${projectId}/content/${c.id}`, token);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('E1028');
    expect((await api('get', `/v2/projects/${projectId}/content/${c.id}`, token)).status).toBe(200);

    // unpublish (clear the live row), then delete succeeds
    await prisma.contentOnEnvironment.deleteMany({ where: { contentId: c.id } });
    const ok = await api('delete', `/v2/projects/${projectId}/content/${c.id}`, token);
    expect(ok.status).toBe(204);
    expect((await api('get', `/v2/projects/${projectId}/content/${c.id}`, token)).status).toBe(404);
  });

  it('rejects create without the create scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'flow',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects create without a themeId (400) — a theme is required to render', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'flow',
      name: 'No theme',
    });
    expect(res.status).toBe(400);
  });

  it('allows creating a tracker without a themeId (it has no UI)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'tracker',
      name: 'Signup tracker',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ object: 'content', type: 'tracker' });
  });

  it('rejects create with an unknown themeId (404 E1021)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'flow',
      name: 'Bad theme',
      themeId: 'does-not-exist',
    });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1021');
  });

  it('duplicates content into a fresh content (POST :id/duplicate)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api(
      'post',
      `/v2/projects/${projectId}/content/${flowId}/duplicate`,
      token,
    ).send({ name: 'Onboarding copy' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ object: 'content', type: 'flow', name: 'Onboarding copy' });
    expect(res.body.id).not.toBe(flowId); // a new content
    expect(typeof res.body.editedVersionId).toBe('string');
  });

  it('defaults the duplicate name to the source name', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api(
      'post',
      `/v2/projects/${projectId}/content/${flowId}/duplicate`,
      token,
    ).send({});
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Onboarding'); // source name
  });

  it('returns 404 duplicating unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const res = await api('post', `/v2/projects/${projectId}/content/nope/duplicate`, token).send(
      {},
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('rejects duplicate without the create scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'post',
      `/v2/projects/${projectId}/content/${flowId}/duplicate`,
      token,
    ).send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('excludes soft-deleted content from the list', async () => {
    const token = await mint([
      Capability.ContentRead,
      Capability.ContentCreate,
      Capability.ContentDelete,
    ]);
    const created = await api('post', `/v2/projects/${projectId}/content`, token).send({
      type: 'flow',
      name: 'To be archived',
      themeId,
    });
    const id = created.body.id;
    // present before delete
    let list = await api('get', `/v2/projects/${projectId}/content?limit=100`, token);
    expect(list.body.results.map((c: { id: string }) => c.id)).toContain(id);
    // delete, then it must be gone from the list
    await api('delete', `/v2/projects/${projectId}/content/${id}`, token);
    list = await api('get', `/v2/projects/${projectId}/content?limit=100`, token);
    expect(list.body.results.map((c: { id: string }) => c.id)).not.toContain(id);
  });

  it('seeds non-flow content with its type default data', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentCreate]);
    const create = (type: string) =>
      api('post', `/v2/projects/${projectId}/content`, token).send({ type, name: type, themeId });

    const banner = await create('banner');
    expect(banner.status).toBe(201);
    const bv = await prisma.version.findUnique({ where: { id: banner.body.editedVersionId } });
    // structural default that the runtime needs and a partial update wouldn't fill
    expect((bv?.data as { embedPlacement?: string })?.embedPlacement).toBe('top-of-page');

    const checklist = await create('checklist');
    const cv = await prisma.version.findUnique({ where: { id: checklist.body.editedVersionId } });
    const cd = cv?.data as { initialDisplay?: string; items?: unknown[] };
    expect(cd?.initialDisplay).toBeDefined();
    expect(Array.isArray(cd?.items)).toBe(true);

    const launcher = await create('launcher');
    const lv = await prisma.version.findUnique({ where: { id: launcher.body.editedVersionId } });
    expect((lv?.data as { behavior?: unknown })?.behavior).toBeDefined();

    // flow gets no data seed (it uses steps)
    const flow = await create('flow');
    const fv = await prisma.version.findUnique({ where: { id: flow.body.editedVersionId } });
    expect(fv?.data ?? null).toBeNull();
  });
});
