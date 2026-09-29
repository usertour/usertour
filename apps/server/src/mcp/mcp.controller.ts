import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { Controller, Delete, Get, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';

import { protoKeyPath } from '@/api/shared/proto-key';
import { AuthedApiToken } from '@/modules/api-token/services/api-token-auth.service';
import { OpenAPIExceptionFilter } from '@/modules/common/filters/openapi-exception.filter';

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

    // Tool arguments are parsed by the SDK with the v2 zod schemas, whose
    // records drop an own `__proto__` key before any rule sees it. Refused
    // on the raw body, as the v2 pipe refuses it (JSON-RPC invalid params).
    const protoKey = protoKeyPath(req.body);
    if (protoKey) {
      const id = (req.body as { id?: unknown } | undefined)?.id ?? null;
      res.status(400).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `"__proto__" is not a valid key (at ${protoKey})` },
      });
      return;
    }

    const server = this.mcp.createServer(token);
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  }

  /**
   * Stateless transport: no standalone server-push SSE stream and no session to
   * terminate. The Streamable HTTP spec requires 405 (Method Not Allowed) here —
   * a client reads 405 as "no push stream, keep using POST" and carries on,
   * while the 404 these routes used to fall through to reads as "endpoint
   * gone": Cursor retried five times and tombstoned the whole transport right
   * after a successful authorization (measured).
   */
  @Get()
  sseNotOffered(@Res() res: Response): void {
    res
      .status(405)
      .set('Allow', 'POST')
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method Not Allowed: this server does not offer an SSE stream; use POST',
        },
        id: null,
      });
  }

  @Delete()
  noSessionToTerminate(@Res() res: Response): void {
    res
      .status(405)
      .set('Allow', 'POST')
      .json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method Not Allowed: stateless transport, no session to terminate',
        },
        id: null,
      });
  }
}
