import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';
import { authoringStep } from './authoring.schema';

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

export const question = z.object({
  object: z.literal(ApiObjectType.QUESTION),
  cvid: z.string(),
  name: z.string(),
  type: z.string(),
});

export const contentVersion = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT_VERSION),
  number: z.number(),
  themeId: z.string().nullable(),
  questions: z.array(question).nullable(),
  /** Decompiled steps — only present when the `steps` expand is requested. */
  steps: z.array(authoringStep).optional(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

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

export type Content = z.infer<typeof content>;
export type ContentVersion = z.infer<typeof contentVersion>;
export type ContentExpand = z.infer<typeof contentExpand>;
export type Question = z.infer<typeof question>;
export type ListContentQuery = z.infer<typeof listContentQuery>;
export type GetContentQuery = z.infer<typeof getContentQuery>;
