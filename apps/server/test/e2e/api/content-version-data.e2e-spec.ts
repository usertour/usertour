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
describe('API v2 version.data codec (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectId: string;
  let environmentId: string;
  let eventCode: string;
  let trackerVersionId: string;
  let checklistVersionId: string;

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

  async function newVersion(type: string): Promise<string> {
    const content = await buildContent(prisma, { projectId, environmentId, type });
    return (await buildVersion(prisma, { contentId: content.id, sequence: 0 })).id;
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
    trackerVersionId = await newVersion('tracker');
    checklistVersionId = await newVersion('checklist');
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

  const write = (versionId: string, body: object, token: string) =>
    api('patch', `/v2/projects/${projectId}/content-versions/${versionId}`, token).send(body);
  const readData = (versionId: string, token: string) =>
    api('get', `/v2/projects/${projectId}/content-versions/${versionId}?expand=data`, token);

  describe('tracker', () => {
    it('round-trips the tracked event (write data → independent read)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const w = await write(trackerVersionId, { data: { event: eventCode } }, token);
      expect(w.status).toBe(200);

      const r = await readData(trackerVersionId, token);
      expect(r.status).toBe(200);
      expect(r.body.data).toEqual({ event: eventCode });
    });

    it('clears the tracked event with null', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write(trackerVersionId, { data: { event: eventCode } }, token);
      const w = await write(trackerVersionId, { data: { event: null } }, token);
      expect(w.status).toBe(200);

      const r = await readData(trackerVersionId, token);
      expect(r.body.data).toEqual({ event: null });
    });

    it('omits data without the expand', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      await write(trackerVersionId, { data: { event: eventCode } }, token);
      const r = await api(
        'get',
        `/v2/projects/${projectId}/content-versions/${trackerVersionId}`,
        token,
      );
      expect(r.body.data).toBeUndefined();
    });

    it('rejects a malformed data body (E1017)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      // `event` must be string|null; a number is invalid.
      const res = await write(trackerVersionId, { data: { event: 42 } }, token);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('E1017');
    });

    it('rejects a data write without the update scope (403 E1012)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await write(trackerVersionId, { data: { event: eventCode } }, token);
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
      const w = await write(checklistVersionId, payload, token);
      expect(w.status).toBe(200);

      const r = await readData(checklistVersionId, token);
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
      await write(checklistVersionId, payload, token);
      const first = await readData(checklistVersionId, token);
      const id0 = first.body.data.items[0].id;

      // re-send the same first item WITH its id → must reuse, not regenerate
      const rewrite = {
        data: {
          ...payload.data,
          items: [{ id: id0, name: 'Connect your data (renamed)', clickActions: [] }],
        },
      };
      const w = await write(checklistVersionId, rewrite, token);
      expect(w.status).toBe(200);
      const r = await readData(checklistVersionId, token);
      expect(r.body.data.items).toHaveLength(1);
      expect(r.body.data.items[0].id).toBe(id0);
      expect(r.body.data.items[0].name).toBe('Connect your data (renamed)');
    });

    it('rejects run_javascript in a click action (read-only)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate]);
      const res = await write(
        checklistVersionId,
        {
          data: {
            items: [{ name: 'JS', clickActions: [{ type: 'run_javascript', script: 'alert(1)' }] }],
          },
        },
        token,
      );
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });
});
