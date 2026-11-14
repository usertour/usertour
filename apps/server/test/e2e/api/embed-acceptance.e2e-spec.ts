import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';
import { gqlData, graphql } from '../auth';
import { buildEnvironment, buildLocalization, buildProject, buildTheme } from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

// Real API v2 requests against the guarded test database. No development data is mutated.
describe('API v2 embed acceptance', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let otherEnvironmentId: string;
  let themeId: string;
  let ownerId: string;
  let token: string;
  let readToken: string;
  const root = () => `/v2/projects/${projectId}/content`;
  const api = (
    method: 'get' | 'post' | 'patch' | 'put' | 'delete',
    path: string,
    credential = token,
  ) => request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${credential}`);
  const path = (v: { id: string; editedVersionId: string }) =>
    `${root()}/${v.id}/versions/${v.editedVersionId}`;
  const body = () => ({
    data: {
      placement: 'top-of-container-element',
      target: { selector: '#embed' },
      allowDismiss: true,
    },
    startRules: { when: [{ type: 'current_url', includes: ['*'] }], frequency: { mode: 'once' } },
    steps: [
      {
        key: 'one',
        name: 'One',
        type: 'inline',
        content: [
          { type: 'text', markdown: 'Hello embed' },
          { type: 'button', text: 'Next', actions: [{ type: 'goto_step', step: 'two' }] },
        ],
      },
      {
        key: 'two',
        name: 'Two',
        type: 'inline',
        content: [
          { type: 'text', markdown: 'Answer here' },
          {
            type: 'question',
            question: { kind: 'text', name: 'Feedback', multiline: false, buttonText: 'Send' },
            actions: [{ type: 'dismiss' }],
          },
        ],
      },
    ],
  });
  async function create() {
    const r = await api('post', root()).send({ type: 'embed', name: 'Embed acceptance', themeId });
    expect(r.status).toBe(201);
    return r.body as { id: string; editedVersionId: string };
  }
  async function usable() {
    const c = await create();
    const r = await api('patch', path(c)).send(body());
    expect(r.status).toBe(200);
    return c;
  }
  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    projectId = (await buildProject(prisma, { name: 'embed-api-acceptance' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId, isPrimary: true })).id;
    otherEnvironmentId = (await buildEnvironment(prisma, { projectId })).id;
    themeId = (await buildTheme(prisma, { projectId })).id;
    await buildLocalization(prisma, {
      projectId,
      code: 'en-US',
      locale: 'en-US',
      name: 'English',
      isDefault: true,
    });
    await buildLocalization(prisma, { projectId, code: 'zh-CN', locale: 'zh-CN', name: 'Chinese' });
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerId = owner.user.id;
    const mint = async (scopes: Capability[]) =>
      gqlData(
        await graphql(app, {
          query: 'mutation($input: CreateApiTokenInput!){createApiToken(input:$input){token}}',
          variables: {
            input: {
              name: 'embed-acceptance',
              scopes,
              projectIds: [projectId],
              environmentIds: [environmentId],
            },
          },
          token: owner.token,
        }),
      ).createApiToken.token;
    token = await mint([
      Capability.ContentRead,
      Capability.ContentCreate,
      Capability.ContentUpdate,
      Capability.ContentDelete,
      Capability.ContentPublish,
      Capability.AnalyticsRead,
    ]);
    readToken = await mint([Capability.ContentRead]);
  }, 60000);
  afterAll(async () => {
    if (prisma && projectId) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerId } });
      await teardownProject(prisma, projectId);
      await prisma.user.deleteMany({ where: { id: ownerId } });
    }
    await app?.close();
  });

  it.each([
    'top-of-container-element',
    'bottom-of-container-element',
    'immediately-before-element',
    'immediately-after-element',
    'cover-element',
  ])('round-trips placement %s, target and dimensions', async (placement) => {
    const c = await usable();
    const data = {
      placement,
      target: { selector: '[data-embed]', nth: 1, text: 'Target' },
      allowDismiss: false,
      maxContentWidth: 500,
      zIndex: 123,
      outerMargin: { top: 3, right: 5, bottom: 7, left: 9 },
      coverAlignment: 'bottom',
    };
    expect((await api('patch', path(c)).send({ data })).status).toBe(200);
    const r = await api('get', `${path(c)}?expand=data&expand=steps`);
    expect(r.status).toBe(200);
    expect(r.body.data).toMatchObject(data);
    expect(r.body.steps).toHaveLength(2);
  });
  it.each(['once', 'multiple', 'unlimited'])(
    'round-trips %s frequency and keeps data on partial updates',
    async (mode) => {
      const c = await usable();
      const frequency =
        mode === 'once'
          ? { mode }
          : {
              mode,
              every: { duration: 3, unit: 'seconds', ...(mode === 'multiple' ? { times: 2 } : {}) },
            };
      const r = await api('patch', path(c)).send({
        startRules: { when: body().startRules.when, frequency },
      });
      expect(r.status).toBe(200);
      expect(r.body.startRules.frequency).toMatchObject(frequency);
      const read = await api('get', `${path(c)}?expand=data&expand=steps`);
      expect(read.body.data.target.selector).toBe('#embed');
      expect(read.body.steps).toHaveLength(2);
    },
  );
  it.each(['modal', 'tooltip', 'bubble'])('rejects non-embed step kind %s', async (type) => {
    const c = await create();
    const r = await api('patch', path(c)).send({
      steps: [{ name: 'Invalid', type, content: [{ type: 'text', markdown: 'Invalid' }] }],
    });
    expect(r.status).toBe(400);
  });
  it.each([
    { priority: 'high' },
    { waitSeconds: 1 },
    { startIfNotComplete: true },
    { frequency: { mode: 'once', atLeast: { duration: 1, unit: 'days' } } },
  ])('rejects unsupported start setting %j', async (knobs) => {
    const c = await create();
    const r = await api('patch', path(c)).send({
      startRules: { when: body().startRules.when, ...knobs },
    });
    expect(r.status).toBe(400);
  });
  it('rejects hide rules and step-level targets', async () => {
    const c = await usable();
    expect(
      (await api('patch', path(c)).send({ hideRules: { when: body().startRules.when } })).status,
    ).toBe(400);
    expect(
      (
        await api('patch', path(c)).send({
          // Keep this payload otherwise valid: a dangling goto_step would produce
          // 400 for the wrong reason and hide a missing target guard.
          steps: [
            {
              name: 'Inline with unsupported target',
              type: 'inline',
              target: { selector: '#target' },
              content: [{ type: 'text', markdown: 'Valid content' }],
            },
          ],
        })
      ).status,
    ).toBe(400);
  });
  it('accepts a hidden router and validates its reachable inline step', async () => {
    const c = await usable();
    const r = await api('patch', path(c)).send({
      steps: [
        {
          name: 'Router',
          type: 'hidden',
          triggers: [{ when: body().startRules.when, do: [{ type: 'goto_step', step: 'shown' }] }],
        },
        {
          key: 'shown',
          name: 'Shown',
          type: 'inline',
          content: [{ type: 'text', markdown: 'Routed' }],
        },
      ],
    });
    expect(r.status).toBe(200);
    expect((await api('get', `${path(c)}/validate`)).body.ok).toBe(true);
  });
  it('missing target or empty steps cannot be published', async () => {
    const c = await create();
    const v = await api('get', `${path(c)}/validate`);
    expect(v.body.ok).toBe(false);
    const r = await api('post', `${root()}/${c.id}/publish`).send({
      versionId: c.editedVersionId,
      environmentId,
    });
    expect(r.status).toBe(422);
  });
  it('rejects two questions in one step and fresh JavaScript actions', async () => {
    const c = await usable();
    const question = body().steps[1].content[1];
    expect(
      (
        await api('patch', path(c)).send({
          steps: [{ name: 'Two questions', type: 'inline', content: [question, question] }],
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api('patch', path(c)).send({
          steps: [
            {
              name: 'Script',
              type: 'inline',
              content: [
                {
                  type: 'button',
                  text: 'Run',
                  actions: [{ type: 'run_javascript', script: 'alert(1)' }],
                },
              ],
            },
          ],
        })
      ).status,
    ).toBe(400);
  });
  it.each([
    { kind: 'nps', name: 'NPS' },
    { kind: 'rating', name: 'Rating', style: 'star', range: { low: 1, high: 5 } },
    { kind: 'rating', name: 'Scale', style: 'scale', range: { low: 1, high: 5 } },
    {
      kind: 'choice',
      name: 'Single',
      options: [{ label: 'One', value: 'one' }],
      allowMultiple: false,
    },
    {
      kind: 'choice',
      name: 'Multi',
      options: [
        { label: 'One', value: 'one' },
        { label: 'Two', value: 'two' },
      ],
      allowMultiple: true,
    },
    { kind: 'text', name: 'Text', multiline: true, required: true, buttonText: 'Send' },
  ])('writes and reads question %j in an inline step', async (question) => {
    const c = await usable();
    const r = await api('patch', path(c)).send({
      steps: [
        {
          name: 'Survey',
          type: 'inline',
          content: [
            { type: 'text', markdown: 'Question?' },
            { type: 'question', question, actions: [{ type: 'dismiss' }] },
          ],
        },
      ],
    });
    expect(r.status).toBe(200);
    const read = await api('get', `${path(c)}?expand=steps&expand=questions`);
    expect(
      read.body.steps[0].content.find((b: { type: string }) => b.type === 'question').question,
    ).toMatchObject(question);
    expect((await api('get', `${path(c)}/validate`)).body.ok).toBe(true);
  });
  it('enforces read-only token, version ownership and environment allowlist', async () => {
    const c = await usable();
    const another = await create();
    expect((await api('post', root(), readToken).send({ type: 'embed', themeId })).status).toBe(
      403,
    );
    expect(
      (await api('patch', path(c), readToken).send({ data: { allowDismiss: false } })).status,
    ).toBe(403);
    expect((await api('get', `${root()}/${another.id}/versions/${c.editedVersionId}`)).status).toBe(
      404,
    );
    expect(
      (
        await api('post', `${root()}/${c.id}/publish`).send({
          versionId: c.editedVersionId,
          environmentId: otherEnvironmentId,
        })
      ).status,
    ).toBe(403);
  });
  it('translation units cover text, buttons, question and destinations; unknown path is atomic', async () => {
    const c = await usable();
    const r = await api('patch', path(c)).send({
      steps: [
        {
          name: 'Localized',
          type: 'inline',
          content: [
            { type: 'text', markdown: 'Hello [guide](/en)' },
            { type: 'button', text: 'Visit', actions: [{ type: 'navigate', url: '/en' }] },
            {
              type: 'question',
              question: {
                kind: 'text',
                name: 'Feedback',
                multiline: false,
                placeholder: 'Type here',
                buttonText: 'Submit',
              },
            },
          ],
        },
      ],
    });
    expect(r.status).toBe(200);
    const url = `${path(c)}/localizations/zh-CN`;
    const units = (await api('get', url)).body.units;
    expect(units.some((u: any) => u.kind === 'destination')).toBe(true);
    for (const source of ['Visit', 'Type here', 'Submit'])
      expect(units.some((u: any) => u.source === source)).toBe(true);
    const translations = Object.fromEntries(
      units.map((u: any) => [u.path, u.kind === 'destination' ? '/zh' : `中文 ${u.source}`]),
    );
    const saved = await api('put', url).send({ enabled: true, translations });
    expect(saved.status).toBe(200);
    expect(saved.body.stats.missing).toBe(0);
    const bad = await api('put', url).send({
      translations: { [units[0].path]: 'Should not save', invalid: 'Unknown' },
    });
    expect(bad.status).toBe(400);
    expect((await api('get', url)).body.units[0].translation).toBe(translations[units[0].path]);
    expect((await api('put', url).send({ enabled: false })).body.enabled).toBe(false);
    expect((await api('get', url)).body.units[0].translation).toBe(translations[units[0].path]);
  });
  it('marks embed translations outdated after source text edits and preserves them on duplication', async () => {
    const c = await usable();
    const url = `${path(c)}/localizations/zh-CN`;
    const units = (await api('get', url)).body.units;
    const source = units.find((u: { source: string }) => u.source === 'Hello embed');
    expect(source).toBeDefined();
    expect(
      (
        await api('put', url).send({
          enabled: true,
          translations: { [source.path]: '嵌入卡片你好' },
        })
      ).status,
    ).toBe(200);
    const read = (await api('get', `${path(c)}?expand=steps`)).body;
    const steps = read.steps.map(
      (s: {
        cvid: string;
        name: string;
        type: string;
        content: Array<Record<string, unknown>>;
      }) => ({ cvid: s.cvid, name: s.name, type: s.type, content: s.content }),
    );
    steps[0].content[0].markdown = 'Hello changed embed';
    expect((await api('patch', path(c)).send({ steps })).status).toBe(200);
    const drifted = (await api('get', url)).body;
    expect(drifted.units.find((u: { path: string }) => u.path === source.path)).toMatchObject({
      source: 'Hello changed embed',
      translation: '嵌入卡片你好',
      outdated: true,
    });
    expect(
      (await api('put', url).send({ translations: { [source.path]: '更新后的嵌入卡片' } })).body
        .stats.outdated,
    ).toBe(0);
    const duplicated = await api('post', `${root()}/${c.id}/duplicate`).send({
      name: 'Duplicate embed translation',
    });
    expect(duplicated.status).toBe(201);
    const translated = await api('get', `${path(duplicated.body)}/localizations/zh-CN`);
    expect(translated.status).toBe(200);
    expect(translated.body.enabled).toBe(true);
    expect(
      translated.body.units.some(
        (u: { translation: string }) => u.translation === '更新后的嵌入卡片',
      ),
    ).toBe(true);
  });

  it('publish → freeze → fork preserves identities/translations → republish → unpublish → delete/restore', async () => {
    const c = await usable();
    const before = (await api('get', `${path(c)}?expand=steps`)).body;
    const loc = `${path(c)}/localizations/zh-CN`;
    const units = (await api('get', loc)).body.units;
    expect(
      (
        await api('put', loc).send({
          enabled: true,
          translations: Object.fromEntries(units.map((u: any) => [u.path, `中文 ${u.source}`])),
        })
      ).status,
    ).toBe(200);
    const publish = () =>
      api('post', `${root()}/${c.id}/publish`).send({
        versionId: c.editedVersionId,
        environmentId,
      });
    expect((await publish()).status).toBe(200);
    expect((await publish()).status).toBe(200);
    expect((await api('patch', path(c)).send({ data: { allowDismiss: false } })).status).toBe(409);
    expect((await api('put', loc).send({ enabled: false })).status).toBe(409);
    expect((await api('delete', `${root()}/${c.id}`)).status).toBe(409);
    const fork = await api('post', `${root()}/${c.id}/versions`).send({});
    expect(fork.status).toBe(201);
    c.editedVersionId = fork.body.id;
    const next = (await api('get', `${path(c)}?expand=steps&expand=localizations`)).body;
    expect(next.steps.map((s: any) => s.cvid)).toEqual(before.steps.map((s: any) => s.cvid));
    expect(next.steps[0].content[1].cvid).toBe(before.steps[0].content[1].cvid);
    expect(next.localizations[0]).toMatchObject({ enabled: true, missing: 0 });
    expect(
      (await api('patch', path(c)).send({ data: { placement: 'cover-element' } })).status,
    ).toBe(200);
    expect((await publish()).status).toBe(200);
    const analytics = await api(
      'get',
      `${root()}/${c.id}/analytics?environmentId=${environmentId}`,
    );
    expect(analytics.status).toBe(200);
    expect(analytics.body.contentType).toBe('embed');
    expect(analytics.body).not.toHaveProperty('completionRate');
    expect((await api('post', `${root()}/${c.id}/unpublish`).send({ environmentId })).status).toBe(
      200,
    );
    expect((await api('delete', `${root()}/${c.id}`)).status).toBe(204);
    expect((await api('post', `${root()}/${c.id}/restore`).send({})).status).toBe(200);
    expect((await api('get', `${root()}/${c.id}`)).body.environments).toEqual([]);
  });
});
