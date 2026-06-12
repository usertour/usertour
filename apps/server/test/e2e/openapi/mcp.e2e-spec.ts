import { INestApplication } from '@nestjs/common';
import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import request from 'supertest';

import { gqlData, graphql } from '../auth';
import {
  buildBizUser,
  buildContent,
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
  let themeId: string;
  const bizUserExternalId = 'mcp-biz-1';

  const CREATE = `mutation($input: CreateApiTokenInput!){
    createApiToken(input: $input){
      token
      apiToken { id }
    }
  }`;

  async function mint(scopes: Capability[], projectIds: string[]): Promise<string> {
    const res = await graphql(app, {
      query: CREATE,
      variables: { input: { name: 'mcp', scopes, projectIds } },
      token: ownerToken,
    });
    return gqlData(res).createApiToken.token;
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
      expect(result.result.serverInfo).toEqual({ name: 'usertour', version: '1.0.0' });
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
          'get_authoring_guide',
          'get_content',
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
  });

  describe('tools/call', () => {
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

    it('rejects an unknown token (403 E1000)', async () => {
      const res = await rpc(
        { jsonrpc: '2.0', id: 1, method: 'tools/list' },
        'utp_not-a-real-secret',
      );
      expect(res.status).toBe(403);
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
  });
});
