import { INestApplication } from '@nestjs/common';
import { requiresEnvironmentScope } from '@usertour/helpers';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildContent,
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
          'get_authoring_guide',
          'get_content',
          'get_content_schema',
          'get_content_version',
          'get_user',
          'list_attribute_definitions',
          'list_content',
          'list_content_versions',
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

      // A renderable step (so the version is otherwise usable) plus a start rule
      // whose condition points at an attribute code that doesn't exist in the
      // project. The compile resolver passes the unknown code through unchanged,
      // so without semantic validation this would publish a silent dead ref.
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
      expect(report.ok).toBe(false);
      expect(
        report.errors.some((e: { message: string }) => /unknown attribute/.test(e.message)),
      ).toBe(true);
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
