import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { singleOrArray } from '../shared/query';

import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';

import { codeName as codeNameSchema } from '../shared/codename';
import { nameSearchField } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

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
    .optional()
    .describe(
      'Filter by scope: user, company, companyMembership, or eventDefinition (event attributes ' +
        '— read-only here; they are managed via the event-definitions surface).',
    ),
  orderBy: singleOrArray(orderByField).describe('Order by field(s), e.g. -createdAt.'),
  eventName: singleOrArray(z.string()).describe('Filter to attributes on these event(s).'),
});
export class ListAttributeDefinitionsQueryDto extends createZodDto(listAttributeDefinitionsQuery) {}

export const attribute = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.ATTRIBUTE_DEFINITION),
  /** Built-in attribute (seeded by Usertour): not editable or deletable. */
  predefined: z.boolean(),
  createdAt: z.string(),
  dataType: z.nativeEnum(AttributeDataTypeNames),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
  scope: z.nativeEnum(ApiObjectType),
});
export class AttributeDto extends createZodDto(attribute) {}

// Scope + data type accepted on create. Scope is limited to the three biz-data
// objects (event attributes are managed via the events surface); the special
// random_* data types are system-generated and not creatable via the API.
const createScope = z.enum([
  ApiObjectType.USER,
  ApiObjectType.COMPANY,
  ApiObjectType.COMPANY_MEMBERSHIP,
]);
const createDataType = z.enum([
  AttributeDataTypeNames.Number,
  AttributeDataTypeNames.String,
  AttributeDataTypeNames.Boolean,
  AttributeDataTypeNames.List,
  AttributeDataTypeNames.DateTime,
]);

export const createAttributeBody = z.object({
  scope: createScope.describe(
    'Which object the attribute belongs to: user, company, or companyMembership.',
  ),
  dataType: createDataType.describe('The attribute value type.'),
  codeName: codeNameSchema.describe('Stable identifier, unique per project + scope. Immutable.'),
  displayName: z.string().min(1).describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
});
export class CreateAttributeBodyDto extends createZodDto(createAttributeBody) {}

// Only the human-facing fields are mutable; dataType / scope / codeName are fixed
// at creation.
export const updateAttributeBody = z.object({
  displayName: z.string().min(1).optional().describe('Human-readable name.'),
  description: z.string().optional().describe('Optional description.'),
  dataType: createDataType
    .optional()
    .describe(
      "Change the attribute's value type. Allowed only while NO stored value would conflict with " +
        'the new type (else rejected — clear the conflicting values, or delete + recreate). Fixes ' +
        'a wrong type inferred from a first mistyped upsert. `scope` and `codeName` stay immutable.',
    ),
});
export class UpdateAttributeBodyDto extends createZodDto(updateAttributeBody) {}

export const listAttributeDefinitionsResponse = z.object({
  results: z.array(attribute),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListAttributeDefinitionsResponseDto extends createZodDto(
  listAttributeDefinitionsResponse,
) {}

export type Attribute = z.infer<typeof attribute>;
export type ListAttributeDefinitionsQuery = z.infer<typeof listAttributeDefinitionsQuery>;
export type CreateAttributeBody = z.infer<typeof createAttributeBody>;
export type UpdateAttributeBody = z.infer<typeof updateAttributeBody>;
