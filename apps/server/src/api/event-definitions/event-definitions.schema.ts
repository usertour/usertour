import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { codeName as codeNameSchema } from '../shared/codename';
import { nameSearchField } from '../shared/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/**
 * The single source of truth for the v2 event-definitions endpoint: these zod
 * schemas drive request validation (via ZodValidationPipe), the OpenAPI spec
 * (via nestjs-zod + @nestjs/swagger), the handler's types, and the MCP tool's
 * input schema — one definition, every binding.
 */

export const listEventDefinitionsQuery = z.object({
  cursor,
  limit,
  ...nameSearchField,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
});
export class ListEventDefinitionsQueryDto extends createZodDto(listEventDefinitionsQuery) {}

export const eventDefinition = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.EVENT_DEFINITION),
  createdAt: z.string(),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
  attributes: z
    .array(z.string())
    .describe('codeNames of the event-scoped attributes attached to this event.'),
});
export class EventDefinitionDto extends createZodDto(eventDefinition) {}

// Attributes attached to an event are referenced by their event-scoped codeName
// (a reference to an existing attribute — NOT validated as a new codeName).
const eventAttributes = z
  .array(z.string())
  .describe('codeNames of event-scoped attributes to attach. Unknown codeNames are rejected.');

export const createEventDefinitionBody = z.object({
  codeName: codeNameSchema.describe('Stable identifier, unique per project. Immutable.'),
  displayName: z.string().min(1).describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
  attributes: eventAttributes.optional(),
});
export class CreateEventDefinitionBodyDto extends createZodDto(createEventDefinitionBody) {}

// codeName is fixed at creation; only the human-facing fields + attributes are mutable.
export const updateEventDefinitionBody = z.object({
  displayName: z.string().min(1).optional().describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
  attributes: eventAttributes
    .optional()
    .describe('Replace the attached attributes with these codeNames. Omit to leave unchanged.'),
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
