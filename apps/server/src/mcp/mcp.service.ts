import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { ApiTokenAuthService, AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiAttributeDefinitionsService } from '@/api/attribute-definitions/attribute-definitions.service';
import { ApiContentService } from '@/api/content/content.service';
import { ApiEventDefinitionsService } from '@/api/event-definitions/event-definitions.service';
import { ApiUsersService } from '@/api/users/users.service';
import { OpenAPIError } from '@/common/errors/errors';

import { McpServices, McpTool } from './mcp.types';
import { buildReadTools } from './tools/read-tools';

const SERVER_INFO = { name: 'usertour', version: '1.0.0' };

/**
 * The MCP application layer. Owns the read-only tool registry and builds a fresh
 * {@link McpServer} per request with only the tools whose capability is in the
 * caller's token scopes registered. The protocol (JSON-RPC framing, batching,
 * the initialize handshake, SSE/JSON responses) is handled by the SDK transport
 * wired up in the controller; auth lives in {@link ApiTokenAuthService}.
 */
@Injectable()
export class McpService {
  private readonly tools: McpTool[];
  private readonly services: McpServices;

  constructor(
    private readonly auth: ApiTokenAuthService,
    private readonly prisma: PrismaService,
    contentService: ApiContentService,
    attributeDefinitionsService: ApiAttributeDefinitionsService,
    eventDefinitionsService: ApiEventDefinitionsService,
    usersService: ApiUsersService,
  ) {
    this.services = {
      content: contentService,
      attributeDefinitions: attributeDefinitionsService,
      eventDefinitions: eventDefinitionsService,
      users: usersService,
    };
    this.tools = buildReadTools();
  }

  /**
   * Build a per-request MCP server for `token`, registering only the tools whose
   * capability is in the token's granted scopes (so `tools/list` is scope-gated
   * by construction). Project resolution and capability re-checks happen lazily
   * inside each tool callback — never at build time — so `initialize` and
   * `tools/list` keep working even for a token that isn't valid for any one tool
   * (e.g. a multi-project token).
   */
  createServer(token: AuthedApiToken): McpServer {
    const server = new McpServer(SERVER_INFO, { capabilities: { tools: {} } });
    const scopes = this.auth.scopes(token);

    for (const tool of this.tools) {
      if (!scopes.includes(tool.capability)) {
        continue;
      }
      server.registerTool(
        tool.name,
        {
          title: tool.title,
          description: tool.description,
          inputSchema: tool.inputSchema,
        },
        async (args: Record<string, unknown>) => {
          try {
            // Resolve the (single) project lazily so building the server can't
            // fail for a multi-project token — only the tool call does.
            const projectId = this.resolveProjectId(token);
            await this.auth.authorize(token, projectId, tool.capability);
            const payload = await tool.handler(args ?? {}, {
              token,
              projectId,
              auth: this.auth,
              prisma: this.prisma,
              services: this.services,
            });
            return { content: [{ type: 'text' as const, text: JSON.stringify(payload) }] };
          } catch (error) {
            return {
              content: [{ type: 'text' as const, text: this.errorMessage(error) }],
              isError: true,
            };
          }
        },
      );
    }

    return server;
  }

  /**
   * The single project the token may act on. MCP carries no `:projectId` in the
   * path, so a token must be scoped to exactly one project to be usable here.
   */
  resolveProjectId(token: AuthedApiToken): string {
    if (token.projects.length === 1) {
      return token.projects[0].projectId;
    }
    throw new Error('API token must be scoped to exactly one project to use MCP.');
  }

  /** Turn any thrown error into a human-readable message for the tool result. */
  private errorMessage(error: unknown): string {
    if (error instanceof OpenAPIError) {
      return error.getMessage('en');
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
