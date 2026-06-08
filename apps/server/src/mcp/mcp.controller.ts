import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Controller, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';

import { AuthedApiToken } from '@/api-token/api-token-auth.service';
import { OpenAPIExceptionFilter } from '@/common/filters/openapi-exception.filter';

import { McpAuthGuard } from './mcp-auth.guard';
import { McpService } from './mcp.service';

/**
 * MCP (Model Context Protocol) endpoint, driven by the official
 * `@modelcontextprotocol/sdk`. Each POST builds a fresh, scope-gated
 * {@link McpServer} for the authenticated token and hands the raw Node
 * request/response to a stateless `StreamableHTTPServerTransport`, which speaks
 * the full JSON-RPC protocol (initialize / tools/list / tools/call,
 * notifications, batching) and writes the response itself.
 *
 * Auth is the token guard (no `:projectId` in the path — the project comes from
 * the token); per-tool capability checks happen in the registered tool callbacks
 * in {@link McpService}. The OpenAPI exception filter serializes guard auth
 * failures (which throw before the transport touches the response) like the v2
 * routes.
 *
 * `@Res()` is required because the SDK transport writes directly to the response
 * stream; this disables Nest's automatic serialization. The already-parsed
 * `req.body` is passed to `handleRequest` so the transport doesn't try to
 * re-read the (already consumed) request stream.
 */
@Controller('mcp')
@UseGuards(McpAuthGuard)
@UseFilters(OpenAPIExceptionFilter)
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  async handle(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = (req as Request & { apiToken: AuthedApiToken }).apiToken;

    const server = this.mcp.createServer(token);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }
}
