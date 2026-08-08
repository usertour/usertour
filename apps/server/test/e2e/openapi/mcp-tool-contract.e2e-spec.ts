import { INestApplication } from '@nestjs/common';
import { requiresEnvironmentScope } from '@usertour/helpers';
import { BizEvents, Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildAttribute,
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildContent,
  buildEnvironment,
  buildEvent,
  buildProject,
  buildSegment,
  buildSession,
  buildTheme,
  buildVersion,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Wrapper-layer contract cases for MCP write tools whose underlying rules the
 * REST suite already proves. What can still break HERE is the tool wrapper:
 * argument mapping (external vs internal id), environment resolution, and the
 * error text an agent gets back — so each tool gets one happy path asserting
 * the REAL database effect and one typical refusal asserting the error code
 * surfaces in the tool text. The e2e-coverage tripwire
 * (src/mcp/tools/e2e-coverage.spec.ts) points at this file; keep tool names as
 * literal strings.
 */
describe('MCP tool contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string;
  let ownerUserId: string;
  let projectA: string;
  let envA: string;
  let envB: string;

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){ token apiToken { id } }
  }`;

  async function mint(scopes: Capability[]): Promise<string> {
    const input: Record<string, unknown> = { name: 'mcp-contract', scopes, projectIds: [projectA] };
    if (requiresEnvironmentScope(scopes)) {
      input.environmentIds = [envA];
    }
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  function rpc(body: Record<string, unknown>, token: string) {
    return request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream')
      .set('Authorization', `Bearer ${token}`)
      .send(body);
  }

  function extractResult(res: { headers: Record<string, string>; body: any; text?: string }): any {
    const contentType = res.headers['content-type'] ?? '';
    if (contentType.includes('text/event-stream')) {
      const dataLine = (res.text ?? '')
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) {
        throw new Error(`No SSE data line found in response:\n${res.text}`);
      }
      return JSON.parse(dataLine.slice('data:'.length).trim());
    }
    return res.body;
  }

  // tools/call -> the `{ content, isError }` result object.
  async function callTool(name: string, args: Record<string, unknown>, token: string) {
    const res = await rpc(
      { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
      token,
    );
    const rpcResponse = extractResult(res);
    if (!rpcResponse?.result) {
      // Seen intermittently as a transport-level `{error}` envelope instead of
      // a tool result (get_session, ~1 in 4 full runs). Fail with the whole
      // envelope so the NEXT occurrence is diagnosable, instead of the bare
      // "cannot read isError of undefined" this produced.
      throw new Error(
        `MCP tools/call ${name} returned no result (status ${
          (res as { status?: number }).status
        }): ${JSON.stringify(rpcResponse ?? res.body)}`,
      );
    }
    return rpcResponse.result;
  }

  function toolText(result: any): string {
    return String(result?.content?.[0]?.text ?? '');
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectA = (await buildProject(prisma, { name: 'mcp-contract' })).id;
    envA = (await buildEnvironment(prisma, { projectId: projectA, isPrimary: true })).id;
    envB = (await buildEnvironment(prisma, { projectId: projectA })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId: projectA, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectA);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  describe('delete_user', () => {
    it('deletes by external id in the resolved environment only', async () => {
      // Same external id in BOTH environments — the token is scoped to envA, so
      // the implicit environment resolution must hit envA and leave envB alone.
      // This is the external-id + env-resolution mapping the REST suite cannot
      // cover for the MCP wrapper.
      const externalId = 'ct-user-crossenv';
      await buildBizUser(prisma, { environmentId: envA, externalId });
      await buildBizUser(prisma, { environmentId: envB, externalId });
      const token = await mint([Capability.UserDelete]);

      const result = await callTool('delete_user', { id: externalId }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });

      const rows = await prisma.bizUser.findMany({ where: { externalId } });
      expect(rows.map((r) => r.environmentId)).toEqual([envB]);
    });

    it('refuses an unknown external id with E1001', async () => {
      const token = await mint([Capability.UserDelete]);
      const result = await callTool('delete_user', { id: 'ct-user-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1001');
    });
  });

  describe('delete_company', () => {
    it('deletes by external id', async () => {
      const externalId = 'ct-co-1';
      await buildBizCompany(prisma, { environmentId: envA, externalId });
      const token = await mint([Capability.CompanyDelete]);

      const result = await callTool('delete_company', { id: externalId }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });
      expect(
        await prisma.bizCompany.findFirst({ where: { externalId, environmentId: envA } }),
      ).toBeNull();
    });

    it('refuses an unknown external id with E1002', async () => {
      const token = await mint([Capability.CompanyDelete]);
      const result = await callTool('delete_company', { id: 'ct-co-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1002');
    });
  });

  describe('delete_segment', () => {
    it('hard-deletes a manual segment by id', async () => {
      const segment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 3, // MANUAL
      });
      const token = await mint([Capability.SegmentDelete]);

      const result = await callTool('delete_segment', { id: segment.id }, token);
      expect(result.isError).toBeFalsy();
      expect(await prisma.segment.findUnique({ where: { id: segment.id } })).toBeNull();
    });

    it('refuses the built-in "all" segment with E1037', async () => {
      const builtin = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 1, // ALL
      });
      const token = await mint([Capability.SegmentDelete]);
      const result = await callTool('delete_segment', { id: builtin.id }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1037');
      expect(await prisma.segment.findUnique({ where: { id: builtin.id } })).not.toBeNull();
    });
  });

  describe('delete_theme', () => {
    it('hard-deletes an ordinary theme by id', async () => {
      const theme = await buildTheme(prisma, { projectId: projectA });
      const token = await mint([Capability.ThemeDelete]);

      const result = await callTool('delete_theme', { id: theme.id }, token);
      expect(result.isError).toBeFalsy();
      expect(await prisma.theme.findUnique({ where: { id: theme.id } })).toBeNull();
    });

    it('refuses the project default theme with E1034', async () => {
      const theme = await buildTheme(prisma, { projectId: projectA, isDefault: true });
      const token = await mint([Capability.ThemeDelete]);
      const result = await callTool('delete_theme', { id: theme.id }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1034');
    });
  });

  describe('delete_attribute_definition', () => {
    it('hard-deletes a custom attribute by id', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
      });
      const token = await mint([Capability.AttributeDelete]);

      const result = await callTool('delete_attribute_definition', { id: attribute.id }, token);
      expect(result.isError).toBeFalsy();
      expect(await prisma.attribute.findUnique({ where: { id: attribute.id } })).toBeNull();
    });

    it('refuses a predefined attribute with E1036', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
        predefined: true,
      });
      const token = await mint([Capability.AttributeDelete]);
      const result = await callTool('delete_attribute_definition', { id: attribute.id }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1036');
      expect(await prisma.attribute.findUnique({ where: { id: attribute.id } })).not.toBeNull();
    });
  });

  describe('delete_event_definition', () => {
    it('hard-deletes an unused event definition by id', async () => {
      const event = await buildEvent(prisma, { projectId: projectA });
      const token = await mint([Capability.EventDelete]);

      const result = await callTool('delete_event_definition', { id: event.id }, token);
      expect(result.isError).toBeFalsy();
      expect(await prisma.event.findUnique({ where: { id: event.id } })).toBeNull();
    });

    it('refuses a definition with recorded events with E1030', async () => {
      const event = await buildEvent(prisma, { projectId: projectA });
      const bizUser = await buildBizUser(prisma, { environmentId: envA });
      await prisma.bizEvent.create({ data: { eventId: event.id, bizUserId: bizUser.id } });
      const token = await mint([Capability.EventDelete]);

      const result = await callTool('delete_event_definition', { id: event.id }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1030');
      expect(await prisma.event.findUnique({ where: { id: event.id } })).not.toBeNull();
    });
  });

  describe('delete_session', () => {
    it('hard-deletes a session by id', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const version = await buildVersion(prisma, { contentId: content.id });
      const bizUser = await buildBizUser(prisma, { environmentId: envA });
      // BizSession carries its own environmentId and the v2 lookup scopes on it.
      const session = await buildSession(prisma, {
        bizUserId: bizUser.id,
        versionId: version.id,
        contentId: content.id,
        environmentId: envA,
      });
      const token = await mint([Capability.SessionManage]);

      const result = await callTool('delete_session', { id: session.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });
      expect(await prisma.bizSession.findUnique({ where: { id: session.id } })).toBeNull();
    });

    it('refuses an unknown session id with E1005', async () => {
      const token = await mint([Capability.SessionManage]);
      const result = await callTool('delete_session', { id: 'ct-session-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1005');
    });
  });

  // ---- Reads that were only ever presence-checked in tools/list ----

  describe('get_attribute_definition', () => {
    it('gets by id', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
      });
      const token = await mint([Capability.AttributeRead]);
      const result = await callTool('get_attribute_definition', { id: attribute.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        id: attribute.id,
        codeName: attribute.codeName,
      });
    });

    it('refuses an unknown id with E1022', async () => {
      const token = await mint([Capability.AttributeRead]);
      const result = await callTool('get_attribute_definition', { id: 'ct-attr-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1022');
    });
  });

  describe('list_attribute_definitions', () => {
    it('lists the seeded definition', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
      });
      const token = await mint([Capability.AttributeRead]);
      const result = await callTool('list_attribute_definitions', {}, token);
      expect(result.isError).toBeFalsy();
      const items = JSON.parse(toolText(result)).items as Array<{ codeName: string }>;
      expect(items.map((item) => item.codeName)).toContain(attribute.codeName);
    });

    it('refuses an unrecognized argument key', async () => {
      const token = await mint([Capability.AttributeRead]);
      const result = await callTool('list_attribute_definitions', { bogus: 1 }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toMatch(/bogus/i);
    });
  });

  describe('get_event_definition', () => {
    it('gets by id', async () => {
      const event = await buildEvent(prisma, { projectId: projectA });
      const token = await mint([Capability.EventRead]);
      const result = await callTool('get_event_definition', { id: event.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        id: event.id,
        codeName: event.codeName,
      });
    });

    it('refuses an unknown id with E1024', async () => {
      const token = await mint([Capability.EventRead]);
      const result = await callTool('get_event_definition', { id: 'ct-evt-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1024');
    });
  });

  describe('list_event_definitions', () => {
    it('lists the seeded definition', async () => {
      const event = await buildEvent(prisma, { projectId: projectA });
      const token = await mint([Capability.EventRead]);
      const result = await callTool('list_event_definitions', {}, token);
      expect(result.isError).toBeFalsy();
      const items = JSON.parse(toolText(result)).items as Array<{ codeName: string }>;
      expect(items.map((item) => item.codeName)).toContain(event.codeName);
    });

    it('refuses an unrecognized argument key', async () => {
      const token = await mint([Capability.EventRead]);
      const result = await callTool('list_event_definitions', { bogus: 1 }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toMatch(/bogus/i);
    });
  });

  describe('get_company', () => {
    it('gets by external id', async () => {
      const externalId = 'ct-co-get';
      await buildBizCompany(prisma, { environmentId: envA, externalId });
      const token = await mint([Capability.CompanyRead]);
      const result = await callTool('get_company', { id: externalId }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({ object: 'company', id: externalId });
    });

    it('refuses an unknown external id with E1002', async () => {
      const token = await mint([Capability.CompanyRead]);
      const result = await callTool('get_company', { id: 'ct-co-get-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1002');
    });
  });

  describe('get_session', () => {
    it('gets by id', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const version = await buildVersion(prisma, { contentId: content.id });
      const bizUser = await buildBizUser(prisma, { environmentId: envA });
      const session = await buildSession(prisma, {
        bizUserId: bizUser.id,
        versionId: version.id,
        contentId: content.id,
        environmentId: envA,
      });
      const token = await mint([Capability.SessionRead]);
      const result = await callTool('get_session', { id: session.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        object: 'contentSession',
        id: session.id,
      });
    });

    it('refuses an unknown id with E1005', async () => {
      const token = await mint([Capability.SessionRead]);
      const result = await callTool('get_session', { id: 'ct-get-session-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1005');
    });
  });

  // ---- Content lifecycle wrappers ----

  describe('delete_content', () => {
    it('soft-deletes unpublished content', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const token = await mint([Capability.ContentDelete]);

      const result = await callTool('delete_content', { contentId: content.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });
      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row?.deleted).toBe(true);
    });

    it('refuses while published in an environment with E1028', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const version = await buildVersion(prisma, { contentId: content.id });
      await prisma.contentOnEnvironment.create({
        data: {
          contentId: content.id,
          environmentId: envA,
          published: true,
          publishedVersionId: version.id,
        },
      });
      const token = await mint([Capability.ContentDelete]);

      const result = await callTool('delete_content', { contentId: content.id }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1028');
    });
  });

  describe('restore_content', () => {
    it('brings a soft-deleted content back as an unpublished draft', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
        deleted: true,
      });
      const token = await mint([Capability.ContentUpdate]);

      const result = await callTool('restore_content', { contentId: content.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({ id: content.id });
      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row?.deleted).toBe(false);
    });

    it('refuses an unknown content id with E1004', async () => {
      const token = await mint([Capability.ContentUpdate]);
      const result = await callTool('restore_content', { contentId: 'ct-content-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1004');
    });
  });

  describe('restore_content_version', () => {
    it('forks a historical version forward as the new draft', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const historical = await buildVersion(prisma, { contentId: content.id, sequence: 0 });
      await buildVersion(prisma, { contentId: content.id, sequence: 1 }); // becomes the head
      const token = await mint([Capability.ContentUpdate]);

      const result = await callTool(
        'restore_content_version',
        { contentId: content.id, versionId: historical.id },
        token,
      );
      expect(result.isError).toBeFalsy();
      const restored = JSON.parse(toolText(result));
      expect(restored.object).toBe('contentVersion');
      expect(restored.id).not.toBe(historical.id);
      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row?.editedVersionId).toBe(restored.id);
    });

    it('refuses an unknown version id with E1004', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const token = await mint([Capability.ContentUpdate]);
      const result = await callTool(
        'restore_content_version',
        { contentId: content.id, versionId: 'ct-version-nope' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1004');
    });
  });

  describe('update_content', () => {
    it('renames content', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
        name: 'Before rename',
      });
      const token = await mint([Capability.ContentUpdate]);

      const result = await callTool(
        'update_content',
        { contentId: content.id, name: 'Renamed by MCP' },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({ name: 'Renamed by MCP' });
      const row = await prisma.content.findUnique({ where: { id: content.id } });
      expect(row?.name).toBe('Renamed by MCP');
    });

    it('refuses a whitespace-only name', async () => {
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const token = await mint([Capability.ContentUpdate]);
      const result = await callTool(
        'update_content',
        { contentId: content.id, name: '   ' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toMatch(/validation|E1017|non-whitespace/i);
    });
  });

  // ---- Definition + theme + segment update wrappers ----

  describe('update_attribute_definition', () => {
    it('updates the display name', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
      });
      const token = await mint([Capability.AttributeUpdate]);

      const result = await callTool(
        'update_attribute_definition',
        { id: attribute.id, displayName: 'Renamed attribute' },
        token,
      );
      expect(result.isError).toBeFalsy();
      const row = await prisma.attribute.findUnique({ where: { id: attribute.id } });
      expect(row?.displayName).toBe('Renamed attribute');
    });

    it('refuses a predefined attribute with E1036', async () => {
      const attribute = await buildAttribute(prisma, {
        projectId: projectA,
        bizType: 1,
        dataType: 2,
        predefined: true,
      });
      const token = await mint([Capability.AttributeUpdate]);
      const result = await callTool(
        'update_attribute_definition',
        { id: attribute.id, displayName: 'nope' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1036');
    });
  });

  describe('update_event_definition', () => {
    it('updates the display name', async () => {
      const event = await buildEvent(prisma, { projectId: projectA });
      const token = await mint([Capability.EventUpdate]);

      const result = await callTool(
        'update_event_definition',
        { id: event.id, displayName: 'Renamed event' },
        token,
      );
      expect(result.isError).toBeFalsy();
      const row = await prisma.event.findUnique({ where: { id: event.id } });
      expect(row?.displayName).toBe('Renamed event');
    });

    it('refuses a predefined event with E1036', async () => {
      const event = await buildEvent(prisma, { projectId: projectA, predefined: true });
      const token = await mint([Capability.EventUpdate]);
      const result = await callTool(
        'update_event_definition',
        { id: event.id, displayName: 'nope' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1036');
    });
  });

  describe('create_event_definition', () => {
    it('creates a custom event definition', async () => {
      const token = await mint([Capability.EventCreate]);
      const result = await callTool(
        'create_event_definition',
        { codeName: 'ct_evt_created', displayName: 'CT Event' },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({ codeName: 'ct_evt_created' });
      expect(
        await prisma.event.findFirst({
          where: { projectId: projectA, codeName: 'ct_evt_created' },
        }),
      ).not.toBeNull();
    });

    it('refuses a duplicate codeName with E1023', async () => {
      const token = await mint([Capability.EventCreate]);
      const result = await callTool(
        'create_event_definition',
        { codeName: 'ct_evt_created', displayName: 'CT Event again' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1023');
    });
  });

  describe('update_theme', () => {
    it('renames a theme', async () => {
      const theme = await buildTheme(prisma, { projectId: projectA });
      const token = await mint([Capability.ThemeUpdate]);

      const result = await callTool('update_theme', { id: theme.id, name: 'Renamed theme' }, token);
      expect(result.isError).toBeFalsy();
      const row = await prisma.theme.findUnique({ where: { id: theme.id } });
      expect(row?.name).toBe('Renamed theme');
    });

    it('refuses a system theme with E1035', async () => {
      const theme = await buildTheme(prisma, { projectId: projectA, isSystem: true });
      const token = await mint([Capability.ThemeUpdate]);
      const result = await callTool('update_theme', { id: theme.id, name: 'nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1035');
    });
  });

  describe('update_segment', () => {
    it('renames a manual segment', async () => {
      const segment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 3,
      });
      const token = await mint([Capability.SegmentUpdate]);

      const result = await callTool(
        'update_segment',
        { id: segment.id, name: 'Renamed segment' },
        token,
      );
      expect(result.isError).toBeFalsy();
      const row = await prisma.segment.findUnique({ where: { id: segment.id } });
      expect(row?.name).toBe('Renamed segment');
    });

    it('refuses the built-in "all" segment with E1037', async () => {
      const builtin = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 1,
      });
      const token = await mint([Capability.SegmentUpdate]);
      const result = await callTool('update_segment', { id: builtin.id, name: 'nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1037');
    });
  });

  // ---- Membership wrappers (external-id mapping) ----

  describe('add_company_member', () => {
    it('adds a user to a company by external ids', async () => {
      const user = await buildBizUser(prisma, { environmentId: envA, externalId: 'ct-am-user' });
      const company = await buildBizCompany(prisma, {
        environmentId: envA,
        externalId: 'ct-am-co',
      });
      const token = await mint([Capability.CompanyWrite]);

      const result = await callTool(
        'add_company_member',
        { companyId: 'ct-am-co', userId: 'ct-am-user' },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        object: 'companyMembership',
        companyId: 'ct-am-co',
        userId: 'ct-am-user',
      });
      expect(
        await prisma.bizUserOnCompany.findFirst({
          where: { bizUserId: user.id, bizCompanyId: company.id },
        }),
      ).not.toBeNull();
    });

    it('refuses an unknown user with E1001', async () => {
      await buildBizCompany(prisma, { environmentId: envA, externalId: 'ct-am-co2' });
      const token = await mint([Capability.CompanyWrite]);
      const result = await callTool(
        'add_company_member',
        { companyId: 'ct-am-co2', userId: 'ct-am-ghost' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1001');
    });
  });

  describe('remove_company_member', () => {
    it('removes the membership for good', async () => {
      const user = await buildBizUser(prisma, { environmentId: envA, externalId: 'ct-rm-user' });
      const company = await buildBizCompany(prisma, {
        environmentId: envA,
        externalId: 'ct-rm-co',
      });
      await buildBizUserOnCompany(prisma, { bizUserId: user.id, bizCompanyId: company.id });
      const token = await mint([Capability.CompanyWrite]);

      const result = await callTool(
        'remove_company_member',
        { companyId: 'ct-rm-co', userId: 'ct-rm-user' },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });
      expect(
        await prisma.bizUserOnCompany.findFirst({
          where: { bizUserId: user.id, bizCompanyId: company.id },
        }),
      ).toBeNull();
    });

    it('refuses a repeat removal with E1003 (not idempotent)', async () => {
      const token = await mint([Capability.CompanyWrite]);
      const result = await callTool(
        'remove_company_member',
        { companyId: 'ct-rm-co', userId: 'ct-rm-user' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1003');
    });
  });

  describe('remove_segment_member', () => {
    it('removes a user from a manual segment by external id', async () => {
      const segment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 3,
      });
      const user = await buildBizUser(prisma, { environmentId: envA, externalId: 'ct-seg-user' });
      await prisma.bizUserOnSegment.create({
        data: { segmentId: segment.id, bizUserId: user.id, data: {} },
      });
      const token = await mint([Capability.SegmentUpdate]);

      const result = await callTool(
        'remove_segment_member',
        { segmentId: segment.id, memberId: 'ct-seg-user' },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(
        await prisma.bizUserOnSegment.findFirst({
          where: { segmentId: segment.id, bizUserId: user.id },
        }),
      ).toBeNull();
    });

    it('refuses a condition segment with E1017', async () => {
      const segment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        dataType: 2,
        data: [],
      });
      const token = await mint([Capability.SegmentUpdate]);
      const result = await callTool(
        'remove_segment_member',
        { segmentId: segment.id, memberId: 'ct-seg-user' },
        token,
      );
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1017');
    });
  });

  // ---- Sessions: the REAL end (both surfaces only ever tested refusals) ----

  describe('end_session', () => {
    it('ends a live flow session with endReason admin_ended', async () => {
      // The domain end path dereferences these two definitions; without them a
      // live session cannot be ended at all — seeding them IS the contract.
      const endDef = await buildEvent(prisma, {
        projectId: projectA,
        codeName: BizEvents.FLOW_ENDED,
      });
      await buildEvent(prisma, { projectId: projectA, codeName: BizEvents.FLOW_STEP_SEEN });

      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const version = await buildVersion(prisma, { contentId: content.id });
      const bizUser = await buildBizUser(prisma, { environmentId: envA });
      const session = await buildSession(prisma, {
        bizUserId: bizUser.id,
        versionId: version.id,
        contentId: content.id,
        environmentId: envA,
        state: 0,
      });
      const token = await mint([Capability.SessionManage]);

      const result = await callTool('end_session', { id: session.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        object: 'contentSession',
        id: session.id,
      });

      const row = await prisma.bizSession.findUnique({ where: { id: session.id } });
      expect(row?.state).toBe(1);
      const endEvent = await prisma.bizEvent.findFirst({
        where: { bizSessionId: session.id, eventId: endDef.id },
      });
      expect((endEvent?.data as Record<string, unknown>)?.flow_end_reason).toBe('admin_ended');
    });

    it('refuses an unknown session id with E1005', async () => {
      const token = await mint([Capability.SessionManage]);
      const result = await callTool('end_session', { id: 'ct-end-session-nope' }, token);
      expect(result.isError).toBe(true);
      expect(toolText(result)).toContain('E1005');
    });
  });

  // ---- Environments: the halves the main suite never exercised ----

  describe('update_environment (rename happy path)', () => {
    it('renames an in-scope environment', async () => {
      const env = await buildEnvironment(prisma, { projectId: projectA });
      const token = await mint([Capability.EnvironmentManage]);

      const result = await callTool(
        'update_environment',
        { id: env.id, name: 'Renamed env' },
        token,
      );
      expect(result.isError).toBeFalsy();
      const row = await prisma.environment.findUnique({ where: { id: env.id } });
      expect(row?.name).toBe('Renamed env');
    });
  });

  describe('delete_environment (real deletion + allowlist cleanup)', () => {
    it('deletes the environment and strips it from token and grant allowlists', async () => {
      const doomed = await buildEnvironment(prisma, { projectId: projectA });

      // A restricted API token and an OAuth grant both naming the doomed env —
      // the delete must strip it from BOTH allowlists (fail-closed) in the same
      // transaction. The userOnProject leg is already pinned by
      // gql/member-env-scope.e2e-spec.ts; these two legs had no test anywhere.
      await graphql(app, {
        query: CREATE,
        variables: {
          input: {
            name: 'allowlist-probe',
            scopes: [Capability.UserRead],
            projectIds: [projectA],
            environmentIds: [envA, doomed.id],
          },
        },
        token: ownerToken,
      });
      const grant = await prisma.oAuthGrant.create({
        data: {
          userId: ownerUserId,
          clientId: 'ct-client',
          projectId: projectA,
          scopes: ['content:read'],
          allowedEnvironmentIds: [doomed.id, envA],
        },
      });

      const token = await mint([Capability.EnvironmentManage]);
      const result = await callTool('delete_environment', { id: doomed.id }, token);
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toEqual({ success: true });

      const envRow = await prisma.environment.findUnique({ where: { id: doomed.id } });
      expect(envRow?.deleted).toBe(true);

      const probe = await prisma.apiToken.findFirst({
        where: { name: 'allowlist-probe', userId: ownerUserId },
      });
      expect(probe?.allowedEnvironmentIds).toEqual([envA]);
      const grantRow = await prisma.oAuthGrant.findUnique({ where: { id: grant.id } });
      expect(grantRow?.allowedEnvironmentIds).toEqual([envA]);

      await prisma.oAuthGrant.delete({ where: { id: grant.id } });
    });
  });

  describe('upsert_company (happy path)', () => {
    it('creates a company by external id', async () => {
      const token = await mint([Capability.CompanyWrite]);
      const result = await callTool(
        'upsert_company',
        { id: 'ct-co-upserted', attributes: { plan: 'pro' } },
        token,
      );
      expect(result.isError).toBeFalsy();
      expect(JSON.parse(toolText(result))).toMatchObject({
        object: 'company',
        id: 'ct-co-upserted',
      });
      expect(
        await prisma.bizCompany.findFirst({
          where: { externalId: 'ct-co-upserted', environmentId: envA },
        }),
      ).not.toBeNull();
    });
  });

  // ---- Transport pins: today's stateless mode is deliberate, not accidental.
  // If someone adds session support, these fail and force a conscious decision
  // (existing clients would otherwise change semantics silently). ----

  describe('stateless transport', () => {
    it('GET /mcp answers 405 with Allow: POST (no SSE push stream offered)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await request(app.getHttpServer())
        .get('/mcp')
        .set('Authorization', `Bearer ${token}`)
        .set('Accept', 'application/json, text/event-stream');
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('POST');
      expect(res.body.error.message).toMatch(/use POST/);
    });

    it('DELETE /mcp answers 405 (no session to terminate)', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await request(app.getHttpServer())
        .delete('/mcp')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(405);
      expect(res.headers.allow).toBe('POST');
      expect(res.body.error.message).toMatch(/no session/);
    });

    it('POST works without any Mcp-Session-Id and issues none back', async () => {
      const token = await mint([Capability.ContentRead]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      expect(res.status).toBe(200);
      expect(res.headers['mcp-session-id']).toBeUndefined();
      expect(extractResult(res).result.tools).toBeDefined();
    });
  });

  // ---- Auth guard: credentials that USED to work must die cleanly ----

  describe('auth guard: dead credentials', () => {
    const ROTATE = `mutation($id: String!){
      rotateApiToken(id: $id){ token apiToken { id } }
    }`;
    const DELETE = 'mutation($id: String!){ deleteApiToken(id: $id) }';

    async function mintWithId(): Promise<{ token: string; id: string }> {
      const res = await graphql(app, {
        query: CREATE,
        variables: {
          input: {
            name: 'mcp-contract-dead',
            scopes: [Capability.ContentRead],
            projectIds: [projectA],
          },
        },
        token: ownerToken,
      });
      const minted = gqlData(res).createApiToken;
      return { token: minted.token, id: minted.apiToken.id };
    }

    function toolsList(token: string) {
      return rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
    }

    it('a rotated-away old secret is refused with E1000; the new one works', async () => {
      const { token: oldToken, id } = await mintWithId();
      expect((await toolsList(oldToken)).status).toBe(200);

      const rotated = await graphql(app, {
        query: ROTATE,
        variables: { id },
        token: ownerToken,
      });
      const newToken = gqlData(rotated).rotateApiToken.token as string;

      const stale = await toolsList(oldToken);
      expect(stale.status).toBe(401);
      expect(stale.body.error.code).toBe('E1000');
      expect((await toolsList(newToken)).status).toBe(200);
    });

    it('a deleted token is refused with E1000', async () => {
      const { token, id } = await mintWithId();
      expect((await toolsList(token)).status).toBe(200);

      await graphql(app, { query: DELETE, variables: { id }, token: ownerToken });

      const dead = await toolsList(token);
      expect(dead.status).toBe(401);
      expect(dead.body.error.code).toBe('E1000');
    });
  });
});
