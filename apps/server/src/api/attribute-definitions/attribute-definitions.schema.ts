import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';

import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

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
  scope: z.string().optional().describe('Filter by scope: user, company, or companyMembership.'),
  orderBy: singleOrArray(orderByField).describe('Order by field(s), e.g. -createdAt.'),
  eventName: singleOrArray(z.string()).describe('Filter to attributes on these event(s).'),
});
export class ListAttributeDefinitionsQueryDto extends createZodDto(listAttributeDefinitionsQuery) {}

export const attribute = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.ATTRIBUTE_DEFINITION),
  createdAt: z.string(),
  dataType: z.nativeEnum(AttributeDataTypeNames),
  description: z.string(),
  displayName: z.string(),
  codeName: z.string(),
  scope: z.nativeEnum(ApiObjectType),
});

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
