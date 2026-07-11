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

  it('paginates with limit (next cursor set when more remain)', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await api('get', `/v2/projects/${projectId}/themes?limit=1`, token);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    // at least Default + Brand exist, so a second page is available
    expect(res.body.next).toEqual(expect.stringContaining('cursor='));
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

  it('rejects clearing themeId with null (400) — a theme is required to render', async () => {
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
    expect(w.status).toBe(400);
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

  it('creates a theme, applying a partial settings patch onto the default styling', async () => {
    const token = await mint([Capability.ThemeCreate, Capability.ThemeRead]);
    const res = await send('post', basePath(), token).send({
      name: 'Created',
      settings: { font: { fontSize: 18 }, brandColor: { background: '#ff0000' } },
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ object: 'theme', name: 'Created' });
    // patch applied
    expect(res.body.settings.font.fontSize).toBe(18);
    expect(res.body.settings.brandColor.background).toBe('#ff0000');
    // untouched default fields preserved; auto colors derived from the new base
    expect(res.body.settings.font.lineHeight).toBeTruthy();
    expect(res.body.settings.brandColor.autoHover).toBeTruthy();
    expect(res.body.variations).toEqual([]);
  });

  it('rejects a settings patch with an unknown path (strict)', async () => {
    const token = await mint([Capability.ThemeCreate]);
    const res = await send('post', basePath(), token).send({
      name: 'Bad',
      settings: { primaryColor: '#112233' },
    });
    expect(res.status).toBe(400);
  });

  it('rejects a settings value outside the field range', async () => {
    const token = await mint([Capability.ThemeCreate]);
    const res = await send('post', basePath(), token).send({
      name: 'Bad range',
      settings: { font: { fontSize: 999 } },
    });
    expect(res.status).toBe(400);
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

  it('updates theme metadata (name / isDefault) — the default flag actually MOVES', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeUpdate,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({ name: 'ToEdit' });
    const id = created.body.id;
    const upd = await send('patch', `${basePath()}/${id}`, token).send({ name: 'Edited' });
    expect(upd.status).toBe(200);
    expect(upd.body).toMatchObject({ name: 'Edited' });

    // isDefault used to be silently destructured away by the domain update —
    // 200 with the flag unchanged. It must move the project default now.
    const flip = await send('patch', `${basePath()}/${id}`, token).send({ isDefault: true });
    expect(flip.status).toBe(200);
    expect(flip.body.isDefault).toBe(true);
    const defaults = await prisma.theme.findMany({ where: { projectId, isDefault: true } });
    expect(defaults.map((t) => t.id)).toEqual([id]); // exactly one default, the new one

    // Unsetting the default is refused — a project keeps a default theme; the
    // way to change it is defaulting ANOTHER theme.
    const unset = await send('patch', `${basePath()}/${id}`, token).send({ isDefault: false });
    expect(unset.status).toBe(400);

    // isDefault:false on a NON-default theme is a harmless no-op.
    const noop = await send('patch', `${basePath()}/${themeId}`, token).send({ isDefault: false });
    expect(noop.status).toBe(200);
    expect(noop.body.isDefault).toBe(false);

    // restore the suite fixture as the project default
    const restore = await send('patch', `${basePath()}/${defaultThemeId}`, token).send({
      isDefault: true,
    });
    expect(restore.status).toBe(200);
    const after = await prisma.theme.findFirst({ where: { id } });
    expect(after?.isDefault).toBe(false);
  });

  it('patches a legacy theme whose stored settings lack nested fields (grounded on defaults, no 500)', async () => {
    const token = await mint([Capability.ThemeUpdate, Capability.ThemeRead]);
    // A stored blob predating most nested fields (no buttons.*, no mainColor):
    // deriveThemeAutoColors dereferences e.g. buttons.primary.border.color.color,
    // so a merge NOT grounded on defaultSettings throws and the PATCH 500s.
    const legacy = await buildTheme(prisma, {
      projectId,
      name: 'Legacy partial',
      settings: { brandColor: { background: '#123456', color: '#ffffff' } } as never,
    });
    const res = await send('patch', `${basePath()}/${legacy.id}`, token).send({
      settings: { font: { fontSize: 20 } },
    });
    expect(res.status).toBe(200);
    // patch applied; stored value kept; missing nested fields filled from defaults
    expect(res.body.settings.font.fontSize).toBe(20);
    expect(res.body.settings.brandColor.background).toBe('#123456');
    expect(res.body.settings.buttons.primary.backgroundColor).toBeTruthy();
    expect(res.body.settings.brandColor.autoHover).toBeTruthy();
  });

  it('updates theme settings (field-merged) and reads them back', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeUpdate,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({
      name: 'ToStyle',
      settings: { brandColor: { background: '#112233' } },
    });
    const id = created.body.id;

    const upd = await send('patch', `${basePath()}/${id}`, token).send({
      settings: { modal: { width: 480 } },
    });
    expect(upd.status).toBe(200);

    const read = await api('get', `${basePath()}/${id}?expand=settings`, token);
    // the second patch merged onto the first — both survive
    expect(read.body.settings.modal.width).toBe(480);
    expect(read.body.settings.brandColor.background).toBe('#112233');
  });

  it('deletes a theme (204), then it is gone (404)', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeDelete,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({ name: 'ToDelete' });
    const id = created.body.id;
    expect((await send('delete', `${basePath()}/${id}`, token).send()).status).toBe(204);
    expect((await api('get', `${basePath()}/${id}`, token)).status).toBe(404);
  });

  it('cannot delete a theme used by a draft or live version (409 E1031); deletable once unreferenced', async () => {
    const token = await mint([
      Capability.ThemeCreate,
      Capability.ThemeDelete,
      Capability.ThemeRead,
    ]);
    const created = await send('post', basePath(), token).send({ name: 'InUse' });
    const inUseThemeId = created.body.id;

    // a fresh content whose current DRAFT references the theme (buildVersion also
    // links the version as Content.editedVersionId)
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const content = await buildContent(prisma, {
      projectId,
      environmentId,
      type: 'flow',
      name: 'Uses InUse Theme',
    });
    const draft = await buildVersion(prisma, {
      contentId: content.id,
      sequence: 0,
      themeId: inUseThemeId,
    });

    const blocked = await send('delete', `${basePath()}/${inUseThemeId}`, token).send();
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('E1031');
    expect(blocked.body.error.message).toContain(content.name);

    // live-published reference blocks too, even after the draft moves off the theme
    await prisma.contentOnEnvironment.create({
      data: {
        environmentId,
        contentId: content.id,
        published: true,
        publishedVersionId: draft.id,
      },
    });
    await buildVersion(prisma, {
      contentId: content.id,
      sequence: 1,
      themeId: defaultThemeId,
    });
    const stillBlocked = await send('delete', `${basePath()}/${inUseThemeId}`, token).send();
    expect(stillBlocked.status).toBe(409);
    expect(stillBlocked.body.error.code).toBe('E1031');

    // unpublish -> only the HISTORICAL version still references it; that doesn't block
    await prisma.contentOnEnvironment.deleteMany({ where: { contentId: content.id } });
    const freed = await send('delete', `${basePath()}/${inUseThemeId}`, token).send();
    expect(freed.status).toBe(204);
  });

  it('cannot delete the default theme (400 E1017)', async () => {
    const token = await mint([Capability.ThemeDelete]);
    const res = await send('delete', `${basePath()}/${defaultThemeId}`, token).send();
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('E1017');
  });

  it('POST rejects a token without theme:create (403 E1012)', async () => {
    const token = await mint([Capability.ThemeRead]);
    const res = await send('post', basePath(), token).send({ name: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });
});
