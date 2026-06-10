import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { contentVersion } from '../content-representation/representation.schema';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

export const contentExpand = z.enum(['editedVersion', 'publishedVersion']);
const orderByField = z.enum(['createdAt', '-createdAt']);

export const listContentQuery = z.object({
  limit,
  cursor,
  type: z
    .string()
    .optional()
    .describe('Filter by content type: flow, checklist, launcher, banner, survey.'),
  expand: singleOrArray(contentExpand).describe('Inline: editedVersion and/or publishedVersion.'),
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
});
export class ListContentQueryDto extends createZodDto(listContentQuery) {}

export const getContentQuery = z.object({
  expand: singleOrArray(contentExpand).describe('Inline: editedVersion and/or publishedVersion.'),
});
export class GetContentQueryDto extends createZodDto(getContentQuery) {}

/** Per-environment publish state — the v2 replacement for the deprecated single publishedVersionId. */
export const contentEnvironment = z.object({
  environmentId: z.string(),
  published: z.boolean(),
  publishedVersionId: z.string(),
  publishedAt: z.string(),
  publishedVersion: contentVersion.optional(),
});

export const content = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT),
  name: z.string(),
  type: z.string(),
  buildUrl: z.string().nullable(),
  editedVersionId: z.string(),
  editedVersion: contentVersion.optional(),
  environments: z.array(contentEnvironment),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export class ContentDto extends createZodDto(content) {}

export const listContentResponse = z.object({
  results: z.array(content),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListContentResponseDto extends createZodDto(listContentResponse) {}

/** Write body for POST content. */
export const createContentBody = z.object({
  type: z.string().describe('Content kind: flow, checklist, launcher, banner, survey.'),
  name: z.string().optional(),
  buildUrl: z.string().optional(),
});
export class CreateContentBodyDto extends createZodDto(createContentBody) {}
export type CreateContentBody = z.infer<typeof createContentBody>;

/** Write body for PATCH content/:id (metadata only). */
export const updateContentBody = z.object({
  name: z.string().optional(),
  buildUrl: z.string().optional(),
});
export class UpdateContentBodyDto extends createZodDto(updateContentBody) {}
export type UpdateContentBody = z.infer<typeof updateContentBody>;

export type Content = z.infer<typeof content>;
export type ContentExpand = z.infer<typeof contentExpand>;
export type ListContentQuery = z.infer<typeof listContentQuery>;
export type GetContentQuery = z.infer<typeof getContentQuery>;
