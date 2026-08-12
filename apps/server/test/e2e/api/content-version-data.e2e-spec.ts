import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Contract test for the non-flow content types whose authorable body lives in
 * `version.data` (not `steps`): write via PATCH content-versions/:id `data`,
 * read via GET ?expand=data. One version is one content type, so `data` is that
 * type's shape. Covers the write → independent-read round-trip per type.
 */
type Ver = { contentId: string; id: string };

describe('API v2 version.data codec (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let eventCode: string;
  let tracker: Ver;
  let checklist: Ver;
  let launcher: Ver;
  let banner: Ver;
  let rc: Ver;
  let announcement: Ver;

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

  async function newVersion(type: string): Promise<Ver> {
    const content = await buildContent(prisma, { projectId, environmentId, type });
    const id = (await buildVersion(prisma, { contentId: content.id, sequence: 0 })).id;
    return { contentId: content.id, id };
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectId = (await buildProject(prisma, { name: 'api-v2-version-data' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    eventCode = (await buildEvent(prisma, { projectId, codeName: 'evt_signup' })).codeName;
    tracker = await newVersion('tracker');
    checklist = await newVersion('checklist');
    launcher = await newVersion('launcher');
    banner = await newVersion('banner');
    rc = await newVersion('resource-center');
    announcement = await newVersion('announcement');
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

  const write = (v: Ver, body: object, token: string) =>
    api('patch', `/v2/projects/${projectId}/content/${v.contentId}/versions/${v.id}`, token).send(
      body,
    );
  const readData = (v: Ver, token: string) =>
    api(
      'get',
      `/v2/projects/${projectId}/content/${v.contentId}/versions/${v.id}?expand=data`,
      token,
    );

  describe('tracker', () => {
    it('round-trips the tracked event (write data → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(tracker, { data: { event: eventCode } }, token);
      expect(w.status).toBe(200);

      const r = await readData(tracker, token);
      expect(r.status).toBe(200);
      expect(r.body.data).toEqual({ event: eventCode });
    });

    it('clears the tracked event with null', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write(tracker, { data: { event: eventCode } }, token);
      const w = await write(tracker, { data: { event: null } }, token);
      expect(w.status).toBe(200);

      const r = await readData(tracker, token);
      expect(r.body.data).toEqual({ event: null });
    });

    it('omits data without the expand', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write(tracker, { data: { event: eventCode } }, token);
      const r = await api(
        'get',
        `/v2/projects/${projectId}/content/${tracker.contentId}/versions/${tracker.id}`,
        token,
      );
      expect(r.body.data).toBeUndefined();
    });

    it('rejects a malformed data body (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // `event` must be string|null; a number is invalid.
      const res = await write(tracker, { data: { event: 42 } }, token);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });

    it('rejects a server-side condition in a tracker start rule (400 E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // A tracker fires client-side, so (matching the builder's tracker editor) its
      // start conditions can't be server-side event / segment / flow-state.
      const evt = await write(
        tracker,
        { startRules: { when: [{ type: 'event', event: 'x' }] } },
        token,
      );
      expect(evt.status).toBe(400);
      expect(evt.body.error.code).toBe('E1017');

      // a client-evaluable element condition is fine.
      const ok = await write(
        tracker,
        {
          startRules: { when: [{ type: 'element', state: 'present', target: { selector: '#x' } }] },
        },
        token,
      );
      expect(ok.status).toBe(200);
    });

    it('rejects a data write without the update scope (403 E1012)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await write(tracker, { data: { event: eventCode } }, token);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1012');
    });
  });

  describe('checklist', () => {
    const payload = {
      data: {
        buttonText: 'Get started',
        initialDisplay: 'expanded',
        completionOrder: 'ordered',
        preventDismiss: true,
        autoDismiss: false,
        content: [{ type: 'text', markdown: 'Welcome' }],
        items: [
          {
            name: 'Connect your data',
            description: 'Hook up a source',
            completeWhen: [{ type: 'current_url', includes: ['/connected'] }],
            clickActions: [{ type: 'navigate', url: '/connect' }],
          },
          {
            name: 'Invite a teammate',
            onlyShowWhen: [{ type: 'current_url', includes: ['/team'] }],
            clickActions: [{ type: 'dismiss' }],
          },
        ],
      },
    };

    it('round-trips the checklist body (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(checklist, payload, token);
      expect(w.status).toBe(200);

      const r = await readData(checklist, token);
      expect(r.status).toBe(200);
      const d = r.body.data;
      expect(d).toMatchObject({
        buttonText: 'Get started',
        initialDisplay: 'expanded',
        completionOrder: 'ordered',
        preventDismiss: true,
        autoDismiss: false,
      });
      expect(d.content[0]).toMatchObject({ type: 'text', markdown: 'Welcome' });
      expect(d.items).toHaveLength(2);
      expect(d.items[0]).toMatchObject({
        name: 'Connect your data',
        description: 'Hook up a source',
        completeWhen: [{ type: 'current_url', includes: ['/connected'] }],
        clickActions: [{ type: 'navigate', url: '/connect' }],
      });
      expect(typeof d.items[0].id).toBe('string'); // server-assigned merge key
      expect(d.items[1]).toMatchObject({
        name: 'Invite a teammate',
        onlyShowWhen: [{ type: 'current_url', includes: ['/team'] }],
        clickActions: [{ type: 'dismiss' }],
      });
      expect(d.items[1].completeWhen).toEqual([]);
    });

    it('keeps item ids stable across a re-write that reuses them', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write(checklist, payload, token);
      const first = await readData(checklist, token);
      const id0 = first.body.data.items[0].id;

      // re-send the same first item WITH its id → must reuse, not regenerate
      const rewrite = {
        data: {
          ...payload.data,
          items: [{ id: id0, name: 'Connect your data (renamed)', clickActions: [] }],
        },
      };
      const w = await write(checklist, rewrite, token);
      expect(w.status).toBe(200);
      const r = await readData(checklist, token);
      expect(r.body.data.items).toHaveLength(1);
      expect(r.body.data.items[0].id).toBe(id0);
      expect(r.body.data.items[0].name).toBe('Connect your data (renamed)');
    });

    it('rejects run_javascript in a click action (read-only)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        checklist,
        {
          data: {
            items: [{ name: 'JS', clickActions: [{ type: 'run_javascript', script: 'alert(1)' }] }],
          },
        },
        token,
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('rejects goto_step in a non-flow action slot (no steps to navigate to)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        checklist,
        { data: { items: [{ name: 'Go', clickActions: [{ type: 'goto_step', step: 'x' }] }] } },
        token,
      );
      expect(res.status).toBe(400);
    });

    it('rejects a button hide rule that uses a server-evaluated condition', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        checklist,
        {
          data: {
            content: [
              {
                type: 'button',
                text: 'Later',
                actions: [{ type: 'dismiss' }],
                hiddenWhen: [{ type: 'segment', segment: 'seg_x', in: true }],
              },
            ],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
    });
  });

  describe('launcher', () => {
    it('round-trips the launcher body (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        launcher,
        {
          data: {
            style: 'icon',
            icon: { source: 'builtin', type: 'rocket' },
            target: { selector: '.launch-here' },
            tooltip: {
              placement: { side: 'bottom', align: 'center', sideOffset: 8 },
              width: 320,
              content: [{ type: 'text', markdown: 'Hi from the launcher' }],
              settings: {
                dismissAfterFirstActivation: true,
                keepOpenWhenHovered: false,
                hideLauncherWhenTooltipShown: true,
              },
            },
            behavior: {
              triggerElement: 'launcher',
              event: 'clicked',
              action: 'perform-action',
              actions: [{ type: 'navigate', url: '/go' }],
            },
          },
        },
        token,
      );
      expect(w.status).toBe(200);

      const d = (await readData(launcher, token)).body.data;
      expect(d).toMatchObject({ style: 'icon', icon: { source: 'builtin', type: 'rocket' } });
      expect(d.target).toEqual({ selector: '.launch-here' });
      expect(d.tooltip).toMatchObject({
        placement: { side: 'bottom', align: 'center', sideOffset: 8 },
        width: 320,
        settings: {
          dismissAfterFirstActivation: true,
          keepOpenWhenHovered: false,
          hideLauncherWhenTooltipShown: true,
        },
      });
      expect(d.tooltip.content[0]).toMatchObject({
        type: 'text',
        markdown: 'Hi from the launcher',
      });
      expect(d.behavior).toMatchObject({
        triggerElement: 'launcher',
        event: 'clicked',
        action: 'perform-action',
        actions: [{ type: 'navigate', url: '/go' }],
      });
    });
  });

  describe('banner', () => {
    it('round-trips the banner body (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        banner,
        {
          data: {
            placement: 'top-of-page',
            content: [{ type: 'text', markdown: 'We ship Friday' }],
            settings: {
              overlayOverAppContent: false,
              stickToTop: true,
              allowDismiss: true,
              animateOnAppear: false,
            },
            layout: {
              maxContentWidth: 800,
              borderRadius: 6,
              outerMargin: { top: 8, right: 8, bottom: 8, left: 8 },
            },
          },
        },
        token,
      );
      expect(w.status).toBe(200);

      const d = (await readData(banner, token)).body.data;
      expect(d).toMatchObject({
        placement: 'top-of-page',
        settings: {
          overlayOverAppContent: false,
          stickToTop: true,
          allowDismiss: true,
          animateOnAppear: false,
        },
        layout: {
          maxContentWidth: 800,
          borderRadius: 6,
          outerMargin: { top: 8, right: 8, bottom: 8, left: 8 },
        },
      });
      expect(d.content[0]).toMatchObject({ type: 'text', markdown: 'We ship Friday' });
    });

    it('rejects a data body on a flow content type (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const flow = await newVersion('flow');
      const res = await write(flow, { data: { placement: 'top-of-page' } }, token);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });

    it('rejects a fill unit on an image block (image/embed support only percent/pixels)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        banner,
        { data: { content: [{ type: 'image', url: 'https://x/i.png', width: { unit: 'fill' } }] } },
        token,
      );
      expect(res.status).toBe(400);
      // discriminatedUnion surfaces the image branch's error — not a bare "Invalid input"
      expect(res.body.error.message).toMatch(/percent|pixels|fill/i);
    });

    it('rejects an empty image url', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(banner, { data: { content: [{ type: 'image', url: '' }] } }, token);
      expect(res.status).toBe(400);
    });
  });

  describe('announcement', () => {
    it('round-trips the announcement body + scheduledAt (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        announcement,
        {
          data: {
            title: 'v2.1 released',
            introContent: [{ type: 'text', markdown: 'We shipped **dark mode**' }],
            enableReadMore: true,
            readMoreLabel: 'See details',
            detailContent: [{ type: 'text', markdown: '# Dark mode\nFull details' }],
            distribution: 'popup',
            popupConfig: { style: 'modal' },
          },
          scheduledAt: '2030-01-01T00:00:00Z',
        },
        token,
      );
      expect(w.status).toBe(200);

      const r = await readData(announcement, token);
      expect(r.status).toBe(200);
      expect(r.body.data).toMatchObject({
        title: 'v2.1 released',
        enableReadMore: true,
        readMoreLabel: 'See details',
        distribution: 'popup',
        popupConfig: { style: 'modal' },
      });
      expect(r.body.data.introContent[0]).toMatchObject({
        type: 'text',
        markdown: 'We shipped **dark mode**',
      });
      expect(r.body.scheduledAt).toBe('2030-01-01T00:00:00.000Z');
    });

    it('rejects scheduledAt on a non-announcement version (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(banner, { scheduledAt: '2030-01-01T00:00:00Z' }, token);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/announcement/i);
    });

    it('rejects question (survey) blocks in the announcement body (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        announcement,
        {
          data: {
            introContent: [{ type: 'question', question: { kind: 'nps', name: 'NPS' } }],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/question/i);
    });

    it('rejects dismiss and goto_step button actions (feed items are marked seen, not dismissed)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        announcement,
        {
          data: {
            introContent: [
              { type: 'button', text: 'Close', actions: [{ type: 'dismiss' }] },
              { type: 'button', text: 'Next', actions: [{ type: 'goto_step', step: 'x' }] },
            ],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/dismiss|goto_step/);
    });

    it('rejects a non-audience start condition (targeting is attribute/segment only)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        announcement,
        { startRules: { when: [{ type: 'current_url', includes: ['*/app'] }] } },
        token,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/current_url/);
      expect(res.body.error.message).toMatch(/attribute, segment/);
    });

    it('validate flags an untitled announcement and an empty Read-more page', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const empty = await newVersion('announcement');
      await write(
        empty,
        { data: { title: '', enableReadMore: true, detailContent: [] } },
        token,
      ).expect(200);

      const r = await api(
        'get',
        `/v2/projects/${projectId}/content/${empty.contentId}/versions/${empty.id}/validate`,
        token,
      );
      expect(r.status).toBe(200);
      expect(r.body.ok).toBe(false);
      const errorPaths = r.body.errors.map((e: { path: string }) => e.path);
      expect(errorPaths).toContain('title');
      expect(errorPaths).toContain('detailContent');
    });
  });

  describe('resource-center', () => {
    it('round-trips all six block types (write → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        rc,
        {
          data: {
            buttonText: 'Help',
            headerText: 'Resources',
            tabs: [
              {
                name: 'Getting started',
                icon: { source: 'builtin', type: 'book' },
                blocks: [
                  { type: 'richtext', content: [{ type: 'text', markdown: 'Welcome aboard' }] },
                  { type: 'divider' },
                  {
                    type: 'action',
                    name: 'Contact us',
                    icon: { source: 'builtin', type: 'mail' },
                    clickActions: [{ type: 'navigate', url: '/contact' }],
                    onlyShowWhen: [{ type: 'current_url', includes: ['/app'] }],
                  },
                  {
                    type: 'sub-page',
                    name: 'Guides',
                    content: [{ type: 'text', markdown: 'Guide body' }],
                  },
                  {
                    type: 'content-list',
                    name: 'Tours',
                    showSearchField: true,
                    items: [{ content: 'c_abc', contentType: 'flow' }],
                  },
                  { type: 'live-chat', name: 'Chat', provider: 'intercom', customCode: '' },
                ],
              },
            ],
          },
        },
        token,
      );
      expect(w.status).toBe(200);

      const d = (await readData(rc, token)).body.data;
      expect(d).toMatchObject({ buttonText: 'Help', headerText: 'Resources' });
      expect(d.tabs).toHaveLength(1);
      const tab = d.tabs[0];
      expect(tab).toMatchObject({
        name: 'Getting started',
        icon: { source: 'builtin', type: 'book' },
      });
      expect(typeof tab.id).toBe('string');

      const byType = Object.fromEntries(tab.blocks.map((b: { type: string }) => [b.type, b]));
      expect(byType.richtext.content[0]).toMatchObject({
        type: 'text',
        markdown: 'Welcome aboard',
      });
      expect(byType.divider).toBeDefined();
      expect(byType.action).toMatchObject({
        name: 'Contact us',
        icon: { source: 'builtin', type: 'mail' },
        clickActions: [{ type: 'navigate', url: '/contact' }],
        onlyShowWhen: [{ type: 'current_url', includes: ['/app'] }],
      });
      expect(byType['sub-page'].content[0]).toMatchObject({ type: 'text', markdown: 'Guide body' });
      expect(byType['content-list']).toMatchObject({
        name: 'Tours',
        showSearchField: true,
        items: [{ content: 'c_abc', contentType: 'flow' }],
      });
      expect(byType['live-chat']).toMatchObject({ name: 'Chat', provider: 'intercom' });
      // every block carries a server-assigned id (merge key)
      for (const b of tab.blocks) expect(typeof b.id).toBe('string');
    });

    it('rejects an invalid live-chat provider (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        rc,
        {
          data: {
            tabs: [{ name: 'T', blocks: [{ type: 'live-chat', name: 'x', provider: 'nope' }] }],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });

    it('rejects a dismiss action (a resource center has no dismiss handler)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        rc,
        {
          data: {
            tabs: [
              {
                name: 'T',
                blocks: [{ type: 'action', name: 'Close', clickActions: [{ type: 'dismiss' }] }],
              },
            ],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
    });

    it('rejects a content-list item that targets a non-flow/checklist (400)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // content-list items link to a flow/checklist; the item's `contentType` label is schema-
      // limited to flow/checklist, but `content` (the id) could still point at a banner.
      const bannerContent = await buildContent(prisma, { projectId, type: 'banner' });
      const res = await write(
        rc,
        {
          data: {
            tabs: [
              {
                name: 'T',
                blocks: [
                  {
                    type: 'content-list',
                    name: 'Tours',
                    items: [{ content: bannerContent.id, contentType: 'flow' }],
                  },
                ],
              },
            ],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
    });

    it('round-trips an announcement block (the feed entry)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(
        rc,
        {
          data: {
            tabs: [
              {
                name: 'News',
                blocks: [
                  {
                    type: 'announcement',
                    name: "What's new",
                    icon: { source: 'builtin', type: 'notification-line' },
                  },
                ],
              },
            ],
          },
        },
        token,
      );
      expect(w.status).toBe(200);

      const d = (await readData(rc, token)).body.data;
      expect(d.tabs[0].blocks[0]).toMatchObject({
        type: 'announcement',
        name: "What's new",
        icon: { source: 'builtin', type: 'notification-line' },
      });
    });

    it('rejects a second announcement block across tabs (announcement state is global)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        rc,
        {
          data: {
            tabs: [
              { name: 'A', blocks: [{ type: 'announcement', name: 'News' }] },
              { name: 'B', blocks: [{ type: 'announcement', name: 'More' }] },
            ],
          },
        },
        token,
      );
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
      expect(res.body.error.message).toMatch(/ONE announcement block/);
    });
  });
});
