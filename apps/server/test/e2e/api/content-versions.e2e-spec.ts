import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildContent,
  buildEnvironment,
  buildProject,
  buildStep,
  buildUsableFlowVersion,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/** Contract test for the v2 content-versions endpoints (list/get + questions expand). */
describe('API v2 /content-versions (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let contentId: string;
  let versionId: string;
  let writeContentId: string;
  let writeVersionId: string;
  let configContentId: string;
  let configVersionId: string;

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

  function api(method: 'get' | 'post' | 'patch', path: string, token?: string) {
    const req = request(app.getHttpServer())[method](path);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-versions' })).id;
    const environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    const content = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    contentId = content.id;
    versionId = (
      await buildVersion(prisma, {
        contentId,
        sequence: 0,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [{ type: 'current-page', data: { includes: ['/app/*'] } }],
          autoStartRulesSetting: { frequency: { frequency: 'once' }, priority: 'medium' },
        },
      })
    ).id;
    await buildStep(prisma, {
      versionId,
      type: 'tooltip',
      name: 'Step one',
      cvid: 'cv-1',
      sequence: 0,
      trigger: [{ conditions: [], actions: [{ type: 'flow-dismis', data: {} }], wait: 0 }],
      data: [
        {
          element: { type: 'group' },
          children: [
            {
              element: { type: 'column' },
              children: [
                {
                  element: {
                    type: 'text',
                    data: [{ type: 'paragraph', children: [{ text: 'Hello' }] }],
                  },
                },
                { element: { type: 'button', data: { text: 'Next', type: 'primary' } } },
              ],
            },
          ],
        },
      ],
      target: { type: 'manual', customSelector: '.cta' },
      setting: { side: 'bottom', align: 'center', width: 320 },
    });
    await buildStep(prisma, {
      versionId,
      type: 'modal',
      name: 'Step two',
      cvid: 'cv-2',
      sequence: 1,
    });

    // A dedicated editable (draft) version for write tests, isolated from the reads.
    const writeContent = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    writeContentId = writeContent.id;
    writeVersionId = (await buildVersion(prisma, { contentId: writeContent.id, sequence: 0 })).id;

    // A separate draft used only by the version-config (start/hide rules) write tests,
    // so their config merge/clear assertions are not perturbed by the step write tests.
    const configContent = await buildContent(prisma, { projectId, environmentId, type: 'flow' });
    configContentId = configContent.id;
    configVersionId = (await buildVersion(prisma, { contentId: configContent.id, sequence: 0 })).id;
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

  it('gets a content version by id (questions null without expand)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}`,
      token,
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: versionId, object: 'contentVersion', number: 0 });
    expect(res.body.questions).toBeNull();
  });

  it('lists versions for a content', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${contentId}/versions`, token);
    expect(res.status).toBe(200);
    expect(res.body.results.map((v: { id: string }) => v.id)).toContain(versionId);
  });

  it('exposes themeId on a version (null when no theme)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}`,
      token,
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('themeId');
  });

  it('decompiles slim representation steps with expand=steps (ordered by sequence)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}?expand=steps`,
      token,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.steps)).toBe(true);
    expect(res.body.steps).toHaveLength(2);
    expect(res.body.steps[0]).toMatchObject({
      object: 'step',
      cvid: 'cv-1',
      name: 'Step one',
      type: 'tooltip',
      sequence: 0,
    });
    expect(res.body.steps[1].sequence).toBe(1);
  });

  it('decompiles step body, target, and placement (expand=steps)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}?expand=steps`,
      token,
    );
    expect(res.status).toBe(200);
    const step = res.body.steps.find((s: { cvid: string }) => s.cvid === 'cv-1');
    expect(step.target).toEqual({ selector: '.cta' });
    expect(step.placement).toMatchObject({ side: 'bottom', align: 'center' });
    expect(step.width).toBe(320);
    expect(step.content).toEqual([
      { object: 'block', type: 'text', markdown: 'Hello' },
      { object: 'block', type: 'button', text: 'Next', variant: 'primary' },
    ]);
  });

  it('decompiles version start rules from config', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}`,
      token,
    );
    expect(res.status).toBe(200);
    expect(res.body.startRules).toMatchObject({
      when: [{ type: 'current_url', includes: ['/app/*'] }],
      frequency: { mode: 'once' },
      priority: 'medium',
    });
    expect(res.body.hideRules).toBeUndefined();
  });

  it('decompiles step triggers (conditions → actions)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}?expand=steps`,
      token,
    );
    const step = res.body.steps.find((s: { cvid: string }) => s.cvid === 'cv-1');
    expect(step.triggers).toEqual([{ do: [{ type: 'dismiss' }], waitMs: 0 }]);
  });

  it('omits steps without the expand', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}`,
      token,
    );
    expect(res.body.steps).toBeUndefined();
  });

  it('returns questions as an array when expanded', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}?expand=questions`,
      token,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.questions)).toBe(true);
  });

  it('returns 404 for an unknown version (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'get',
      `/v2/projects/${projectId}/content/${contentId}/versions/nope`,
      token,
    );
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('returns 404 listing versions for an unknown content (E1004)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/nope/versions`, token);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('E1004');
  });

  it('writes steps + start rules to a draft version (PATCH)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      steps: [
        {
          name: 'Authored',
          type: 'modal',
          placement: { position: 'center' },
          content: [
            { type: 'text', markdown: '**Hello** {{ first_name | default: "there" }}' },
            { type: 'button', text: 'Got it', variant: 'primary' },
          ],
        },
      ],
      startRules: { when: [{ type: 'current_url', includes: ['/app/*'] }] },
    });
    expect(res.status).toBe(200);
    const step = res.body.steps.find((s: { name: string }) => s.name === 'Authored');
    expect(step).toMatchObject({ name: 'Authored', type: 'modal' });
    expect(typeof step.id).toBe('string'); // server-assigned step id (the write handle)
    expect(step.content).toHaveLength(2);
    expect(step.content[0]).toMatchObject({
      type: 'text',
      markdown: '**Hello** {{ first_name | default: "there" }}',
    });
    expect(step.content[1]).toMatchObject({ type: 'button', text: 'Got it', variant: 'primary' });
    expect(res.body.startRules.when[0]).toMatchObject({
      type: 'current_url',
      includes: ['/app/*'],
    });
  });

  it('rejects server-side conditions (event/segment/flow) in a step trigger or button rule (400 E1017)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const patch = (steps: unknown[]) =>
      api(
        'patch',
        `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
        token,
      ).send({ steps });

    // event condition in a step trigger — server-evaluated, won't fire a client-side
    // in-session advance (the builder omits it here) → rejected.
    const evt = await patch([
      {
        name: 'T',
        type: 'modal',
        content: [{ type: 'text', markdown: 'x' }],
        triggers: [{ when: [{ type: 'event', event: 'whatever' }], do: [{ type: 'dismiss' }] }],
      },
    ]);
    expect(evt.status).toBe(400);
    expect(evt.body.error.code).toBe('E1017');

    // segment condition in a button's hiddenWhen → rejected.
    const seg = await patch([
      {
        name: 'T',
        type: 'modal',
        content: [
          { type: 'text', markdown: 'x' },
          { type: 'button', text: 'Go', hiddenWhen: [{ type: 'segment', segment: 'x', in: true }] },
        ],
      },
    ]);
    expect(seg.status).toBe(400);
    expect(seg.body.error.code).toBe('E1017');

    // an element condition in a step trigger is client-evaluable → allowed (200).
    const ok = await patch([
      {
        name: 'T',
        type: 'modal',
        content: [{ type: 'text', markdown: 'x' }],
        triggers: [
          {
            when: [{ type: 'element', state: 'present', target: { selector: '#x' } }],
            do: [{ type: 'dismiss' }],
          },
        ],
      },
    ]);
    expect(ok.status).toBe(200);
  });

  it('wires goto_step by step key in a single write (resolves to cvids, cycle ok)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    // Two new steps that reference each other by `key` — a cycle, authored in one
    // request before either step has a cvid.
    const w = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      steps: [
        {
          key: 'welcome',
          name: 'Welcome',
          type: 'modal',
          content: [
            { type: 'text', markdown: 'Hi' },
            { type: 'button', text: 'Pricing', actions: [{ type: 'goto_step', step: 'pricing' }] },
          ],
        },
        {
          key: 'pricing',
          name: 'Pricing',
          type: 'tooltip',
          target: { selector: '.price' },
          content: [
            { type: 'text', markdown: 'Plans' },
            { type: 'button', text: 'Back', actions: [{ type: 'goto_step', step: 'welcome' }] },
          ],
        },
      ],
    });
    expect(w.status).toBe(200);

    const r = await api(
      'get',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}?expand=steps`,
      token,
    );
    type Block = { type: string; actions?: { type: string; step: string }[] };
    type StepRow = { name: string; cvid: string; content: Block[] };
    const welcome = r.body.steps.find((s: StepRow) => s.name === 'Welcome') as StepRow;
    const pricing = r.body.steps.find((s: StepRow) => s.name === 'Pricing') as StepRow;
    const gotoOf = (s: StepRow) => s.content.find((b) => b.type === 'button')?.actions?.[0];
    // keys resolved to the *other* step's real cvid, not the literal key
    expect(gotoOf(welcome)).toMatchObject({ type: 'goto_step', step: pricing.cvid });
    expect(gotoOf(pricing)).toMatchObject({ type: 'goto_step', step: welcome.cvid });
    expect(gotoOf(welcome)?.step).not.toBe('pricing');
  });

  it('rejects a goto_step to an unknown step reference (400)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      steps: [
        {
          name: 'Solo',
          type: 'modal',
          content: [{ type: 'button', text: 'Go', actions: [{ type: 'goto_step', step: 'nope' }] }],
        },
      ],
    });
    expect(res.status).toBe(400);
  });

  it('rejects duplicate step keys in one write (400)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      steps: [
        { key: 'dup', name: 'A', type: 'modal', content: [{ type: 'text', markdown: 'a' }] },
        { key: 'dup', name: 'B', type: 'modal', content: [{ type: 'text', markdown: 'b' }] },
      ],
    });
    expect(res.status).toBe(400);
  });

  it('round-trips a rich version: write → INDEPENDENT read is consistent', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const payload = {
      steps: [
        {
          name: 'Tour step',
          type: 'tooltip',
          target: { selector: '.start-btn' },
          placement: { side: 'bottom', align: 'center' },
          width: 360,
          content: [
            {
              type: 'text',
              markdown: '## Welcome {{ first_name | default: "there" }}\n\nLet us begin.',
            },
            {
              type: 'button',
              text: 'Dismiss',
              variant: 'secondary',
              actions: [{ type: 'dismiss' }],
            },
            {
              type: 'question',
              question: {
                kind: 'choice',
                name: 'Role',
                allowMultiple: false,
                options: [
                  { label: 'Dev', value: 'dev' },
                  { label: 'PM', value: 'pm' },
                ],
              },
            },
          ],
          triggers: [
            { when: [{ type: 'current_url', includes: ['/welcome'] }], do: [{ type: 'dismiss' }] },
          ],
        },
      ],
      startRules: {
        when: [{ type: 'segment', segment: 'seg_x', in: true }],
        frequency: { mode: 'once' },
      },
    };

    // WRITE
    const w = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send(payload);
    expect(w.status).toBe(200);

    // INDEPENDENT READ (a fresh request, re-fetched from the DB)
    const r = await api(
      'get',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}?expand=steps`,
      token,
    );
    expect(r.status).toBe(200);

    const step = r.body.steps.find((s: { name: string }) => s.name === 'Tour step');
    expect(step.target).toEqual({ selector: '.start-btn' });
    expect(step.placement).toMatchObject({ side: 'bottom', align: 'center' });
    expect(step.width).toBe(360);
    expect(step.content[0]).toMatchObject({
      type: 'text',
      markdown: '## Welcome {{ first_name | default: "there" }}\n\nLet us begin.',
    });
    expect(step.content[1]).toMatchObject({
      type: 'button',
      text: 'Dismiss',
      variant: 'secondary',
      actions: [{ type: 'dismiss' }],
    });
    expect(step.content[2]).toMatchObject({
      type: 'question',
      question: {
        kind: 'choice',
        name: 'Role',
        allowMultiple: false,
        options: [
          { label: 'Dev', value: 'dev' },
          { label: 'PM', value: 'pm' },
        ],
      },
    });
    expect(step.triggers).toEqual([
      { when: [{ type: 'current_url', includes: ['/welcome'] }], do: [{ type: 'dismiss' }] },
    ]);
    expect(r.body.startRules).toMatchObject({
      when: [{ type: 'segment', segment: 'seg_x', in: true }],
      frequency: { mode: 'once' },
    });
  });

  it('rejects writing run_javascript (read-only)', async () => {
    const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({
      steps: [
        {
          name: 'JS',
          type: 'modal',
          content: [],
          triggers: [{ do: [{ type: 'run_javascript', script: 'alert(1)' }] }],
        },
      ],
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects a write without the update scope (403 E1012)', async () => {
    const token = await mint([Capability.ContentRead]);
    const res = await api(
      'patch',
      `/v2/projects/${projectId}/content/${writeContentId}/versions/${writeVersionId}`,
      token,
    ).send({ steps: [] });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  it('rejects insufficient scope (403 E1012)', async () => {
    const token = await mint([Capability.UserRead]);
    const res = await api('get', `/v2/projects/${projectId}/content/${contentId}/versions`, token);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('E1012');
  });

  // The version config carries the start/hide rule logic (autoStartRules +
  // autoStartRulesSetting + hideRules). These exercise the full write → independent
  // read round-trip for that config, plus the partial-merge and null-clear semantics.
  describe('version config rules (write → read)', () => {
    const write = (body: object, token: string) =>
      api(
        'patch',
        `/v2/projects/${projectId}/content/${configContentId}/versions/${configVersionId}`,
        token,
      ).send(body);
    const read = (token: string) =>
      api(
        'get',
        `/v2/projects/${projectId}/content/${configContentId}/versions/${configVersionId}`,
        token,
      );

    it('round-trips hide rules (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        { hideRules: { when: [{ type: 'current_url', includes: ['/done'] }] } },
        token,
      );
      expect(w.status).toBe(200);
      expect(w.body.hideRules).toEqual({ when: [{ type: 'current_url', includes: ['/done'] }] });

      const r = await read(token);
      expect(r.status).toBe(200);
      expect(r.body.hideRules).toEqual({ when: [{ type: 'current_url', includes: ['/done'] }] });
    });

    it('round-trips the full start-rule setting (frequency + priority + waitMs + startIfNotComplete)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        {
          startRules: {
            when: [{ type: 'current_url', includes: ['/app/*'] }],
            frequency: { mode: 'multiple', every: { times: 3, duration: 7, unit: 'days' } },
            priority: 'high',
            waitMs: 5000,
            startIfNotComplete: true,
          },
        },
        token,
      );
      expect(w.status).toBe(200);

      const r = await read(token);
      expect(r.body.startRules).toEqual({
        when: [{ type: 'current_url', includes: ['/app/*'] }],
        frequency: { mode: 'multiple', every: { times: 3, duration: 7, unit: 'days' } },
        priority: 'high',
        waitMs: 5000,
        startIfNotComplete: true,
      });
    });

    it('defaults `every` (window only, no times) for an unlimited frequency authored without it', async () => {
      // A bare `{ mode: 'unlimited' }` must still compile to an `every` WINDOW
      // (duration/unit) so the builder picker + SDK have one — but NOT a `times`
      // count cap: `times` is meaningless for "every time" and only `multiple`
      // reads it (see compileStartRules / rules.compile.spec).
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write({ startRules: { when: [], frequency: { mode: 'unlimited' } } }, token);
      const r = await read(token);
      expect(r.body.startRules.frequency.mode).toBe('unlimited');
      expect(r.body.startRules.frequency.every).toMatchObject({
        duration: expect.any(Number),
        unit: expect.any(String),
      });
      expect(r.body.startRules.frequency.every.times).toBeUndefined();
    });

    it('merges: writing one rule preserves the other', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // set start only
      await write({ startRules: { when: [{ type: 'current_url', includes: ['/a'] }] } }, token);
      // then set hide only — must NOT clobber the start rule written above
      await write({ hideRules: { when: [{ type: 'current_url', includes: ['/b'] }] } }, token);

      const r = await read(token);
      expect(r.body.startRules).toMatchObject({
        when: [{ type: 'current_url', includes: ['/a'] }],
      });
      expect(r.body.hideRules).toEqual({ when: [{ type: 'current_url', includes: ['/b'] }] });
    });

    it('clears a rule with null, leaving the other intact', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // establish both
      await write(
        {
          startRules: { when: [{ type: 'current_url', includes: ['/a'] }] },
          hideRules: { when: [{ type: 'current_url', includes: ['/b'] }] },
        },
        token,
      );
      // clear start only
      const w = await write({ startRules: null }, token);
      expect(w.status).toBe(200);

      const r = await read(token);
      expect(r.body.startRules).toBeUndefined();
      expect(r.body.hideRules).toEqual({ when: [{ type: 'current_url', includes: ['/b'] }] });
    });
  });

  // POST .../content/:contentId/versions forks the content's edited version into a new draft.
  describe('create draft version (POST)', () => {
    it('forks the edited version into a new draft (201, copies steps)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/${contentId}/versions`,
        token,
      ).send({});
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ object: 'contentVersion' });
      expect(res.body.id).not.toBe(versionId); // a new version, not the source

      // the fork carries the source version's steps (cv-1, cv-2)
      const read = await api(
        'get',
        `/v2/projects/${projectId}/content/${contentId}/versions/${res.body.id}?expand=steps`,
        token,
      );
      expect(read.status).toBe(200);
      expect(read.body.steps.map((s: { cvid: string }) => s.cvid).sort()).toEqual(['cv-1', 'cv-2']);

      // the new version becomes the content's edited (head) version
      const content = await api('get', `/v2/projects/${projectId}/content/${contentId}`, token);
      expect(content.body.editedVersionId).toBe(res.body.id);
    });

    it('returns 404 forking an unknown content (E1004)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/does-not-exist/versions`,
        token,
      ).send({});
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });

    it('rejects create without the update scope (403 E1012)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/${contentId}/versions`,
        token,
      ).send({});
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1012');
    });
  });

  // cvid is a per-version internal key (DB `@@unique([versionId, cvid])`), and fork
  // copies cvids — so one content can have two versions whose steps share a cvid.
  // The public write key is the globally-unique step `id`; this pins that writing
  // a step by id only touches its own version, never the same-cvid step elsewhere.
  describe('writes are keyed by step id, not cvid (no cross-version bleed)', () => {
    const textData = (text: string) => [
      {
        element: { type: 'group' },
        children: [
          {
            element: { type: 'column' },
            children: [
              { element: { type: 'text', data: [{ type: 'paragraph', children: [{ text }] }] } },
            ],
          },
        ],
      },
    ];

    it('writing a step by id leaves a same-cvid step in another version intact', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);

      // one content, two versions, BOTH with a step cvid 'shared'
      const c = await buildContent(prisma, { projectId, type: 'flow' });
      const vA = await buildVersion(prisma, { contentId: c.id, sequence: 0 });
      const stepA = await buildStep(prisma, {
        versionId: vA.id,
        type: 'modal',
        name: 'A',
        cvid: 'shared',
        sequence: 0,
        data: textData('A original'),
      });
      // building vB last makes it the content's edited (writable) version
      const vB = await buildVersion(prisma, { contentId: c.id, sequence: 1 });
      const stepB = await buildStep(prisma, {
        versionId: vB.id,
        type: 'modal',
        name: 'B',
        cvid: 'shared',
        sequence: 0,
        data: textData('B original'),
      });

      // update vB's step by its (globally-unique) id
      const w = await api(
        'patch',
        `/v2/projects/${projectId}/content/${c.id}/versions/${vB.id}`,
        token,
      ).send({
        steps: [
          {
            id: stepB.id,
            name: 'B',
            type: 'modal',
            content: [{ type: 'text', markdown: 'B updated' }],
          },
        ],
      });
      expect(w.status).toBe(200);

      const rB = await api(
        'get',
        `/v2/projects/${projectId}/content/${c.id}/versions/${vB.id}?expand=steps`,
        token,
      );
      const rA = await api(
        'get',
        `/v2/projects/${projectId}/content/${c.id}/versions/${vA.id}?expand=steps`,
        token,
      );
      const sB = rB.body.steps.find((s: { id: string }) => s.id === stepB.id);
      const sA = rA.body.steps.find((s: { id: string }) => s.id === stepA.id);

      expect(sB.content[0]).toMatchObject({ type: 'text', markdown: 'B updated' });
      expect(sA.content[0]).toMatchObject({ type: 'text', markdown: 'A original' }); // untouched
      expect(sA.cvid).toBe(sB.cvid); // they really do share the internal cvid
      expect(sA.id).not.toBe(sB.id); // ...yet are distinct rows, targeted by id
    });
  });

  // POST content-versions/:id/restore forks a historical version forward.
  describe('restore a historical version (POST :id/restore)', () => {
    const oldStepData = [
      {
        element: { type: 'group' },
        children: [
          {
            element: { type: 'column' },
            children: [
              {
                element: {
                  type: 'text',
                  data: [{ type: 'paragraph', children: [{ text: 'historical' }] }],
                },
              },
            ],
          },
        ],
      },
    ];

    it('forks a historical version forward as the new draft', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const c = await buildContent(prisma, { projectId, type: 'flow' });
      const v0 = await buildVersion(prisma, { contentId: c.id, sequence: 0 });
      await buildStep(prisma, {
        versionId: v0.id,
        type: 'modal',
        name: 'Old step',
        cvid: 'old-1',
        sequence: 0,
        data: oldStepData,
      });
      // a newer version becomes the edited head, making v0 historical
      const v1 = await buildVersion(prisma, { contentId: c.id, sequence: 1 });

      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/${c.id}/versions/${v0.id}/restore`,
        token,
      );
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ object: 'contentVersion' });
      expect(res.body.id).not.toBe(v0.id);
      expect(res.body.id).not.toBe(v1.id);

      // the restored version carries v0's step
      const read = await api(
        'get',
        `/v2/projects/${projectId}/content/${c.id}/versions/${res.body.id}?expand=steps`,
        token,
      );
      expect(read.body.steps.map((s: { name: string }) => s.name)).toContain('Old step');

      // ...and is now the content's edited (head) version
      const content = await api('get', `/v2/projects/${projectId}/content/${c.id}`, token);
      expect(content.body.editedVersionId).toBe(res.body.id);
    });

    it('returns 404 restoring an unknown version (E1004)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/${contentId}/versions/nope/restore`,
        token,
      );
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1004');
    });

    it('rejects restore without the update scope (403 E1012)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await api(
        'post',
        `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}/restore`,
        token,
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1012');
    });
  });

  describe('validate (dry-run)', () => {
    it('reports a usable flow as ok with no errors', async () => {
      const token = await mint([Capability.ContentRead]);
      const c = await buildContent(prisma, { projectId, type: 'flow' });
      const v = await buildUsableFlowVersion(prisma, { contentId: c.id, projectId });
      const res = await api(
        'get',
        `/v2/projects/${projectId}/content/${c.id}/versions/${v.id}/validate`,
        token,
      );
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ok: true, errors: [] });
      expect(Array.isArray(res.body.warnings)).toBe(true);
    });

    it('reports errors for an unusable version (no theme) without mutating', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await api(
        'get',
        `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}/validate`,
        token,
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(false);
      expect(res.body.errors.some((e: { path: string }) => e.path === 'theme')).toBe(true);
    });

    it('rejects validate without the read scope (403 E1012)', async () => {
      const token = await mint([Capability.EventRead]);
      const res = await api(
        'get',
        `/v2/projects/${projectId}/content/${contentId}/versions/${versionId}/validate`,
        token,
      );
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1012');
    });
  });
});
