import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';

import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/** A query param that arrives as a single string or a repeated array (mirrors v1). */
const stringOrArray = z.union([z.string(), z.array(z.string())]).optional();

export const listAttributeDefinitionsQuery = z.object({
  limit,
  cursor,
  scope: z.string().optional().describe('Filter by scope: user, company, or companyMembership.'),
  orderBy: stringOrArray.describe('Order by field(s), e.g. -createdAt.'),
  eventName: stringOrArray.describe('Filter to attributes on these event(s).'),
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
