import { Capability } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';
import { ZodTypeAny } from 'zod';

import { ApiTokenAuthService, AuthedApiToken } from '@/api-token/api-token-auth.service';
import { ApiAttributeDefinitionsService } from '@/api/attribute-definitions/attribute-definitions.service';
import { ApiContentService } from '@/api/content/content.service';
import { ApiEventDefinitionsService } from '@/api/event-definitions/event-definitions.service';
import { ApiUsersService } from '@/api/users/users.service';

/**
 * The v2 API services an MCP tool handler can reach through its context. Kept
 * narrow (read surfaces only) so a tool can't accidentally call a mutating
 * method — MCP tools are just another binding of the v2 read contracts.
 */
export interface McpServices {
  content: ApiContentService;
  attributeDefinitions: ApiAttributeDefinitionsService;
  eventDefinitions: ApiEventDefinitionsService;
  users: ApiUsersService;
}

/**
 * Per-call context handed to every tool handler. `projectId` is already
 * resolved from the (single-project) token; `auth` lets a handler re-assert its
 * capability (defense-in-depth) and resolve environments.
 */
export interface McpToolContext {
  token: AuthedApiToken;
  projectId: string;
  auth: ApiTokenAuthService;
  prisma: PrismaService;
  services: McpServices;
}

/**
 * A zod "raw shape" — a plain object mapping argument names to zod schemas. The
 * MCP SDK accepts this directly as `inputSchema`, derives the JSON Schema it
 * advertises to clients, and validates/parses incoming arguments against it
 * before the handler runs.
 */
export type ZodRawShape = Record<string, ZodTypeAny>;

/**
 * A single MCP tool. `capability` both scope-gates tool registration (a tool is
 * only registered on the per-request server if its capability is in the token's
 * scopes) and is re-checked inside the handler. `inputSchema` is a zod raw shape
 * the SDK uses to validate args; handlers therefore receive already-parsed args.
 */
export interface McpTool {
  name: string;
  title: string;
  description: string;
  capability: Capability;
  inputSchema: ZodRawShape;
  handler(args: Record<string, unknown>, ctx: McpToolContext): Promise<unknown>;
}
