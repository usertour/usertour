import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { contentVersion } from '../content/content.schema';

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

export const versionExpand = z.enum(['questions']);
const orderByField = z.enum(['createdAt', '-createdAt']);

export const getContentVersionQuery = z.object({
  expand: singleOrArray(versionExpand).describe('Inline the version questions.'),
});
export class GetContentVersionQueryDto extends createZodDto(getContentVersionQuery) {}

export const listContentVersionsQuery = z.object({
  contentId: z.string().describe('The content whose versions to list.'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(versionExpand).describe('Inline the version questions.'),
});
export class ListContentVersionsQueryDto extends createZodDto(listContentVersionsQuery) {}

export class ContentVersionDto extends createZodDto(contentVersion) {}

export const listContentVersionsResponse = z.object({
  results: z.array(contentVersion),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListContentVersionsResponseDto extends createZodDto(listContentVersionsResponse) {}

export type VersionExpand = z.infer<typeof versionExpand>;
export type ListContentVersionsQuery = z.infer<typeof listContentVersionsQuery>;
export type GetContentVersionQuery = z.infer<typeof getContentVersionQuery>;
