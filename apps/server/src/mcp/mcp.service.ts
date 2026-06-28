import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { ApiTokenAuthService, AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiAttributeDefinitionsService } from '@/api/attribute-definitions/attribute-definitions.service';
import { ApiCompaniesService } from '@/api/companies/companies.service';
import { ApiContentService } from '@/api/content/content.service';
import { ApiContentSessionsService } from '@/api/content-sessions/content-sessions.service';
import { ApiContentVersionsService } from '@/api/content-versions/content-versions.service';
import { ApiEnvironmentsService } from '@/api/environments/environments.service';
import { ApiEventDefinitionsService } from '@/api/event-definitions/event-definitions.service';
import { ApiSegmentsService } from '@/api/segments/segments.service';
import { ApiThemesService } from '@/api/themes/themes.service';
import { ApiUsersService } from '@/api/users/users.service';
import { BaseError } from '@/common/errors/base';
import { AuditService } from '@/audit/audit.service';
import { ContentDiagnosisService } from '@/web-socket/core/content-diagnosis.service';

import { McpServices, McpTool, McpToolContext } from './mcp.types';
import { buildMcpAuditEntry } from './tools/audit-meta';
import { buildReadTools, resolveEnvironment } from './tools/read-tools';
import { buildWriteTools } from './tools/write-tools';

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
    private readonly audit: AuditService,
    private readonly contentDiagnosis: ContentDiagnosisService,
    contentService: ApiContentService,
    contentVersionsService: ApiContentVersionsService,
    attributeDefinitionsService: ApiAttributeDefinitionsService,
    eventDefinitionsService: ApiEventDefinitionsService,
    usersService: ApiUsersService,
    themesService: ApiThemesService,
    companiesService: ApiCompaniesService,
    segmentsService: ApiSegmentsService,
    sessionsService: ApiContentSessionsService,
    environmentsService: ApiEnvironmentsService,
  ) {
    this.services = {
      content: contentService,
      contentVersions: contentVersionsService,
      attributeDefinitions: attributeDefinitionsService,
      eventDefinitions: eventDefinitionsService,
      users: usersService,
      themes: themesService,
      companies: companiesService,
      segments: segmentsService,
      sessions: sessionsService,
      environments: environmentsService,
    };
    this.tools = [...buildReadTools(), ...buildWriteTools()];
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
          ...(tool.annotations ? { annotations: tool.annotations } : {}),
        },
        async (args: Record<string, unknown>) => {
          try {
            // Resolve the (single) project lazily so building the server can't
            // fail for a multi-project token — only the tool call does.
            const projectId = this.resolveProjectId(token);
            await this.auth.authorize(token, projectId, tool.capability);
            const ctx: McpToolContext = {
              token,
              projectId,
              auth: this.auth,
              prisma: this.prisma,
              services: this.services,
              contentDiagnosis: this.contentDiagnosis,
            };
            const payload = await this.runWithAudit(tool, args ?? {}, ctx);
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
   * Run a tool handler and, for write tools carrying `audit` metadata, capture an
   * audit entry around it: resolve the environment once (env-scoped resources),
   * snapshot `before` (delete/update), run the handler, then record the change
   * with the actor from the token. Auditing is a side-channel — `record` never
   * throws — so it cannot affect the handler's result.
   */
  private async runWithAudit(
    tool: McpTool,
    args: Record<string, unknown>,
    ctx: McpToolContext,
  ): Promise<unknown> {
    const meta = tool.audit;
    if (!meta) {
      return tool.handler(args, ctx);
    }
    const environment = meta.envScoped ? await resolveEnvironment(args, ctx) : undefined;
    const before = meta.fetchBefore ? await meta.fetchBefore(args, ctx, environment) : undefined;
    const result = await tool.handler(args, ctx);
    this.audit.record(buildMcpAuditEntry(tool, ctx, args, result, before, environment));
    return result;
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
    // Every domain error extends BaseError and carries its text in
    // getMessage()/messageDict — the native Error.message is left empty. Checking
    // only OpenAPIError (a BaseError subclass) left the errors that extend
    // BaseError directly — version-lock (E0049), conflict (E0050), params, no
    // permission — surfacing as an empty string ("Command failed with no output").
    // Prefix the code so an agent gets a stable handle to branch on.
    if (error instanceof BaseError) {
      return `[${error.code}] ${error.getMessage('en')}`;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
