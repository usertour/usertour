import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { requiresEnvironmentScope } from '@usertour/helpers';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { ApiCompaniesService } from '@/api/companies/companies.service';
import { ApiUsersService } from '@/api/users/users.service';

import { gqlData, graphql } from '../auth';
import {
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildContent,
  buildEvent,
  buildSegment,
  buildSession,
  buildStep,
  buildVersion,
  buildEnvironment,
  buildProject,
  buildSubscription,
  buildTheme,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from '../gql/_support';
import { createTestApp } from '../create-test-app';

/**
 * Real-DB contract test for the MCP endpoint, now driven by the official
 * `@modelcontextprotocol/sdk` `StreamableHTTPServerTransport` (stateless mode).
 *
 * Covers the wire protocol (initialize / tools/list / tools/call), the
 * scope-gating of the tool registry (a token only sees tools whose capability is
 * in its scopes), the McpAuthGuard rejecting bad credentials through the OpenAPI
 * exception filter, and that a tool call reaches the real read service and
 * returns the seeded data inside the MCP text content.
 *
 * Transport note: the SDK replies to a single POST with an SSE stream
 * (`text/event-stream`) whose `data:` line carries the JSON-RPC response (it
 * only returns `application/json` when `enableJsonResponse` is set, which we
 * don't). The {@link extractResult} helper handles both shapes. Auth-guard
 * failures, by contrast, are thrown before the transport runs and are serialized
 * by the OpenAPI exception filter as a plain JSON error body.
 */
describe('MCP endpoint (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let ownerToken: string; // JWT for GraphQL
  let ownerUserId: string;
  let projectA: string;
  let envA: string;
  let envB: string;
  let themeId: string;
  let panAttrId: string;
  const bizUserExternalId = 'mcp-biz-1';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){
      token
      apiToken { id }
    }
  }`;

  async function mint(
    scopes: Capability[],
    projectIds: string[],
    environmentIds?: string[],
  ): Promise<string> {
    const input: Record<string, unknown> = { name: 'mcp', scopes, projectIds };
    // Env-targeted scopes must NAME environments (server rule) — default to envA;
    // project-level-only mints stay listless so environment-management tests can
    // act on environments created mid-test.
    if (environmentIds) {
      input.environmentIds = environmentIds;
    } else if (requiresEnvironmentScope(scopes)) {
      input.environmentIds = [envA];
    }
    const res = await graphql(app, { query: CREATE, variables: { input }, token: ownerToken });
    return gqlData(res).createApiToken.token;
  }

  // Extract a tools/call result object (the `{ content, isError }` shape).
  async function callTool(name: string, args: Record<string, unknown>, token: string) {
    return extractResult(
      await rpc(
        { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } },
        token,
      ),
    ).result;
  }

  // POST a JSON-RPC message to /mcp with the headers a real MCP client sends.
  function rpc(body: Record<string, unknown> | unknown[], token?: string) {
    const req = request(app.getHttpServer())
      .post('/mcp')
      .set('Content-Type', 'application/json')
      .set('Accept', 'application/json, text/event-stream');
    if (token) {
      req.set('Authorization', `Bearer ${token}`);
    }
    return req.send(body as object);
  }

  /**
   * Pull the JSON-RPC response object out of an HTTP response, whether the
   * transport answered with `application/json` (body is the JSON-RPC object) or
   * `text/event-stream` (the JSON-RPC object is the `data:` payload of an SSE
   * event). supertest leaves an SSE body as raw text on `res.text`.
   */
  function extractResult(res: { headers: Record<string, string>; body: any; text?: string }): any {
    const contentType = res.headers['content-type'] ?? '';
    if (contentType.includes('text/event-stream')) {
      const raw = res.text ?? '';
      const dataLine = raw
        .split('\n')
        .map((line) => line.trim())
        .find((line) => line.startsWith('data:'));
      if (!dataLine) {
        throw new Error(`No SSE data line found in response:\n${raw}`);
      }
      return JSON.parse(dataLine.slice('data:'.length).trim());
    }
    return res.body;
  }

  // Parse the JSON object back out of a tools/call text-content result.
  function parseToolContent(rpcResult: any): any {
    return JSON.parse(rpcResult.result.content[0].text);
  }

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    projectA = (await buildProject(prisma, { name: 'mcp-a' })).id;
    // Cloud mode gates env creation on the plan; a BUSINESS subscription clears it
    // for the create_environment write-tool test.
    await buildSubscription(prisma, { projectId: projectA });
    // Primary environment so the env-resolution fallback has a target.
    envA = (await buildEnvironment(prisma, { projectId: projectA, isPrimary: true })).id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId: projectA, role: 'OWNER' });
    ownerToken = owner.token;
    ownerUserId = owner.user.id;

    await buildBizUser(prisma, { environmentId: envA, externalId: bizUserExternalId });
    // Attributes referenced by rule fixtures must exist BEFORE any diagnose call
    // warms the project attribute cache (5-min TTL; API writes invalidate it,
    // direct prisma inserts in tests do not).
    panAttrId = (
      await prisma.attribute.create({
        data: {
          projectId: projectA,
          codeName: 'pan_plan',
          displayName: 'plan',
          bizType: 1,
          dataType: 2,
        },
      })
    ).id;
    await buildContent(prisma, { projectId: projectA, environmentId: envA, type: 'flow' });
    themeId = (await buildTheme(prisma, { projectId: projectA })).id;
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await prisma.apiToken.deleteMany({ where: { userId: ownerUserId } });
      await teardownProject(prisma, projectA);
      await prisma.user.deleteMany({ where: { id: ownerUserId } });
    }
    await app?.close();
  });

  const ALL_READ_SCOPES = [
    Capability.ContentRead,
    Capability.AttributeRead,
    Capability.EventRead,
    Capability.UserRead,
  ];

  describe('protocol', () => {
    it('initialize returns protocolVersion + serverInfo', async () => {
      const token = await mint(ALL_READ_SCOPES, [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-06-18',
            capabilities: {},
            clientInfo: { name: 'test', version: '0.0.0' },
          },
        },
        token,
      );
      expect(res.status).toBe(200);
      const result = extractResult(res);
      expect(result.jsonrpc).toBe('2.0');
      expect(result.id).toBe(1);
      expect(result.result.protocolVersion).toBe('2025-06-18');
      // serverInfo.version must be the REAL release from package.json (an MCP
      // client's only signal that the server changed), never a hardcoded constant.
      const pkg = require('../../../package.json') as { version: string };
      expect(result.result.serverInfo).toEqual({ name: 'usertour', version: pkg.version });
      expect(result.result.capabilities.tools).toBeDefined();
      // The routing map rides the handshake so an agent knows what to read/call
      // BEFORE its first tool call. Pin the load-bearing routes, not the prose.
      const instructions = result.result.instructions as string;
      expect(instructions).toContain('get_authoring_guide');
      expect(instructions).toContain('diagnose_content');
      expect(instructions).toContain('get_content_schema');
      expect(instructions).toContain('nextCursor');
    });
  });

  describe('tools/list scope-gating', () => {
    it('a read-all token sees the content/attr/event/user read tools', async () => {
      const token = await mint(ALL_READ_SCOPES, [projectA]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      const result = extractResult(res);
      const names = result.result.tools.map((t: { name: string }) => t.name).sort();
      expect(names).toEqual(
        [
          'diagnose_content',
          'diagnose_user',
          'get_attribute_definition',
          'get_authoring_guide',
          'get_content',
          'get_content_schema',
          'get_content_version',
          'get_event_definition',
          'get_user',
          'list_attribute_definitions',
          'list_content',
          'list_content_versions',
          'list_publish_history',
          'list_references',
          'list_event_definitions',
          'list_users',
          'validate_content_version',
        ].sort(),
      );
    });

    it('a user:read-only token sees only the user tools', async () => {
      const token = await mint([Capability.UserRead], [projectA]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      const result = extractResult(res);
      const names = result.result.tools.map((t: { name: string }) => t.name).sort();
      expect(names).toEqual(['get_user', 'list_users']);
    });

    it('does not list a tool whose capability is outside the token scope', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      const result = extractResult(res);
      const names = result.result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('list_content');
      expect(names).not.toContain('list_users');
    });

    it('exposes MCP tool annotations (read-only vs destructive hints)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentDelete], [projectA]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      const tools = extractResult(res).result.tools as {
        name: string;
        annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
      }[];
      const list = tools.find((t) => t.name === 'list_content');
      const del = tools.find((t) => t.name === 'delete_content');
      expect(list?.annotations?.readOnlyHint).toBe(true);
      expect(del?.annotations?.readOnlyHint).toBe(false);
      expect(del?.annotations?.destructiveHint).toBe(true);
    });
  });

  describe('tools/call', () => {
    it('get_content_analytics returns the typed envelope (analytics:read)', async () => {
      const token = await mint([Capability.AnalyticsRead], [projectA]);
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      await buildVersion(prisma, { contentId: content.id, sequence: 0 });
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_content_analytics',
            arguments: { contentId: content.id, environmentId: envA },
          },
        },
        token,
      );
      const result = extractResult(res);
      expect(result.result.isError).toBeFalsy();
      const payload = parseToolContent(result);
      // The envelope is PER-TYPE: a flow reports starts/completions (renamed
      // from the domain's internal views vocabulary) and a `steps` breakdown —
      // no `uniqueViews`, no other types' arrays. Zero data still yields the
      // full shape (zeros + empty arrays), never missing fields.
      expect(payload).toMatchObject({
        object: 'contentAnalytics',
        contentId: content.id,
        environmentId: envA,
        contentType: 'flow',
        uniqueStarts: 0,
        totalStarts: 0,
        uniqueCompletions: 0,
        totalCompletions: 0,
        byDay: [],
        steps: [],
      });
      expect(payload).not.toHaveProperty('uniqueViews');
      expect(payload).not.toHaveProperty('tasks');
    });

    it('get_usage_overview ranks all content and scopes to a company with a member roster', async () => {
      // Own environment: the overview sweeps EVERY content with activity in the
      // environment, so suite neighbours' sessions would pollute the table.
      const envU = (await buildEnvironment(prisma, { projectId: projectA })).id;
      const token = await mint([Capability.AnalyticsRead], [projectA], [envU]);

      const flowA = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envU,
        type: 'flow',
        name: 'Onboarding tour',
      });
      const flowAVersion = await buildVersion(prisma, { contentId: flowA.id, sequence: 0 });
      const flowB = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envU,
        type: 'flow',
        name: 'Unused flow',
      });
      const flowBVersion = await buildVersion(prisma, { contentId: flowB.id, sequence: 0 });
      const tracker = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envU,
        type: 'tracker',
        name: 'Signup clicks',
      });
      const trackerVersion = await buildVersion(prisma, { contentId: tracker.id, sequence: 0 });
      for (const [contentId, publishedVersionId] of [
        [flowA.id, flowAVersion.id],
        [flowB.id, flowBVersion.id],
        [tracker.id, trackerVersion.id],
      ] as const) {
        await prisma.contentOnEnvironment.create({
          data: { contentId, environmentId: envU, publishedVersionId, published: true },
        });
      }

      const u1 = await buildBizUser(prisma, {
        environmentId: envU,
        externalId: 'usage-u1',
        data: { name: 'Ada' },
      });
      const u2 = await buildBizUser(prisma, { environmentId: envU, externalId: 'usage-u2' });
      const co = await buildBizCompany(prisma, { environmentId: envU, externalId: 'usage-co' });
      await buildBizUserOnCompany(prisma, { bizUserId: u1.id, bizCompanyId: co.id });

      // flowA: two sessions for the member (the LATER one completed at 100%),
      // one for the non-member. Distinct createdAt keeps "latest" deterministic.
      await buildSession(prisma, {
        environmentId: envU,
        contentId: flowA.id,
        versionId: flowAVersion.id,
        bizUserId: u1.id,
        progress: 20,
        state: 1,
        createdAt: new Date(Date.now() - 60_000),
      });
      const latest = await buildSession(prisma, {
        environmentId: envU,
        contentId: flowA.id,
        versionId: flowAVersion.id,
        bizUserId: u1.id,
        progress: 100,
        state: 1,
      });
      await buildSession(prisma, {
        environmentId: envU,
        contentId: flowA.id,
        versionId: flowAVersion.id,
        bizUserId: u2.id,
        progress: 50,
        state: 0,
      });
      // Genuine flow completion by the member → goalUsers + roster `completed`.
      // No contentId on the event row — production session events don't carry
      // it (the content resolves through the session), so neither may the fixture.
      const flowCompleted = await buildEvent(prisma, {
        projectId: projectA,
        codeName: 'flow_completed',
      });
      await prisma.bizEvent.create({
        data: { eventId: flowCompleted.id, bizUserId: u1.id, bizSessionId: latest.id },
      });
      // Tracker: two firings by the NON-member (no sessions — event-counted).
      const tracked = await buildEvent(prisma, { projectId: projectA });
      for (let i = 0; i < 2; i++) {
        await prisma.bizEvent.create({
          data: { eventId: tracked.id, bizUserId: u2.id, contentId: tracker.id },
        });
      }

      // ── Whole-environment table, ranked by reach ──
      const res = await callTool('get_usage_overview', { environmentId: envU }, token);
      expect(res.isError).toBeFalsy();
      const overview = JSON.parse(res.content[0].text);
      expect(overview.items.map((r: { id: string }) => r.id)).toEqual([
        flowA.id,
        tracker.id,
        flowB.id,
      ]);
      const [rowA, rowT, rowB] = overview.items;
      expect(rowA).toMatchObject({
        activity: 3,
        activityKind: 'sessions',
        uniqueUsers: 2,
        goalUsers: 1,
        goalKind: 'completed',
        published: true,
      });
      expect(rowA.lastActivityAt).toBeTruthy();
      expect(rowT).toMatchObject({
        activity: 2,
        activityKind: 'events',
        uniqueUsers: 1,
        goalUsers: null,
        goalKind: null,
      });
      // Published-but-unused stays visible — the dead-content signal.
      expect(rowB).toMatchObject({ activity: 0, uniqueUsers: 0, published: true });

      // ── Company-scoped with the member roster ──
      const scoped = await callTool(
        'get_usage_overview',
        { environmentId: envU, companyId: 'usage-co', expand: ['users'] },
        token,
      );
      expect(scoped.isError).toBeFalsy();
      const byCompany = JSON.parse(scoped.content[0].text);
      expect(byCompany.company).toEqual({ id: 'usage-co', memberCount: 1 });
      const scopedA = byCompany.items.find((r: { id: string }) => r.id === flowA.id);
      // Only the member's activity counts now — u2's session is out.
      expect(scopedA).toMatchObject({ activity: 2, uniqueUsers: 1, goalUsers: 1 });
      expect(scopedA.users).toEqual([
        {
          id: 'usage-u1',
          name: 'Ada',
          activity: 2,
          latestProgress: 100,
          latestState: 'ended',
          completed: true,
          lastActivityAt: expect.any(String),
        },
      ]);
      // The tracker's firings were all the non-member's.
      const scopedT = byCompany.items.find((r: { id: string }) => r.id === tracker.id);
      expect(scopedT).toMatchObject({ activity: 0, uniqueUsers: 0 });

      // The roster without a company is refused, not silently global.
      const bad = await callTool(
        'get_usage_overview',
        { environmentId: envU, expand: ['users'] },
        token,
      );
      expect(bad.isError).toBe(true);
      expect(bad.content[0].text).toContain('companyId');

      // Un-publish the fixtures: a later test asserts NOTHING in the project is
      // published, and publish state is project-visible across environments.
      await prisma.contentOnEnvironment.updateMany({
        where: { environmentId: envU },
        data: { published: false },
      });
    });

    it('get_content_analytics validates timezone/date at the boundary (clean tool error, no RangeError)', async () => {
      const token = await mint([Capability.AnalyticsRead], [projectA]);
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      await buildVersion(prisma, { contentId: content.id, sequence: 0 });

      // Invalid IANA timezone — must be rejected at the schema (as REST does),
      // not flow into AT TIME ZONE / date-fns-tz and throw an internal RangeError.
      const badTz = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'get_content_analytics',
              arguments: { contentId: content.id, environmentId: envA, timezone: 'Beijing' },
            },
          },
          token,
        ),
      );
      expect(badTz.result.isError).toBe(true);
      expect(badTz.result.content[0].text).toMatch(/timezone/i);

      // Timezone-less datetime — same rule as the REST filters.
      const badDate = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'get_content_analytics',
              arguments: {
                contentId: content.id,
                environmentId: envA,
                startDate: '2026-07-10T00:00:00',
              },
            },
          },
          token,
        ),
      );
      expect(badDate.result.isError).toBe(true);

      // A valid IANA zone + date-only still works.
      const ok = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'get_content_analytics',
              arguments: {
                contentId: content.id,
                environmentId: envA,
                timezone: 'Asia/Tokyo',
                startDate: '2026-07-01',
              },
            },
          },
          token,
        ),
      );
      expect(ok.result.isError).toBeFalsy();
    });

    it('list_users returns the seeded user in the text content', async () => {
      const token = await mint([Capability.UserRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'list_users', arguments: {} },
        },
        token,
      );
      expect(res.status).toBe(200);
      const result = extractResult(res);
      expect(result.result.isError).toBeFalsy();
      const payload = parseToolContent(result);
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items.map((u: { id: string }) => u.id)).toContain(bizUserExternalId);
    });

    it('get_user inlines companies + memberships (role) by default; list_users stays lean unless asked', async () => {
      // F1 regression: get_user must surface the user's per-company role from the user side
      // (it used to hardcode expand=companies, leaving memberships null). list_users keeps
      // memberships out by default for leanness but honors an explicit `expand`.
      const token = await mint([Capability.UserRead], [projectA]);
      const ext = 'f1-membership-user';
      const bu = await buildBizUser(prisma, { environmentId: envA, externalId: ext });
      const co = await buildBizCompany(prisma, { environmentId: envA });
      await buildBizUserOnCompany(prisma, {
        bizUserId: bu.id,
        bizCompanyId: co.id,
        data: { company_role: 'admin' },
      });

      const getUser = async (args: object) =>
        parseToolContent(
          extractResult(
            await rpc(
              {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name: 'get_user', arguments: args },
              },
              token,
            ),
          ),
        );

      // Default: companies + memberships inlined, with the role visible from the user side.
      const user = await getUser({ id: ext });
      expect(Array.isArray(user.companies)).toBe(true);
      expect(user.companies.length).toBeGreaterThan(0);
      expect(Array.isArray(user.memberships)).toBe(true);
      expect(user.memberships[0].attributes.company_role).toBe('admin');

      // list_users: lean by default (no memberships), but expand surfaces them on request.
      const listed = async (args: object) =>
        parseToolContent(
          extractResult(
            await rpc(
              {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name: 'list_users', arguments: args },
              },
              token,
            ),
          ),
        ).items.find((u: { id: string }) => u.id === ext);
      expect((await listed({})).memberships).toBeNull();
      const expanded = await listed({ expand: ['memberships'] });
      expect(expanded.memberships[0].attributes.company_role).toBe('admin');
    });

    it('list_content works for a content-scoped token', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'list_content', arguments: {} },
        },
        token,
      );
      expect(res.status).toBe(200);
      const result = extractResult(res);
      const payload = parseToolContent(result);
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items.length).toBeGreaterThan(0);
    });

    it('list_content accepts + forwards orderBy and expand (not just limit/cursor)', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'list_content',
            arguments: { orderBy: '-createdAt', expand: ['editedVersion', 'publishedVersion'] },
          },
        },
        token,
      );
      expect(res.status).toBe(200);
      const rpcResult = extractResult(res);
      // The richer args reach the service and run (a malformed arg would isError).
      expect(rpcResult.result.isError).toBeFalsy();
      expect(Array.isArray(parseToolContent(rpcResult).items)).toBe(true);
    });

    const listContent = async (args: Record<string, unknown>) => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'list_content', arguments: args },
        },
        token,
      );
      return parseToolContent(extractResult(res)).items as unknown[];
    };

    it('list_content filters by createdAt range', async () => {
      // The seeded flow was created "now", so it falls before a far-future bound…
      expect(
        (await listContent({ createdBefore: '2099-01-01T00:00:00.000Z' })).length,
      ).toBeGreaterThan(0);
      // …and not after it.
      expect(await listContent({ createdAfter: '2099-01-01T00:00:00.000Z' })).toHaveLength(0);
    });

    it('list_content filters by published (per-environment source of truth)', async () => {
      // The seeded content is not published in any environment.
      expect((await listContent({ published: false })).length).toBeGreaterThan(0);
      expect(await listContent({ published: true })).toHaveLength(0);
    });

    it('get_authoring_guide returns the guide text', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_authoring_guide', arguments: {} },
        },
        token,
      );
      expect(res.status).toBe(200);
      const payload = parseToolContent(extractResult(res));
      expect(typeof payload.guide).toBe('string');
      expect(payload.guide).toContain('goto_step');
    });

    it('get_content_schema returns the data JSON Schema for a non-flow type', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_content_schema', arguments: { type: 'checklist' } },
        },
        token,
      );
      expect(res.status).toBe(200);
      const payload = parseToolContent(extractResult(res));
      expect(payload.body).toBe('data');
      // update_content_version only types `data` as a generic object (its shape is
      // polymorphic); this tool surfaces the full per-type shape incl. nested fields.
      expect(Object.keys(payload.schema.properties)).toEqual(
        expect.arrayContaining(['buttonText', 'initialDisplay', 'items']),
      );
      // The schema now emits `$ref` into `$defs` for nested shapes (it used to inline them);
      // follow a ref (or take the node as-is) so the assertion survives either form.
      const deref = (node: any) =>
        node?.$ref ? payload.schema.$defs[node.$ref.split('/').pop()] : node;
      const itemsArray = deref(payload.schema.properties.items);
      const item = deref(itemsArray.items).properties;
      expect(Object.keys(item)).toEqual(
        expect.arrayContaining(['name', 'completeWhen', 'clickActions']),
      );
    });

    it('get_content_schema returns the steps schema for flow', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'get_content_schema', arguments: { type: 'flow' } },
        },
        token,
      );
      const payload = parseToolContent(extractResult(res));
      expect(payload.body).toBe('steps');
      expect(payload.schema.type).toBe('array');
    });

    it('diagnose_content answers for ARCHIVED content with an archived gate instead of E1004', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const archived = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
        deleted: true,
        name: 'mcp archived flow',
      });
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'diagnose_content',
            arguments: {
              contentId: archived.id,
              environmentId: envA,
              url: 'https://app.example.com/',
              userId: bizUserExternalId,
            },
          },
        },
        token,
      );
      expect(res.status).toBe(200);
      const payload = parseToolContent(extractResult(res));
      // The #1 real-world "why isn't it showing" answer must be an ANSWER:
      // a diagnosis whose single failing gate says archived + the way back —
      // not a Content-not-found error indistinguishable from a wrong id.
      expect(payload.blockedBy).toEqual(['archived']);
      expect(payload.gates).toHaveLength(1);
      expect(payload.gates[0]).toMatchObject({ id: 'archived', status: 'fail' });
      expect(payload.gates[0].detail).toContain('restore_content');
      expect(payload.summary).toContain('ARCHIVED');
    });

    it('diagnose expands a segment leaf: users excluded for DIFFERENT reasons read differently', async () => {
      // The original complaint (three eval rounds in a row): a plan-mismatch user
      // and an out-of-window user produced byte-identical reports — just
      // "segment ... unmatched". The expansion must name the failing inner
      // condition with the user's actual value, per user.
      const token = await mint([Capability.ContentRead], [projectA]);
      // dataType 2 = String (1 is Number — a string value against a Number
      // attribute compiles to a filter that matches nothing).
      const planAttr = await prisma.attribute.create({
        data: {
          projectId: projectA,
          codeName: 'seg_plan',
          displayName: 'plan',
          bizType: 1,
          dataType: 2,
        },
      });
      const regionAttr = await prisma.attribute.create({
        data: {
          projectId: projectA,
          codeName: 'seg_region',
          displayName: 'region',
          bizType: 1,
          dataType: 2,
        },
      });
      const segment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        bizType: 1, // USER
        dataType: 2, // CONDITION
        name: 'pro users in eu',
        data: [
          {
            id: 'c1',
            type: 'user-attr',
            data: { attrId: planAttr.id, logic: 'is', value: 'pro' },
            operators: 'and',
          },
          {
            id: 'c2',
            type: 'user-attr',
            data: { attrId: regionAttr.id, logic: 'is', value: 'eu' },
            operators: 'and',
          },
        ] as unknown as Prisma.InputJsonValue,
      });
      // Two users, each failing a DIFFERENT condition.
      await prisma.bizUser.create({
        data: {
          externalId: 'seg-wrong-plan',
          environmentId: envA,
          data: { seg_plan: 'free', seg_region: 'eu' },
        },
      });
      await prisma.bizUser.create({
        data: {
          externalId: 'seg-wrong-region',
          environmentId: envA,
          data: { seg_plan: 'pro', seg_region: 'us' },
        },
      });
      const gated = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const gatedV = await buildVersion(prisma, {
        contentId: gated.id,
        sequence: 0,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              id: 'r1',
              type: 'segment',
              data: { segmentId: segment.id, logic: 'is' },
              operators: 'and',
            },
          ],
          autoStartRulesSetting: {},
        } as unknown as Prisma.InputJsonValue,
      });
      await prisma.contentOnEnvironment.create({
        data: {
          environmentId: envA,
          contentId: gated.id,
          published: true,
          publishedVersionId: gatedV.id,
        },
      });

      const diagnose = async (userId: string) => {
        const res = await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'diagnose_content',
              arguments: {
                contentId: gated.id,
                environmentId: envA,
                url: 'https://app.example.com/',
                userId,
              },
            },
          },
          token,
        );
        return parseToolContent(extractResult(res));
      };
      const wrongPlan = await diagnose('seg-wrong-plan');
      const wrongRegion = await diagnose('seg-wrong-region');

      const segLeaf = (p: any) =>
        p.startConditions.conditions.find((c: any) => c.type === 'segment');
      for (const p of [wrongPlan, wrongRegion]) {
        expect(p.blockedBy).toContain('start_rules');
        expect(segLeaf(p).segmentKind).toBe('condition');
        expect(segLeaf(p).segmentConditions).toBeDefined();
      }
      const inner = (p: any, code: string) =>
        segLeaf(p).segmentConditions.conditions.find((c: any) => c.attribute === code);
      // wrong-plan user: plan condition failed (actual 'free'), region matched.
      expect(inner(wrongPlan, 'seg_plan')).toMatchObject({ status: 'unmatched', actual: 'free' });
      expect(inner(wrongPlan, 'seg_region').status).toBe('matched');
      // wrong-region user: the exact mirror.
      expect(inner(wrongRegion, 'seg_plan').status).toBe('matched');
      expect(inner(wrongRegion, 'seg_region')).toMatchObject({ status: 'unmatched', actual: 'us' });
      // And the two reports are no longer byte-identical.
      expect(JSON.stringify(wrongPlan)).not.toBe(JSON.stringify(wrongRegion));
    });

    it('diagnose_user: one call settles the slot race and buckets everything', async () => {
      // Own environment: other tests publish flows into envA, and a panorama by
      // definition sees EVERYTHING published — isolate the race to this test.
      const panEnv = (await buildEnvironment(prisma, { projectId: projectA })).id;
      const token = await mint([Capability.ContentRead], [projectA], [panEnv]);
      const attr = { id: panAttrId };
      await prisma.bizUser.create({
        data: { externalId: 'pan-user', environmentId: panEnv, data: { pan_plan: 'pro' } },
      });
      const mkFlow = async (name: string, rules: unknown[], priority?: string) => {
        const c = await buildContent(prisma, {
          projectId: projectA,
          environmentId: panEnv,
          type: 'flow',
          name,
        });
        const v = await buildVersion(prisma, {
          contentId: c.id,
          sequence: 0,
          config: {
            enabledAutoStartRules: true,
            autoStartRules: rules,
            autoStartRulesSetting: priority ? { priority } : {},
          } as unknown as Prisma.InputJsonValue,
        });
        await prisma.contentOnEnvironment.create({
          data: {
            environmentId: panEnv,
            contentId: c.id,
            published: true,
            publishedVersionId: v.id,
          },
        });
        return c;
      };
      const matchRule = [
        {
          id: 'r1',
          type: 'user-attr',
          data: { attrId: attr.id, logic: 'is', value: 'pro' },
          operators: 'and',
        },
      ];
      const missRule = [
        {
          id: 'r1',
          type: 'user-attr',
          data: { attrId: attr.id, logic: 'is', value: 'enterprise' },
          operators: 'and',
        },
      ];
      const winner = await mkFlow('pan winner', matchRule, 'high');
      const loser = await mkFlow('pan loser', matchRule, 'low');
      const excluded = await mkFlow('pan excluded', missRule);

      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'diagnose_user',
            arguments: {
              userId: 'pan-user',
              environmentId: panEnv,
              url: 'https://app.example.com/',
            },
          },
        },
        token,
      );
      const p = parseToolContent(extractResult(res));
      const byId = (list: any[], id: string) => list.find((r: any) => r.contentId === id);

      // The race is settled in one answer: winner shows, loser is queued BEHIND
      // the named winner (the visibility item 7 asked for), excluded is blocked
      // with exactly one gate.
      expect(byId(p.showing, winner.id)).toMatchObject({ via: 'auto_start' });
      expect(byId(p.queued, loser.id)).toMatchObject({
        queueReason: 'outranked',
        behindContentId: winner.id,
        behindName: 'pan winner',
      });
      expect(byId(p.blocked, excluded.id)).toMatchObject({ gate: 'start_rules' });
      // And nothing leaks between buckets.
      expect(byId(p.showing, loser.id)).toBeUndefined();
      expect(byId(p.blocked, winner.id)).toBeUndefined();
    });

    it('list_references finds every live holder of an attribute / segment / theme / content', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const refAttr = await prisma.attribute.create({
        data: {
          projectId: projectA,
          codeName: 'ref_probe',
          displayName: 'ref',
          bizType: 1,
          dataType: 2,
        },
      });
      const refSegment = await buildSegment(prisma, {
        projectId: projectA,
        environmentId: envA,
        bizType: 1,
        dataType: 2,
        name: 'ref probe segment',
        data: [
          {
            id: 's1',
            type: 'user-attr',
            data: { attrId: refAttr.id, logic: 'is', value: 'x' },
            operators: 'and',
          },
        ] as unknown as Prisma.InputJsonValue,
      });
      const refTheme = await buildTheme(prisma, { projectId: projectA });
      const targetFlow = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
        name: 'ref target flow',
      });

      // One content whose DRAFT holds every reference kind at once: start rules
      // gate on the attribute AND the segment, the version uses the theme, a
      // step question binds the attribute BY CODENAME, and a step trigger
      // starts the target flow.
      const holder = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
        name: 'ref holder',
      });
      const holderV = await buildVersion(prisma, {
        contentId: holder.id,
        sequence: 0,
        themeId: refTheme.id,
        config: {
          enabledAutoStartRules: true,
          autoStartRules: [
            {
              id: 'r1',
              type: 'user-attr',
              data: { attrId: refAttr.id, logic: 'is', value: 'pro' },
              operators: 'and',
            },
            {
              id: 'r2',
              type: 'segment',
              data: { segmentId: refSegment.id, logic: 'is' },
              operators: 'and',
            },
          ],
          autoStartRulesSetting: {},
        } as unknown as Prisma.InputJsonValue,
      });
      await buildStep(prisma, {
        versionId: holderV.id,
        type: 'modal',
        sequence: 0,
        data: [
          {
            element: {
              type: 'nps',
              data: {
                cvid: 'q1',
                name: 'q',
                bindToAttribute: true,
                selectedAttribute: 'ref_probe',
              },
            },
          },
        ] as unknown as Prisma.InputJsonValue,
        trigger: [
          {
            conditions: [],
            actions: [{ type: 'flow-start', data: { contentId: targetFlow.id } }],
            wait: 0,
          },
        ] as unknown as Prisma.InputJsonValue,
      });
      await prisma.content.update({
        where: { id: holder.id },
        data: { editedVersionId: holderV.id },
      });

      const refs = async (kind: string, id: string) =>
        parseToolContent(
          extractResult(
            await rpc(
              {
                jsonrpc: '2.0',
                id: 1,
                method: 'tools/call',
                params: { name: 'list_references', arguments: { kind, id } },
              },
              token,
            ),
          ),
        );

      // Attribute: found in start rules AND the question binding (codeName
      // vocabulary) AND the segment's own definition.
      const a = await refs('attribute', refAttr.id);
      const holderRow = a.referencedBy.find((r: any) => r.id === holder.id);
      expect(holderRow.where).toEqual(
        expect.arrayContaining([
          expect.stringContaining('start rules'),
          expect.stringContaining('question binding'),
        ]),
      );
      expect(a.referencedBy.find((r: any) => r.id === refSegment.id)).toMatchObject({
        referrerKind: 'segment',
        where: ['segment conditions'],
      });

      // Segment / theme / content each resolve to the holder with the right spot.
      const sg = await refs('segment', refSegment.id);
      expect(sg.referencedBy.find((r: any) => r.id === holder.id).where[0]).toContain(
        'start rules',
      );
      const th = await refs('theme', refTheme.id);
      expect(th.referencedBy.find((r: any) => r.id === holder.id).where[0]).toContain(
        'version theme',
      );
      const ct = await refs('content', targetFlow.id);
      expect(ct.referencedBy.find((r: any) => r.id === holder.id).where[0]).toContain('trigger');

      // Nothing references the TARGET flow's own attribute-free sibling query:
      // an unreferenced probe answers "safe to delete".
      const lonely = await prisma.attribute.create({
        data: {
          projectId: projectA,
          codeName: 'ref_lonely',
          displayName: 'lonely',
          bizType: 1,
          dataType: 2,
        },
      });
      const empty = await refs('attribute', lonely.id);
      expect(empty.referencedBy).toEqual([]);
      expect(empty.summary).toContain('safe to delete');
    });

    it('get_content_schema batches several types with the shared $defs emitted once', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'get_content_schema',
            arguments: { type: ['flow', 'checklist', 'launcher'] },
          },
        },
        token,
      );
      expect(res.status).toBe(200);
      const payload = parseToolContent(extractResult(res));
      expect(payload.types).toEqual(['flow', 'checklist', 'launcher']);
      expect(payload.body).toEqual({ flow: 'steps', checklist: 'data', launcher: 'data' });
      // Each requested type is a property of one wrapper schema...
      expect(Object.keys(payload.schema.properties)).toEqual(['flow', 'checklist', 'launcher']);
      // ...and the shared vocabulary is hoisted into ONE $defs — the batch must be
      // materially smaller than three standalone fetches, or batching is pointless.
      const single = async (t: string) => {
        const r = await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: { name: 'get_content_schema', arguments: { type: t } },
          },
          token,
        );
        return JSON.stringify(parseToolContent(extractResult(r)).schema).length;
      };
      const standalone =
        (await single('flow')) + (await single('checklist')) + (await single('launcher'));
      const batched = JSON.stringify(payload.schema).length;
      expect(batched).toBeLessThan(standalone * 0.6);
    });

    it('calling a tool outside the token scope is unknown to the token', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: { name: 'list_users', arguments: {} },
        },
        token,
      );
      // The tool was never registered for this token, so the SDK reports it as
      // an unknown/invalid tool (a JSON-RPC error or an isError tool result).
      expect(res.status).toBe(200);
      const result = extractResult(res);
      const text = result.error ? result.error.message : (result.result.content?.[0]?.text ?? '');
      expect(result.error?.code !== undefined || result.result?.isError === true).toBe(true);
      expect(String(text).toLowerCase()).toContain('list_users');
    });
  });

  describe('data-resource read tools', () => {
    it('exposes + runs companies / segments / sessions read tools', async () => {
      const token = await mint(
        [Capability.CompanyRead, Capability.SegmentRead, Capability.SessionRead],
        [projectA],
      );
      const names = extractResult(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token))
        .result.tools.map((t: { name: string }) => t.name)
        .sort();
      expect(names).toEqual(
        [
          'get_company',
          'get_segment',
          'get_session',
          'list_companies',
          'list_segments',
          'list_sessions',
        ].sort(),
      );

      for (const name of ['list_companies', 'list_segments', 'list_sessions']) {
        const payload = parseToolContent(
          extractResult(
            await rpc(
              { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name, arguments: {} } },
              token,
            ),
          ),
        );
        expect(Array.isArray(payload.items)).toBe(true);
      }
    });

    it('list_environments returns the seeded environment', async () => {
      const token = await mint([Capability.EnvironmentRead], [projectA]);
      const names = extractResult(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token))
        .result.tools.map((t: { name: string }) => t.name)
        .sort();
      expect(names).toEqual(['get_environment', 'list_environments']);

      const payload = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: { name: 'list_environments', arguments: {} },
            },
            token,
          ),
        ),
      );
      expect(payload.items.map((e: { id: string }) => e.id)).toContain(envA);
    });
  });

  describe('argument hardening', () => {
    it('refuses a blank external id on upsert_user / upsert_company (nothing created)', async () => {
      const token = await mint([Capability.UserWrite, Capability.CompanyWrite], [projectA]);
      for (const [name, id] of [
        ['upsert_user', ''],
        ['upsert_user', '   '],
        ['upsert_company', ''],
        ['upsert_company', '   '],
      ] as const) {
        const res = await callTool(name, { id }, token);
        // Refused at the schema layer, so the handler — and the upsert — never
        // runs. (The SDK surfaces schema violations as isError tool results.)
        expect(res.isError).toBe(true);
        expect(res.content[0].text).toMatch(/Input validation error/i);
      }
      expect(
        await prisma.bizUser.count({
          where: { environmentId: envA, externalId: { in: ['', '   '] } },
        }),
      ).toBe(0);
      expect(
        await prisma.bizCompany.count({
          where: { environmentId: envA, externalId: { in: ['', '   '] } },
        }),
      ).toBe(0);
    });

    it('service chokepoint refuses a blank id even without the schema layer', async () => {
      // The MCP schema already blocks blank ids; this pins the DEFENSE IN DEPTH:
      // any other caller of the v2 upsert services (v2 REST path params can
      // carry '%20') hits the same refusal.
      const usersService = app.get(ApiUsersService);
      const environment = await prisma.environment.findUniqueOrThrow({ where: { id: envA } });
      await expect(usersService.upsert('   ', environment, {} as never)).rejects.toMatchObject({
        code: 'E1017',
      });
      const companiesService = app.get(ApiCompaniesService);
      await expect(companiesService.upsert('', environment, {} as never)).rejects.toMatchObject({
        code: 'E1017',
      });
    });

    it('rejects unknown argument keys instead of silently dropping them', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      // `contentType` is a plausible misspelling of list_content's `type`.
      const res = await callTool('list_content', { contentType: 'flow' }, token);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/unrecognized/i);
      expect(res.content[0].text).toContain('contentType');
    });

    it('advertises additionalProperties:false in tools/list JSON Schemas', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const tools = extractResult(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token))
        .result.tools;
      for (const tool of tools) {
        expect(tool.inputSchema.additionalProperties).toBe(false);
      }
    });

    it('get_content refuses conflicting id/contentId aliases and accepts matching ones', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const content = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });

      const conflict = await callTool(
        'get_content',
        { id: content.id, contentId: 'some-other-id' },
        token,
      );
      expect(conflict.isError).toBe(true);
      expect(conflict.content[0].text).toMatch(/aliases.*different values/);

      const ok = parseToolContent({
        result: await callTool('get_content', { id: content.id, contentId: content.id }, token),
      });
      expect(ok).toMatchObject({ object: 'content', id: content.id });
    });
  });

  describe('inline version parity & discovery capabilities', () => {
    it('get_content expand inlines the SAME version object get_content_version returns', async () => {
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent({
        result: await callTool(
          'create_content',
          { type: 'flow', name: 'Inline parity', themeId },
          token,
        ),
      });
      await callTool(
        'update_content_version',
        {
          contentId: created.id,
          versionId: created.editedVersionId,
          startRules: { when: [{ type: 'current_url', includes: ['/app'] }] },
        },
        token,
      );

      const inline = parseToolContent({
        result: await callTool('get_content', { id: created.id, expand: ['editedVersion'] }, token),
      }).editedVersion;
      // The once-dropped fields: the freeze stamp is present-and-null on a
      // draft, questions is null (= not requested, never []), rules are there.
      expect(inline.firstPublishedAt).toBeNull();
      expect(inline.questions).toBeNull();
      expect(inline.startRules).toMatchObject({
        when: [{ type: 'current_url', includes: ['/app'] }],
      });

      // Full equivalence: inline === standalone read without its expands.
      const standalone = parseToolContent({
        result: await callTool(
          'get_content_version',
          { contentId: created.id, id: created.editedVersionId },
          token,
        ),
      });
      expect(inline).toEqual(standalone);
    });

    it('get_segment expand=memberCount counts members in the requested environment', async () => {
      const token = await mint(
        [Capability.SegmentCreate, Capability.SegmentRead, Capability.SegmentUpdate],
        [projectA],
      );
      const seg = parseToolContent({
        result: await callTool(
          'create_segment',
          { name: 'Member count seg', bizType: 'user', kind: 'manual' },
          token,
        ),
      });
      // Plain get: no count (env-scoped data stays opt-in).
      const plain = parseToolContent({
        result: await callTool('get_segment', { id: seg.id }, token),
      });
      expect(plain).not.toHaveProperty('memberCount');

      const before = parseToolContent({
        result: await callTool(
          'get_segment',
          { id: seg.id, expand: ['memberCount'], environmentId: envA },
          token,
        ),
      });
      expect(before.memberCount).toBe(0);

      await callTool(
        'add_segment_member',
        { segmentId: seg.id, memberId: bizUserExternalId, environmentId: envA },
        token,
      );
      const after = parseToolContent({
        result: await callTool(
          'get_segment',
          { id: seg.id, expand: ['memberCount'], environmentId: envA },
          token,
        ),
      });
      expect(after.memberCount).toBe(1);
    });

    it('update_content_version validates its loosely-declared body against the REST schema', async () => {
      // The tool schema declares steps/rules loosely (the full vocabulary would
      // dominate tools/list); the handler must reject a malformed body with the
      // SAME issue shape REST produces — not pass garbage to the compiler.
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent({
        result: await callTool(
          'create_content',
          { type: 'flow', name: 'Loose-body parse', themeId },
          token,
        ),
      });
      const res = await callTool(
        'update_content_version',
        {
          contentId: created.id,
          versionId: created.editedVersionId,
          steps: [{ name: 'Bad', type: 'modal', content: 'not-an-array' }],
        },
        token,
      );
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/steps\[0\]\.content/);
    });

    it('echoing a step WITHOUT `content` preserves its blocks (placement-only edit)', async () => {
      // Regression for the acceptance review's S-level find: the schema default
      // + a service `?? []` turned "omitted content" into a full wipe.
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent({
        result: await callTool(
          'create_content',
          { type: 'flow', name: 'Keep my blocks', themeId },
          token,
        ),
      });
      const authored = parseToolContent({
        result: await callTool(
          'update_content_version',
          {
            contentId: created.id,
            versionId: created.editedVersionId,
            steps: [
              {
                name: 'Step',
                type: 'modal',
                content: [{ type: 'text', markdown: 'Precious **blocks**' }],
              },
            ],
          },
          token,
        ),
      });
      const cvid = authored.steps[0].cvid;

      const moved = parseToolContent({
        result: await callTool(
          'update_content_version',
          {
            contentId: created.id,
            versionId: created.editedVersionId,
            // No `content` — a placement-only echo must keep the blocks.
            steps: [{ cvid, name: 'Step', type: 'modal', placement: { position: 'center' } }],
          },
          token,
        ),
      });
      expect(moved.steps[0].content[0]).toMatchObject({
        type: 'text',
        markdown: 'Precious **blocks**',
      });
      expect(moved.steps[0].placement).toMatchObject({ position: 'center' });
    });

    it('validate warns when a theme switch LOSES the live theme’s variations', async () => {
      // The one change in the maintenance round that could silently harm real
      // users: variations do not travel with content, so moving onto a
      // variation-less theme drops dark mode for exactly the users it targeted
      // — green through write, publish and diagnose alike.
      const token = await mint(
        [
          Capability.ContentRead,
          Capability.ContentCreate,
          Capability.ContentUpdate,
          Capability.ContentPublish,
          Capability.ThemeCreate,
          Capability.ThemeRead,
        ],
        [projectA],
      );
      const themed = parseToolContent({
        result: await callTool(
          'create_theme',
          {
            name: 'With dark variation',
            variations: [
              {
                name: 'Dark',
                conditions: [
                  { type: 'attribute', scope: 'user', attribute: 'pan_plan', op: 'is', value: 'x' },
                ],
              },
            ],
          },
          token,
        ),
      });
      const created = parseToolContent({
        result: await callTool(
          'create_content',
          { type: 'flow', name: 'Theme migration', themeId: themed.id },
          token,
        ),
      });
      await callTool(
        'update_content_version',
        {
          contentId: created.id,
          versionId: created.editedVersionId,
          steps: [{ name: 'S', type: 'modal', content: [{ type: 'text', markdown: 'hi' }] }],
          startRules: { when: [{ type: 'current_url', includes: ['*'] }] },
        },
        token,
      );
      await callTool(
        'publish_content',
        { contentId: created.id, versionId: created.editedVersionId, environmentId: envA },
        token,
      );

      // Fork and point the draft at the variation-less theme.
      const draft = parseToolContent({
        result: await callTool('create_content_version', { contentId: created.id }, token),
      });
      await callTool(
        'update_content_version',
        { contentId: created.id, versionId: draft.id, themeId },
        token,
      );
      const report = parseToolContent({
        result: await callTool(
          'validate_content_version',
          { contentId: created.id, id: draft.id },
          token,
        ),
      });
      const themeWarning = report.warnings.find((w: { path: string }) => w.path === 'themeId');
      expect(themeWarning?.message).toMatch(/variations do NOT travel/);
      expect(themeWarning?.message).toContain('(1 conditional variation)');
    });

    it('rejects an unknown key INSIDE a non-flow data body, naming it', async () => {
      // Maintenance-round find: `actions` (the real key is `clickActions`) was
      // stripped by zod's default inside the polymorphic `data`, so the write
      // returned 200 with the task silently action-less. The type bodies are
      // strict now — same contract as unknown top-level tool args.
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent({
        result: await callTool(
          'create_content',
          { type: 'checklist', name: 'Strict data body', themeId },
          token,
        ),
      });
      const res = await callTool(
        'update_content_version',
        {
          contentId: created.id,
          versionId: created.editedVersionId,
          data: { items: [{ name: 'Task', actions: [{ type: 'navigate', url: '/x' }] }] },
        },
        token,
      );
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/Unrecognized key: "actions"/);
      expect(res.content[0].text).toContain('data.items[0]');
    });

    it('duplicate_theme copies settings + variations into a fresh non-default theme', async () => {
      const token = await mint([Capability.ThemeRead, Capability.ThemeCreate], [projectA]);
      const dup = parseToolContent({
        result: await callTool('duplicate_theme', { id: themeId, name: 'Derived copy' }, token),
      });
      expect(dup).toMatchObject({ object: 'theme', name: 'Derived copy', isDefault: false });
      expect(dup.id).not.toBe(themeId);
    });

    it('get_content_schema advertises per-type startRules capabilities', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const single = parseToolContent({
        result: await callTool('get_content_schema', { type: 'launcher' }, token),
      });
      // A launcher supports none of the start knobs — exactly what the write rejects.
      expect(single.capabilities).toEqual({
        startRules: {
          when: 'all',
          frequency: false,
          frequencyAtLeast: false,
          priority: false,
          waitSeconds: false,
          startIfNotComplete: false,
        },
        hideRules: false,
      });

      const batch = parseToolContent({
        result: await callTool('get_content_schema', { type: ['flow', 'announcement'] }, token),
      });
      expect(batch.capabilities.flow.startRules.when).toBe('all');
      // The scale itself, so nobody has to guess a valid value in production.
      expect(batch.capabilities.flow.startRules.priority).toEqual([
        'highest',
        'high',
        'medium',
        'low',
        'lowest',
      ]);
      // Announcement targeting is an audience filter: attribute/segment only.
      expect(batch.capabilities.announcement.startRules.when).toEqual(['attribute', 'segment']);
    });

    it('refuses a whitespace-only display name (same family as blank external ids)', async () => {
      const token = await mint([Capability.ContentRead, Capability.ContentCreate], [projectA]);
      const res = await callTool('create_content', { type: 'flow', name: '   ', themeId }, token);
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toMatch(/non-whitespace/);

      // duplicate_content once bypassed the rule with a hand-inlined `name`
      // schema (an audit caught it) — pin that its args ride the shared body.
      const source = await buildContent(prisma, {
        projectId: projectA,
        environmentId: envA,
        type: 'flow',
      });
      const dup = await callTool('duplicate_content', { contentId: source.id, name: '   ' }, token);
      expect(dup.isError).toBe(true);
      expect(dup.content[0].text).toMatch(/non-whitespace/);
    });
  });

  describe('auth guard', () => {
    it('rejects a missing Authorization header (401 E1010)', async () => {
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('E1010');
    });

    it('rejects an unknown token (401 E1000)', async () => {
      const res = await rpc(
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        'utp_not-a-real-secret',
      );
      // MCP normalizes auth failures to 401 + WWW-Authenticate (RFC 9728) so the
      // client knows to (re)run OAuth — see OpenAPIExceptionFilter.
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('write tools', () => {
    it('hides write tools without write scopes', async () => {
      const token = await mint([Capability.ContentRead], [projectA]);
      const res = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token);
      const names = extractResult(res).result.tools.map((t: { name: string }) => t.name);
      expect(names).not.toContain('create_content');
      expect(names).not.toContain('update_content_version');
    });

    it('create_content + update_content_version round-trip via MCP', async () => {
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );

      const list = extractResult(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token));
      const names = list.result.tools.map((t: { name: string }) => t.name);
      expect(names).toEqual(expect.arrayContaining(['create_content', 'update_content_version']));

      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP flow', themeId },
              },
            },
            token,
          ),
        ),
      );
      expect(created).toMatchObject({ object: 'content', type: 'flow', name: 'MCP flow' });

      const updated = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'update_content_version',
                arguments: {
                  contentId: created.id,
                  versionId: created.editedVersionId,
                  steps: [
                    {
                      name: 'Welcome',
                      type: 'modal',
                      content: [{ type: 'text', markdown: 'Hi **there**' }],
                    },
                  ],
                },
              },
            },
            token,
          ),
        ),
      );
      const step = updated.steps.find((s: { name: string }) => s.name === 'Welcome');
      expect(step).toMatchObject({ name: 'Welcome', type: 'modal' });
      expect(step.content[0]).toMatchObject({ type: 'text', markdown: 'Hi **there**' });

      // validate_content_version: the authored version is usable (theme + a step)
      const report = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 4,
              method: 'tools/call',
              params: {
                name: 'validate_content_version',
                arguments: { contentId: created.id, id: created.editedVersionId },
              },
            },
            token,
          ),
        ),
      );
      expect(report).toMatchObject({ ok: true, errors: [] });

      // list_content_versions works with contentId alone. Regression: a
      // multi-site anchor edit once pasted diagnose_content's url/userId
      // guards into this handler, bricking the tool while every suite stayed
      // green — because nothing here ever called it.
      const versions = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 5,
              method: 'tools/call',
              params: {
                name: 'list_content_versions',
                arguments: { contentId: created.id },
              },
            },
            token,
          ),
        ),
      );
      expect(versions.items.map((v: { id: string }) => v.id)).toContain(created.editedVersionId);
    });

    it('update_content_version writes a non-flow data body (checklist) via MCP', async () => {
      // Regression guard for the polymorphic `data` arg: when it was typed as
      // z.unknown() the tool exposed an empty JSON schema, so an MCP client could
      // not pass the nested object at all ("untyped parameter"). It must accept a
      // nested body and persist it.
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );

      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'checklist', name: 'MCP checklist', themeId },
              },
            },
            token,
          ),
        ),
      );
      expect(created).toMatchObject({
        object: 'content',
        type: 'checklist',
        name: 'MCP checklist',
      });

      // The write itself: a typeless (z.unknown) schema would have stopped the
      // client from passing this nested object at all.
      extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'update_content_version',
              arguments: {
                contentId: created.id,
                versionId: created.editedVersionId,
                data: {
                  buttonText: 'Get started',
                  items: [
                    { name: 'Explore the dashboard', completeWhen: [{ type: 'task_clicked' }] },
                  ],
                },
              },
            },
          },
          token,
        ),
      );

      // Read the body back (data is only inlined when expanded) to prove it persisted.
      const reread = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'get_content_version',
                arguments: {
                  contentId: created.id,
                  id: created.editedVersionId,
                  expand: ['data'],
                },
              },
            },
            token,
          ),
        ),
      );
      expect(reread.data).toMatchObject({ buttonText: 'Get started' });
      const item = reread.data.items.find(
        (i: { name: string }) => i.name === 'Explore the dashboard',
      );
      expect(item).toMatchObject({ name: 'Explore the dashboard' });

      // a one-item checklist with a name + completion condition is publish-usable
      const report = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: {
                name: 'validate_content_version',
                arguments: { contentId: created.id, id: created.editedVersionId },
              },
            },
            token,
          ),
        ),
      );
      expect(report).toMatchObject({ ok: true, errors: [] });
    });

    it('exposes update_content_version `data` as a typed object (not z.unknown)', async () => {
      // Schema-level guard for the P0 fix: z.unknown() compiled to an empty schema,
      // so a client couldn't tell `data` was an object and stringified it on the wire.
      const token = await mint([Capability.ContentRead, Capability.ContentUpdate], [projectA]);
      const list = extractResult(await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token));
      const tool = list.result.tools.find(
        (t: { name: string }) => t.name === 'update_content_version',
      );
      expect(tool?.inputSchema?.properties?.data?.type).toBe('object');
    });

    it('validate_content_version flags a start rule referencing an unknown attribute', async () => {
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );

      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP bad condition', themeId },
              },
            },
            token,
          ),
        ),
      );

      // A start rule whose condition points at an attribute code that doesn't
      // exist in the project. The WRITE now refuses (console sweep batch C —
      // the compile resolver used to pass the unknown code through and store a
      // dead reference that only validate/publish could catch later; segments
      // always refused at write time and versions now match that standard).
      const writeRes = await rpc(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'update_content_version',
            arguments: {
              contentId: created.id,
              versionId: created.editedVersionId,
              steps: [
                { name: 'Welcome', type: 'modal', content: [{ type: 'text', markdown: 'Hi' }] },
              ],
              startRules: {
                when: [
                  {
                    type: 'attribute',
                    scope: 'user',
                    attribute: 'ghost_attr',
                    op: 'is',
                    value: 'x',
                  },
                ],
              },
            },
          },
        },
        token,
      );
      const writeResult = extractResult(writeRes);
      expect(writeResult.result.isError).toBe(true);
      const errText = JSON.stringify(writeResult.result.content);
      expect(errText).toMatch(/ghost_attr/);
      expect(errText).toMatch(/unknown/i);
    });

    it('update_content_version rejects a run_javascript action with a specific, non-retryable message', async () => {
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP run-js', themeId },
              },
            },
            token,
          ),
        ),
      );

      // run_javascript actions are deliberately not writable via the API. The
      // codec must surface a SPECIFIC, non-retryable reason (E1017), not the
      // opaque "[E0003] System parameter error ... please try again later".
      const res = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'update_content_version',
              arguments: {
                contentId: created.id,
                versionId: created.editedVersionId,
                steps: [
                  {
                    name: 'Welcome',
                    type: 'modal',
                    content: [
                      {
                        type: 'button',
                        text: 'Go',
                        actions: [{ type: 'run_javascript', script: 'alert(1)' }],
                      },
                    ],
                  },
                ],
              },
            },
          },
          token,
        ),
      );
      expect(res.result?.isError).toBe(true);
      const text: string = res.result.content[0].text;
      expect(text).toMatch(/run_javascript/i);
      expect(text).not.toMatch(/try again later/i);
      expect(text).not.toContain('E0003');
    });

    it('publish_content + create_content_version via MCP', async () => {
      const token = await mint(
        [
          Capability.ContentRead,
          Capability.ContentCreate,
          Capability.ContentUpdate,
          Capability.ContentPublish,
        ],
        [projectA],
      );

      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP publish', themeId },
              },
            },
            token,
          ),
        ),
      );

      // author a usable step so the version passes the publish validator
      await rpc(
        {
          jsonrpc: '2.0',
          id: 15,
          method: 'tools/call',
          params: {
            name: 'update_content_version',
            arguments: {
              contentId: created.id,
              versionId: created.editedVersionId,
              steps: [
                { name: 'Welcome', type: 'modal', content: [{ type: 'text', markdown: 'Hi' }] },
              ],
            },
          },
        },
        token,
      );

      // publish the edited version to the (defaulted) environment
      const published = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'publish_content',
                arguments: { contentId: created.id, versionId: created.editedVersionId },
              },
            },
            token,
          ),
        ),
      );
      expect(
        published.environments.some(
          (e: { publishedVersionId: string }) => e.publishedVersionId === created.editedVersionId,
        ),
      ).toBe(true);

      // fork a new draft version
      const forked = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: { name: 'create_content_version', arguments: { contentId: created.id } },
            },
            token,
          ),
        ),
      );
      expect(forked).toMatchObject({ object: 'contentVersion' });
      expect(forked.id).not.toBe(created.editedVersionId);
    });

    it('list_publish_history returns the publish/unpublish ledger with resolved names', async () => {
      const token = await mint(
        [
          Capability.ContentRead,
          Capability.ContentCreate,
          Capability.ContentUpdate,
          Capability.ContentPublish,
        ],
        [projectA],
      );
      const created = JSON.parse(
        (await callTool('create_content', { type: 'flow', name: 'MCP ledger', themeId }, token))
          .content[0].text,
      );
      await callTool(
        'update_content_version',
        {
          contentId: created.id,
          versionId: created.editedVersionId,
          steps: [{ name: 'Welcome', type: 'modal', content: [{ type: 'text', markdown: 'Hi' }] }],
        },
        token,
      );
      await callTool(
        'publish_content',
        { contentId: created.id, versionId: created.editedVersionId },
        token,
      );
      await callTool('unpublish_content', { contentId: created.id }, token);

      const res = await callTool('list_publish_history', { contentId: created.id }, token);
      expect(res.isError).toBeFalsy();
      const page = JSON.parse(res.content[0].text);
      // Newest first: the unpublish tops the ledger, the original publish follows.
      expect(page.items.map((r: { action: string }) => r.action)).toEqual(['unpublish', 'publish']);
      for (const row of page.items) {
        expect(row.versionId).toBe(created.editedVersionId);
        expect(typeof row.versionSequence).toBe('number');
        expect(row.environmentId).toBe(envA);
        // Names resolve at read time: the environment and the API token that acted.
        expect(row.environmentName).toBeTruthy();
        expect(row.actorTokenName).toBe('mcp');
        expect(row.createdAt).toEqual(expect.any(String));
      }

      // A typo'd environment filter must read as an error, not an empty history.
      const bogus = await callTool(
        'list_publish_history',
        { contentId: created.id, environmentId: 'env_nope' },
        token,
      );
      expect(bogus.isError).toBe(true);
      expect(bogus.content[0].text).toContain('Environment not found');
    });

    it('update_content_version on a published version returns a readable E0049', async () => {
      // Regression for the empty "Command failed with no output": the version-lock
      // error extends BaseError (not OpenAPIError), so MCP used to surface its empty
      // native message. It must now come back with the code and real text.
      const token = await mint(
        [
          Capability.ContentRead,
          Capability.ContentCreate,
          Capability.ContentUpdate,
          Capability.ContentPublish,
        ],
        [projectA],
      );
      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP locked', themeId },
              },
            },
            token,
          ),
        ),
      );
      await rpc(
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'tools/call',
          params: {
            name: 'update_content_version',
            arguments: {
              contentId: created.id,
              versionId: created.editedVersionId,
              steps: [
                { name: 'Welcome', type: 'modal', content: [{ type: 'text', markdown: 'Hi' }] },
              ],
            },
          },
        },
        token,
      );
      await rpc(
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: {
            name: 'publish_content',
            arguments: { contentId: created.id, versionId: created.editedVersionId },
          },
        },
        token,
      );

      // the published version is now read-only — writing to it must fail readably
      const result = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 4,
            method: 'tools/call',
            params: {
              name: 'update_content_version',
              arguments: {
                contentId: created.id,
                versionId: created.editedVersionId,
                steps: [
                  { name: 'Changed', type: 'modal', content: [{ type: 'text', markdown: 'Edit' }] },
                ],
              },
            },
          },
          token,
        ),
      );
      expect(result.result?.isError).toBe(true);
      expect(result.result.content[0].text).toContain('E0049');
      // not the old empty string — there is real guidance after the code
      expect(result.result.content[0].text.length).toBeGreaterThan('[E0049] '.length);
    });

    it('update_content_version edits a forked version by stable cvid', async () => {
      // cvid survives a fork (the primary id does not), so an agent can edit a
      // just-forked version by the cvid it already knows — no read-back for new ids.
      const token = await mint(
        [Capability.ContentRead, Capability.ContentCreate, Capability.ContentUpdate],
        [projectA],
      );
      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_content',
                arguments: { type: 'flow', name: 'MCP cvid', themeId },
              },
            },
            token,
          ),
        ),
      );
      const authored = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'update_content_version',
                arguments: {
                  contentId: created.id,
                  versionId: created.editedVersionId,
                  steps: [
                    { name: 'Welcome', type: 'modal', content: [{ type: 'text', markdown: 'Hi' }] },
                  ],
                },
              },
            },
            token,
          ),
        ),
      );
      const cvid = authored.steps[0].cvid;
      expect(cvid).toBeTruthy();

      const forked = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 3,
              method: 'tools/call',
              params: { name: 'create_content_version', arguments: { contentId: created.id } },
            },
            token,
          ),
        ),
      );

      // edit the forked step by the cvid we already know (no id echoed)
      const updated = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 4,
              method: 'tools/call',
              params: {
                name: 'update_content_version',
                arguments: {
                  contentId: created.id,
                  versionId: forked.id,
                  steps: [
                    {
                      cvid,
                      name: 'Welcome edited',
                      type: 'modal',
                      content: [{ type: 'text', markdown: 'Edit' }],
                    },
                  ],
                },
              },
            },
            token,
          ),
        ),
      );
      // updated in place: still one step, same cvid, new name
      expect(updated.steps).toHaveLength(1);
      expect(updated.steps[0]).toMatchObject({ cvid, name: 'Welcome edited' });
    });

    it('hides bizdata / config write tools without their scopes', async () => {
      const token = await mint([Capability.UserRead], [projectA]);
      const names = extractResult(
        await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token),
      ).result.tools.map((t: { name: string }) => t.name);
      for (const n of ['upsert_user', 'upsert_company', 'create_segment', 'create_theme']) {
        expect(names).not.toContain(n);
      }
    });

    it('upsert_user creates an end-user via MCP (env defaulted)', async () => {
      const token = await mint([Capability.UserRead, Capability.UserWrite], [projectA]);
      const names = extractResult(
        await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token),
      ).result.tools.map((t: { name: string }) => t.name);
      expect(names).toContain('upsert_user');

      const user = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: {
                name: 'upsert_user',
                arguments: { id: 'mcp-new-user', attributes: { name: 'Zoe' } },
              },
            },
            token,
          ),
        ),
      );
      expect(user).toMatchObject({ object: 'user', id: 'mcp-new-user' });
    });

    it('upsert_user rejects an attribute value whose type mismatches its definition', async () => {
      const token = await mint([Capability.AttributeCreate, Capability.UserWrite], [projectA]);
      // Define a Number attribute on the user object.
      await rpc(
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/call',
          params: {
            name: 'create_attribute_definition',
            arguments: {
              scope: 'user',
              dataType: 'number',
              codeName: 'plan_level',
              displayName: 'Plan Level',
            },
          },
        },
        token,
      );
      // Upsert a user with a string value for the number attribute. v2 rejects
      // it (the SDK identify path would silently drop it).
      const result = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 2,
            method: 'tools/call',
            params: {
              name: 'upsert_user',
              arguments: { id: 'mcp-typed-user', attributes: { plan_level: 'pro' } },
            },
          },
          token,
        ),
      );
      expect(result.result?.isError).toBe(true);
      expect(result.result.content[0].text).toMatch(/type mismatch/i);
    });

    it('create_segment creates a manual segment via MCP', async () => {
      const token = await mint([Capability.SegmentCreate], [projectA]);
      const seg = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_segment',
                arguments: { name: 'MCP seg', bizType: 'user', kind: 'manual' },
              },
            },
            token,
          ),
        ),
      );
      expect(seg).toMatchObject({ object: 'segment', kind: 'manual', bizType: 'user' });
    });

    it('create_segment rejects a condition referencing an unknown attribute', async () => {
      const token = await mint([Capability.SegmentCreate], [projectA]);
      const result = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'create_segment',
              arguments: {
                name: 'MCP bad seg',
                bizType: 'user',
                kind: 'condition',
                conditions: [
                  {
                    type: 'attribute',
                    scope: 'user',
                    attribute: 'ghost_attr',
                    op: 'is',
                    value: 'x',
                  },
                ],
              },
            },
          },
          token,
        ),
      );
      // Segments have no publish gate, so the bad condition is rejected at write.
      expect(result.result?.isError).toBe(true);
      expect(result.result.content[0].text).toMatch(/unknown attribute/i);
    });

    it('create_environment round-trip via MCP (environment:manage)', async () => {
      const token = await mint([Capability.EnvironmentManage], [projectA]);
      const names = extractResult(
        await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' }, token),
      ).result.tools.map((t: { name: string }) => t.name);
      expect(names).toEqual(
        expect.arrayContaining(['create_environment', 'update_environment', 'delete_environment']),
      );

      const env = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 2,
              method: 'tools/call',
              params: { name: 'create_environment', arguments: { name: 'MCP env' } },
            },
            token,
          ),
        ),
      );
      expect(env).toMatchObject({ object: 'environment', name: 'MCP env' });
    });

    // update/delete_environment take the env id as a plain arg (not the
    // `environmentId` the dispatch wrapper scope-checks), so each handler must
    // assert the token's allowlist itself — else an env-restricted token could
    // rename/delete an environment outside its scope. duplicate_content is
    // project-level (no environment arg in v2), so it must NOT be gated.
    // envB lives only for this block (a 2nd env would otherwise break the
    // single-env auto-defaulting the other write-tool tests rely on).
    describe('environment allowlist enforcement (plain-id args)', () => {
      beforeAll(async () => {
        envB = (await buildEnvironment(prisma, { projectId: projectA, name: 'mcp-b' })).id;
      });
      afterAll(async () => {
        await prisma.environment.deleteMany({ where: { id: envB } });
      });

      it('update_environment rejects an out-of-scope target (E1029)', async () => {
        const token = await mint([Capability.EnvironmentManage], [projectA], [envA]);
        const result = await callTool('update_environment', { id: envB, name: 'Hijacked' }, token);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('E1029');
      });

      it('delete_environment rejects an out-of-scope target (E1029)', async () => {
        const token = await mint([Capability.EnvironmentManage], [projectA], [envA]);
        const result = await callTool('delete_environment', { id: envB }, token);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('E1029');
      });

      it('delete_environment 404s a NON-existent id even for a restricted token (E1026, not E1029)', async () => {
        // Existence before scope (matches the REST controller): a dead id reports
        // "not found", not "outside your scope".
        const token = await mint([Capability.EnvironmentManage], [projectA], [envA]);
        const result = await callTool('delete_environment', { id: 'does-not-exist' }, token);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('E1026');
      });

      it('get_environment enforces the allowlist (in-scope ok, out-of-scope E1029, dead id E1026)', async () => {
        // The READ item tool is env-addressed like the writes — the REST item route
        // refuses out-of-scope ids, and the MCP binding of the same service must
        // agree (list_environments stays discovery-open, flagged via inTokenScope).
        const token = await mint([Capability.EnvironmentRead], [projectA], [envA]);

        const ok = await callTool('get_environment', { id: envA }, token);
        expect(ok.isError).toBeFalsy();

        const denied = await callTool('get_environment', { id: envB }, token);
        expect(denied.isError).toBe(true);
        expect(denied.content[0].text).toContain('E1029');

        const dead = await callTool('get_environment', { id: 'does-not-exist' }, token);
        expect(dead.isError).toBe(true);
        expect(dead.content[0].text).toContain('E1026');
      });

      it('list_environments withholds the SDK token of out-of-scope environments', async () => {
        // The confirmed leak from the read-only-credential audit: discovery
        // listed the out-of-scope environment WITH its SDK token — an
        // ingestion credential (identify/track), i.e. a usable key to the
        // very environment the scope denies. Discovery stays; the key goes.
        const token = await mint([Capability.EnvironmentRead], [projectA], [envA]);
        const res = await callTool('list_environments', {}, token);
        expect(res.isError).toBeFalsy();
        const items = JSON.parse(res.content[0].text).items as {
          id: string;
          inTokenScope: boolean;
          token: string | null;
        }[];
        const inScope = items.find((e) => e.id === envA);
        const outOfScope = items.find((e) => e.id === envB);
        expect(inScope?.inTokenScope).toBe(true);
        expect(typeof inScope?.token).toBe('string');
        expect(outOfScope?.inTokenScope).toBe(false);
        expect(outOfScope?.token).toBeNull();
      });

      it('duplicate_content works for an env-restricted token (project-level action)', async () => {
        const source = await buildContent(prisma, {
          projectId: projectA,
          environmentId: envA,
          type: 'flow',
        });
        await buildVersion(prisma, { contentId: source.id, sequence: 0 });
        // Restricted to envA only — duplicate is project-level, so it must succeed;
        // the allowlist bites at publish_content instead.
        const token = await mint(
          [Capability.ContentCreate, Capability.ContentRead],
          [projectA],
          [envA],
        );
        const result = await callTool('duplicate_content', { contentId: source.id }, token);
        expect(result.isError).not.toBe(true);
      });
    });

    it('get_theme_schema returns the writable settings fields', async () => {
      const token = await mint([Capability.ThemeRead], [projectA]);
      const payload = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: { name: 'get_theme_schema', arguments: {} },
            },
            token,
          ),
        ),
      );
      expect(payload.body).toBe('settings');
      expect(Object.keys(payload.schema.properties)).toEqual(
        expect.arrayContaining(['font', 'brandColor', 'modal']),
      );
    });

    it('create_theme applies a partial settings patch via MCP (permissive arg, strict server)', async () => {
      const token = await mint([Capability.ThemeCreate, Capability.ThemeRead], [projectA]);
      const created = parseToolContent(
        extractResult(
          await rpc(
            {
              jsonrpc: '2.0',
              id: 1,
              method: 'tools/call',
              params: {
                name: 'create_theme',
                arguments: {
                  name: 'MCP themed',
                  settings: { font: { fontSize: 18 }, brandColor: { background: '#ff0000' } },
                },
              },
            },
            token,
          ),
        ),
      );
      expect(created).toMatchObject({ object: 'theme', name: 'MCP themed' });
      expect(created.settings.font.fontSize).toBe(18);
      expect(created.settings.brandColor.background).toBe('#ff0000');
      // auto colors derived server-side; untouched defaults preserved
      expect(created.settings.brandColor.autoHover).toBeTruthy();
      expect(created.settings.font.lineHeight).toBeTruthy();
    });

    it('get_theme reads a theme back; settings only with expand', async () => {
      const token = await mint([Capability.ThemeCreate, Capability.ThemeRead], [projectA]);
      const call = async (id: number, name: string, args: Record<string, unknown>) =>
        parseToolContent(
          extractResult(
            await rpc(
              { jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } },
              token,
            ),
          ),
        );
      const created = await call(1, 'create_theme', {
        name: 'MCP get-theme',
        settings: { brandColor: { background: '#0f172b' } },
      });
      // no expand → base fields, settings withheld
      const base = await call(2, 'get_theme', { id: created.id });
      expect(base).toMatchObject({ object: 'theme', id: created.id, name: 'MCP get-theme' });
      expect(base.settings).toBeFalsy();
      // expand settings → the actual stored values
      const full = await call(3, 'get_theme', { id: created.id, expand: ['settings'] });
      expect(full.settings.brandColor.background).toBe('#0f172b');
    });

    it('list_themes paginates — every theme reachable, truncation signalled via nextCursor', async () => {
      // The tool used to hardcode limit:100 and drop `next`: themes 101+ were
      // silently unreachable, so an agent "verified" a theme didn't exist.
      const token = await mint([Capability.ThemeRead], [projectA]);
      const call = async (id: number, args: Record<string, unknown>) =>
        parseToolContent(
          extractResult(
            await rpc(
              {
                jsonrpc: '2.0',
                id,
                method: 'tools/call',
                params: { name: 'list_themes', arguments: args },
              },
              token,
            ),
          ),
        );
      await buildTheme(prisma, { projectId: projectA, name: 'mcp-page-a' });
      await buildTheme(prisma, { projectId: projectA, name: 'mcp-page-b' });

      const first = await call(1, { limit: 2 });
      expect(first.items).toHaveLength(2);
      expect(first.nextCursor).toBeTruthy();

      const seen = new Set<string>(first.items.map((t: { id: string }) => t.id));
      let cursor = first.nextCursor as string | null;
      let page = 2;
      while (cursor) {
        const next = await call(page, { limit: 2, cursor });
        for (const t of next.items as { id: string }[]) {
          seen.add(t.id);
        }
        cursor = next.nextCursor;
        page += 1;
        expect(page).toBeLessThan(30); // runaway guard
      }
      const all = await prisma.theme.findMany({
        where: { projectId: projectA, deleted: false },
        select: { id: true },
      });
      for (const t of all) {
        expect(seen.has(t.id)).toBe(true);
      }
    });

    it('create_theme rejects an invalid settings patch via MCP (server validates the permissive arg)', async () => {
      const token = await mint([Capability.ThemeCreate], [projectA]);
      const result = extractResult(
        await rpc(
          {
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/call',
            params: {
              name: 'create_theme',
              arguments: { name: 'MCP bad', settings: { primaryColor: '#fff' } },
            },
          },
          token,
        ),
      );
      expect(result.result?.isError).toBe(true);
      expect(result.result.content[0].text).toContain('E1017');
    });
  });
});
