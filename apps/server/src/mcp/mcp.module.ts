import { Module } from '@nestjs/common';

import { ApiTokenModule } from '@/api-token/api-token.module';
import { OpenAPIModule } from '@/openapi/openapi.module';

import { McpAuthGuard } from './mcp-auth.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

/**
 * The hand-rolled MCP endpoint. Reuses the ApiToken auth primitives
 * ({@link ApiTokenModule}) and the OpenAPI read facades ({@link OpenAPIModule})
 * rather than re-implementing data access — MCP is just an LLM-shaped transport
 * over the same read surfaces the v2 REST API exposes.
 */
@Module({
  imports: [ApiTokenModule, OpenAPIModule],
  controllers: [McpController],
  providers: [McpService, McpAuthGuard],
})
export class McpModule {}
