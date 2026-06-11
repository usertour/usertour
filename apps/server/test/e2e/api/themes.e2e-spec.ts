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
 * Contract test for the v2 themes read resource (GET list / :id) and the version
 * `themeId` write it makes discoverable.
 */
describe('API v2 themes + version themeId (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let themeId: string;
  let defaultThemeId: string;
  let writeContentId: string;
  let writeVersionId: string;

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

  function api(method: 'get' | 'patch', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-themes' })).id;
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    defaultThemeId = (await buildTheme(prisma, { projectId, name: 'Default', isDefault: true })).id;
    themeId = (await buildTheme(prisma, { projectId, name: 'Brand' })).id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    writeContentId = content.id;
    writeVersionId = (await buildVersion(prisma, { contentId: content.id, sequence: 0 })).id;
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

  it('lists themes (200) with the v2 shape', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await api('get', `/v2/projects/${projectId}/themes`, token);
    expect(res.status).toBe(200);
    const ids = res.body.results.map((t: { id: string }) => t.id);
    expect(ids).toEqual(expect.arrayContaining([themeId, defaultThemeId]));
    expect(res.body.results).toContainEqual(
      expect.objectContaining({ id: defaultThemeId, object: 'theme', isDefault: true }),
    );
    expect(res.body).toMatchObject({ next: null, previous: null });
  });

  it('gets a theme by id', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await api('get', `/v2/projects/${projectId}/themes/${themeId}`, token);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: themeId, object: 'theme', name: 'Brand' });
  });

  it('returns 404 for an unknown theme (E1021)', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await api('get', `/v2/projects/${projectId}/themes/nope`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1021');
  });

  it('rejects listing themes without theme:read (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/themes`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('writes themeId on a draft version and reads it back', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const w = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({ themeId });
    expect(w.status).toBe(200);
    expect(w.body.themeId).toBe(themeId);

    const r = await api(
      'get',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    );
    expect(r.body.themeId).toBe(themeId);
  });

  it('clears themeId with null', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    // ensure set first
    await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      themeId,
    });
    const w = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({ themeId: null });
    expect(w.status).toBe(200);
    expect(w.body.themeId).toBeNull();
  });

  it('rejects writing an unknown themeId (404 E1021)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({ themeId: 'does-not-exist' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1021');
  });

  const basePath = () => `/v2/projects/${projectId}/themes`;
  const send = (method: 'post' | 'patch' | 'delete', path: string, token: string) =>
    request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);

  it('creates a theme with settings + variations, echoed in the response', async () => {
    const token = await mint([Capability.ThemeCreate, Capability.ThemeRead]);
    const res = await send('post', basePath(), token).send({
      name: 'Created',
      settings: { primaryColor: '#112233' },
      // condition id<->code fidelity is covered by the rules codec specs; here we
      // just verify the variation is wired through (id generated, settings kept).
      variations: [{ name: 'Mobile', conditions: [], settings: { primaryColor: '#000' } }],
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      object: 'theme',
      name: 'Created',
      settings: { primaryColor: '#112233' },
    });
    expect(res.body.variations).toHaveLength(1);
    expect(res.body.variations[0]).toMatchObject({
      name: 'Mobile',
      settings: { primaryColor: '#000' },
      conditions: [],
    });
    expect(res.body.variations[0].id).toBeTruthy(); // server-generated
  });

  it('omits settings/variations without expand, includes them with expand', async () => {
    const token = await mint([Capability.ThemeRead]);
    const bare = await api('get', `${basePath()}/${themeId}`, token);
    expect(bare.body.settings).toBeUndefined();
    expect(bare.body.variations).toBeUndefined();

    const expanded = await api(
      'get',
      `${basePath()}/${themeId}?expand=settings&expand=variations`,
      token,
    );
    expect(expanded.body).toHaveProperty('settings');
    expect(expanded.body).toHaveProperty('variations');
  });

  it('updates name + settings (partial)', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeUpdate,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({
      name: 'ToEdit',
      settings: { a: 1 },
    });
    const id = created.body.id;
    const upd = await send('patch', `${basePath()}/${id}`, token).send({
      name: 'Edited',
      settings: { a: 2, b: 3 },
    });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ name: 'Edited', settings: { a: 2, b: 3 } });
  });

  it('deletes a theme (204), then it is gone (404)', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeDelete,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({ name: 'ToDelete', settings: {} });
    const id = created.body.id;
    expect((await send('delete', `${basePath()}/${id}`, token).send()).status).toBe(204);
    expect((await api('get', `${basePath()}/${id}`, token)).status).toBe(404);
  });

  it('cannot delete the default theme (400 E1017)', async () => {
    const token = await mint([Capability.ThemeDelete]);
    const res = await send('delete', `${basePath()}/${defaultThemeId}`, token).send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('POST rejects a token without theme:create (403 E1012)', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await send('post', basePath(), token).send({ name: 'x', settings: {} });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
