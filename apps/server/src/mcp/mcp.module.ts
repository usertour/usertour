import { Module } from '@nestjs/common';

import { ApiModule } from '@/api/api.module';
import { ApiTokenModule } from '@/api-token/api-token.module';
import { WebSocketModule } from '@/web-socket/web-socket.module';

import { McpAuthGuard } from './mcp-auth.guard';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';

/**
 * The MCP endpoint. Reuses the ApiToken auth primitives ({@link ApiTokenModule})
 * and the v2 read services ({@link ApiModule}) — MCP tools are just an LLM-shaped
 * binding of the same v2 read contracts the REST API exposes. {@link WebSocketModule}
 * provides ContentDiagnosisService for `diagnose_content`.
 */
@Module({
  imports: [ApiTokenModule, ApiModule, WebSocketModule],
  controllers: [McpController],
  providers: [McpService, McpAuthGuard],
})
export class McpModule {}
