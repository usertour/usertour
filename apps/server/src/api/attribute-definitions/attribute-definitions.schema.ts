import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { deletedListField, singleOrArray, isoTimestamp } from '../shared/query';

import { AttributeDataTypeNames } from '@/modules/attributes/constants/attribute-data-type-names.constant';

import { codeName as codeNameSchema } from '../shared/codename';
import { nameSearchField } from '@/modules/common/utils/query-filters.util';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit, nextPageUrl, previousPageUrl } from '../shared/pagination.schema';

// Enum values are validated by zod, so a bad value yields E1017 (matching v1's
// class-validator enum). `scope` is deliberately a free string so an invalid
// value is rejected in the service as InvalidScopeError (E1015), not E1017.
const orderByField = z.enum([
  'createdAt',
  '-createdAt',
  'codeName',
  '-codeName',
  'displayName',
  '-displayName',
]);

export const listAttributeDefinitionsQuery = z.object({
  limit,
  cursor,
  ...nameSearchField,
  scope: z
    .string()
    .meta({ enum: ['user', 'company', 'companyMembership', 'eventDefinition'] })
    .optional()
    .describe(
      'Filter by scope: user, company, companyMembership, or eventDefinition (event attributes ' +
        '— attach them to events via the event-definitions surface).',
    ),
  orderBy: singleOrArray(orderByField).describe(
    'Order by createdAt / codeName / displayName (prefix - for descending). Text sorting is case-sensitive (byte order): uppercase sorts before lowercase.',
  ),
  eventName: singleOrArray(z.string()).describe(
    'Filter to attributes attached to these event(s), matched by event codeName (EXACT match — ' +
      'not displayName; a displayName silently matches nothing). Multiple values OR together.',
  ),
  deleted: deletedListField('attribute definitions'),
});
export class ListAttributeDefinitionsQueryDto extends createZodDto(listAttributeDefinitionsQuery) {}

// The only scopes an attribute can actually carry (bizType 1-4). Using the full
// ApiObjectType enum here made the docs list 17 impossible values (step, theme,
// contentAnalytics, ...) for a field that only ever holds these four.
const attributeScope = z.enum([
  ApiObjectType.USER,
  ApiObjectType.COMPANY,
  ApiObjectType.COMPANY_MEMBERSHIP,
  ApiObjectType.EVENT_DEFINITION,
]);

export const attribute = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.ATTRIBUTE_DEFINITION),
  predefined: z
    .boolean()
    .describe('Built-in attribute shipped by Usertour: it cannot be edited or deleted.'),
  createdAt: isoTimestamp,
  dataType: z
    .nativeEnum(AttributeDataTypeNames)
    .describe(
      'Value type. `random_ab` / `random_number` are SYSTEM-GENERATED bucketing types: each ' +
        'user (or company) is assigned a stable value — `A`/`B`, or an integer in ' +
        '[1, randomMax] — for A/B tests and canary rollouts. Their values cannot be written; ' +
        'their type and range are locked after creation.',
    ),
  randomMax: z
    .number()
    .int()
    .nullable()
    .describe(
      'Upper bound of a `random_number` attribute (values are 1..randomMax); null otherwise.',
    ),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
  scope: attributeScope.describe(
    'Which object the attribute belongs to. `eventDefinition` = an event attribute (attach it ' +
      'to events via the event-definitions surface).',
  ),
});
export class AttributeDto extends createZodDto(attribute) {}

// Scope + data type accepted on create — all four attribute scopes, matching the
// builder's attributes page (its Events tab hand-creates event attributes too);
// the special random_* data types are system-generated and not creatable via
// the API.
const createScope = attributeScope;
const createDataType = z.enum([
  AttributeDataTypeNames.Number,
  AttributeDataTypeNames.String,
  AttributeDataTypeNames.Boolean,
  AttributeDataTypeNames.List,
  AttributeDataTypeNames.DateTime,
  AttributeDataTypeNames.RandomAB,
  AttributeDataTypeNames.RandomNumber,
]);

export const createAttributeBody = z
  .object({
    scope: createScope.describe(
      'Which object the attribute belongs to: user, company, companyMembership, or ' +
        'eventDefinition (an event attribute — pre-defines an event property; attach it to ' +
        'events via the event-definitions surface. Tracking also auto-registers event ' +
        'properties at ingestion, so pre-defining is only needed to pin the type or attach ' +
        'before the first track).',
    ),
    dataType: createDataType.describe(
      'The attribute value type. `random_ab` / `random_number` (user and company scope only) ' +
        'are assigned by Usertour per entity, stable for life, and cannot be written.',
    ),
    randomMax: z
      .number()
      .int()
      .min(2)
      .max(10000)
      .optional()
      .describe(
        'Required for `random_number`: values are assigned in 1..randomMax. Ignored for other ' +
          'types. Locked after creation.',
      ),
    codeName: codeNameSchema.describe(
      'Stable identifier, unique per project + scope. Immutable. Must start with a letter, then ' +
        'letters/digits/underscores, 2\u2013100 chars.',
    ),
    displayName: z.string().min(1).describe('Human-readable name.'),
    description: z.string().optional().describe('Optional description.'),
  })
  .strict();
export class CreateAttributeBodyDto extends createZodDto(createAttributeBody) {}

// Only the human-facing fields are mutable; dataType / scope / codeName are fixed
// at creation.
export const updateAttributeBody = z
  .object({
    displayName: z.string().min(1).optional().describe('Human-readable name.'),
    description: z.string().optional().describe('Optional description.'),
    dataType: createDataType
      .optional()
      .describe(
        "Change the attribute's value type. Allowed only while NO stored value would conflict with " +
          'the new type (else rejected — clear the conflicting values, or delete + recreate). Fixes ' +
          'a wrong type inferred from a first mistyped upsert. `scope` and `codeName` stay immutable; ' +
          'a random bucketing type can neither be changed into nor out of.',
      ),
  })
  .strict();
export class UpdateAttributeBodyDto extends createZodDto(updateAttributeBody) {}

export const listAttributeDefinitionsResponse = z.object({
  results: z.array(attribute),
  next: nextPageUrl,
  previous: previousPageUrl,
});
export class ListAttributeDefinitionsResponseDto extends createZodDto(
  listAttributeDefinitionsResponse,
) {}

export type Attribute = z.infer<typeof attribute>;
export type ListAttributeDefinitionsQuery = z.infer<typeof listAttributeDefinitionsQuery>;
export type CreateAttributeBody = z.infer<typeof createAttributeBody>;
export type UpdateAttributeBody = z.infer<typeof updateAttributeBody>;
