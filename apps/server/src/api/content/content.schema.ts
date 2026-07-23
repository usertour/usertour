import { ContentDataType } from '@usertour/types';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { contentVersion } from '../content-representation/representation.schema';
import { createdAtRangeFields, nameSearchField } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

export const contentExpand = z.enum(['editedVersion', 'publishedVersion']);

/**
 * One enum for every place a content type is named — create body AND list
 * filter — DERIVED from the domain's ContentDataType so a new type lands in
 * both automatically. The filter used to be a free string (a typo silently
 * returned an empty list that read as "no such content"), and the create body
 * carried its own hand-copied list.
 */
export const contentTypeEnum = z.enum(
  Object.values(ContentDataType) as [`${ContentDataType}`, ...`${ContentDataType}`[]],
);

export const listContentQuery = z.object({
  limit,
  cursor,
  ...nameSearchField,
  type: contentTypeEnum
    .optional()
    .describe(
      'Filter by content type. (A survey is a flow with question blocks — there is no separate ' +
        'survey type.)',
    ),
  published: z
    .stringbool()
    .optional()
    .describe('Filter to content published in at least one environment (true) or none (false).'),
  deleted: z
    .stringbool()
    .optional()
    .describe(
      'List soft-deleted (archived) content instead of live content — the recovery pool for restore.',
    ),
  expand: singleOrArray(contentExpand).describe('Inline: editedVersion and/or publishedVersion.'),
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  ...createdAtRangeFields,
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
  deleted: z.boolean(),
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
export const createContentBody = z
  .object({
    type: contentTypeEnum.describe(
      'Content kind. An `announcement` is a feed item delivered through a resource center that ' +
        'has an `announcement` block — publish alone does not surface it without one.',
    ),
    name: z
      .string()
      .optional()
      .describe('Display name. For `announcement` it also seeds the draft title.'),
    buildUrl: z.string().optional(),
    themeId: z
      .string()
      .optional()
      .describe(
        'Theme applied to the initial draft version. Required for every type except `tracker` ' +
          '(which has no UI) — content has no usable styling without one. List options with the ' +
          'themes endpoint; use the one with isDefault if unsure.',
      ),
  })
  .strict();
export class CreateContentBodyDto extends createZodDto(createContentBody) {}
export type CreateContentBody = z.infer<typeof createContentBody>;

/** Write body for PATCH content/:id (metadata only). */
export const updateContentBody = z
  .object({
    name: z.string().optional(),
    buildUrl: z.string().optional(),
  })
  .strict();
export class UpdateContentBodyDto extends createZodDto(updateContentBody) {}
export type UpdateContentBody = z.infer<typeof updateContentBody>;

/** Write body for PUT content/:id/environments/:environmentId (publish). */
export const publishContentBody = z.object({
  environmentId: z.string().describe('The environment to publish into (its live version is set).'),
  versionId: z.string().describe('The version to publish as that environment’s live version.'),
});
export class PublishContentBodyDto extends createZodDto(publishContentBody) {}
export type PublishContentBody = z.infer<typeof publishContentBody>;

export const unpublishContentBody = z.object({
  environmentId: z.string().describe('The environment to clear the live version in.'),
});
export class UnpublishContentBodyDto extends createZodDto(unpublishContentBody) {}
export type UnpublishContentBody = z.infer<typeof unpublishContentBody>;

/** Write body for POST content/:id/duplicate. */
// No environmentId here on purpose: content is a PROJECT-level resource. The v1
// "duplicate into an environment" parameter only ever set the copy's legacy
// homing column, which nothing user-visible reads (see the domain service) — an
// inert promise the v2 contract does not repeat. Publishing (the actually
// env-scoped act) stays explicit on the publish endpoint.
export const duplicateContentBody = z.object({
  name: z.string().optional().describe('Name for the copy (defaults to the source name).'),
});
export class DuplicateContentBodyDto extends createZodDto(duplicateContentBody) {}
export type DuplicateContentBody = z.infer<typeof duplicateContentBody>;

export type Content = z.infer<typeof content>;
export type ContentExpand = z.infer<typeof contentExpand>;
export type ListContentQuery = z.infer<typeof listContentQuery>;
export type GetContentQuery = z.infer<typeof getContentQuery>;
