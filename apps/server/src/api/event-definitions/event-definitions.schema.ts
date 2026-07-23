import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { singleOrArray } from '../shared/query';

import { codeName as codeNameSchema } from '../shared/codename';
import { nameSearchField } from '@/common/filters';
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
  orderBy: singleOrArray(
    // Same sortable set as the sibling attribute-definitions catalog: both are
    // definition directories with codeName/displayName columns.
    z.enum(['createdAt', '-createdAt', 'codeName', '-codeName', 'displayName', '-displayName']),
  ).describe('Order by createdAt / codeName / displayName (prefix - for descending).'),
});
export class ListEventDefinitionsQueryDto extends createZodDto(listEventDefinitionsQuery) {}

export const eventDefinition = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.EVENT_DEFINITION),
  createdAt: z.string(),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
  predefined: z
    .boolean()
    .describe(
      'true = a built-in Usertour lifecycle event (flow/launcher/checklist/survey/… ' +
        'started/ended/etc.) — NOT trackable: a tracker can only fire a CUSTOM event. ' +
        'false = a custom event you created (with create_event_definition).',
    ),
  attributes: z
    .array(z.string())
    .describe('codeNames of the event-scoped attributes attached to this event.'),
});
export class EventDefinitionDto extends createZodDto(eventDefinition) {}

// Attributes attached to an event are referenced by their event-scoped codeName
// (a reference to an existing attribute — NOT validated as a new codeName).
const eventAttributes = z
  .array(z.string())
  .describe(
    'codeNames of EXISTING event-scoped attributes to attach to this event — the built-in / ' +
      'predefined ones, or custom event properties that were auto-created when your app tracked ' +
      'this event with a properties payload. Note: you cannot PRE-DEFINE a new event property via ' +
      'create_attribute_definition (its scope is only user / company / companyMembership); event ' +
      'properties are created automatically at ingestion when the SDK calls ' +
      'usertour.track(name, { prop: value }). Unknown codeNames are rejected.',
  );

export const createEventDefinitionBody = z
  .object({
    codeName: codeNameSchema.describe('Stable identifier, unique per project. Immutable.'),
    displayName: z.string().min(1).describe('Human-readable name.'),
    description: z.string().optional().describe('Optional description.'),
    attributes: eventAttributes.optional(),
  })
  .strict();
export class CreateEventDefinitionBodyDto extends createZodDto(createEventDefinitionBody) {}

// codeName is fixed at creation; only the human-facing fields + attributes are mutable.
export const updateEventDefinitionBody = z
  .object({
    displayName: z.string().min(1).optional().describe('Human-readable name.'),
    description: z.string().optional().describe('Optional description.'),
    attributes: eventAttributes
      .optional()
      .describe('Replace the attached attributes with these codeNames. Omit to leave unchanged.'),
  })
  .strict();
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
