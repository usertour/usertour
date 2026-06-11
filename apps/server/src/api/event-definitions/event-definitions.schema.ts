import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * The single source of truth for the v2 event-definitions endpoint: these zod
 * schemas drive request validation (via ZodValidationPipe), the OpenAPI spec
 * (via nestjs-zod + @nestjs/swagger), the handler's types, and the MCP tool's
 * input schema — one definition, every binding.
 */

export const listEventDefinitionsQuery = z.object({ cursor, limit });
export class ListEventDefinitionsQueryDto extends createZodDto(listEventDefinitionsQuery) {}

export const eventDefinition = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.EVENT_DEFINITION),
  createdAt: z.string(),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
});
export class EventDefinitionDto extends createZodDto(eventDefinition) {}

export const createEventDefinitionBody = z.object({
  codeName: z.string().min(1).describe('Stable identifier, unique per project. Immutable.'),
  displayName: z.string().min(1).describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
});
export class CreateEventDefinitionBodyDto extends createZodDto(createEventDefinitionBody) {}

// codeName is fixed at creation; only the human-facing fields are mutable.
export const updateEventDefinitionBody = z.object({
  displayName: z.string().min(1).optional().describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
});
export class UpdateEventDefinitionBodyDto extends createZodDto(updateEventDefinitionBody) {}

export const listEventDefinitionsResponse = z.object({
  results: z.array(eventDefinition),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListEventDefinitionsResponseDto extends createZodDto(listEventDefinitionsResponse) {}

export type EventDefinition = z.infer<typeof eventDefinition>;
export type ListEventDefinitionsQuery = z.infer<typeof listEventDefinitionsQuery>;
export type CreateEventDefinitionBody = z.infer<typeof createEventDefinitionBody>;
export type UpdateEventDefinitionBody = z.infer<typeof updateEventDefinitionBody>;
