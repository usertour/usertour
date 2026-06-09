import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { OpenApiObjectType } from '@/common/openapi/types';

/**
 * The single source of truth for the v2 event-definitions endpoint: these zod
 * schemas drive request validation (via ZodValidationPipe), the OpenAPI spec
 * (via nestjs-zod + @nestjs/swagger), the handler's types, and the MCP tool's
 * input schema — one definition, every binding.
 */

// Shared pagination fragments — reused across resources (and by MCP).
export const limit = z.coerce
  .number()
  .int()
  .min(1)
  .max(100)
  .default(20)
  .describe('Max items per page (1-100, default 20).');
export const cursor = z.string().optional().describe('Pagination cursor from a prior response.');

export const listEventDefinitionsQuery = z.object({ cursor, limit });
export class ListEventDefinitionsQueryDto extends createZodDto(listEventDefinitionsQuery) {}

export const eventDefinition = z.object({
  id: z.string(),
  object: z.literal(OpenApiObjectType.EVENT_DEFINITION),
  createdAt: z.string(),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
});

export const listEventDefinitionsResponse = z.object({
  results: z.array(eventDefinition),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListEventDefinitionsResponseDto extends createZodDto(listEventDefinitionsResponse) {}

export type EventDefinition = z.infer<typeof eventDefinition>;
export type ListEventDefinitionsQuery = z.infer<typeof listEventDefinitionsQuery>;
