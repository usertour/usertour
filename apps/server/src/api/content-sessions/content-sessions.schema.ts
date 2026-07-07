import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { createdAtRangeFields } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

export const sessionExpand = z.enum(['answers', 'content', 'company', 'user', 'version']);

export const listContentSessionsQuery = z.object({
  contentId: z.string().optional().describe('Filter to a single content.'),
  userId: z.string().optional().describe('Filter to a single end-user.'),
  completed: z
    .stringbool()
    .optional()
    .describe('Filter to completed (true) or open (false) sessions.'),
  limit,
  cursor,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(sessionExpand).describe(
    'Inline: answers, content, company, user, version.',
  ),
  ...createdAtRangeFields,
});
export class ListContentSessionsQueryDto extends createZodDto(listContentSessionsQuery) {}

export const getContentSessionQuery = z.object({
  expand: singleOrArray(sessionExpand).describe(
    'Inline: answers, content, company, user, version.',
  ),
});
export class GetContentSessionQueryDto extends createZodDto(getContentSessionQuery) {}

const sessionAnswer = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT_SESSION_ANSWER),
  answerType: z.string(),
  answerValue: z.string(),
  createdAt: z.string(),
  questionCvid: z.string(),
  questionName: z.string(),
});

// A-shape embedded content: a lightweight reference — no publish state (neither
// the deprecated publishedVersionId nor environments[]). Full publish state lives
// on the /content endpoint.
const embeddedContent = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT),
  name: z.string(),
  type: z.string(),
  editedVersionId: z.string(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
const embeddedCompany = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.COMPANY),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
});
const embeddedUser = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.USER),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
});
const embeddedVersion = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT_VERSION),
  number: z.number(),
  updatedAt: z.string(),
  createdAt: z.string(),
});

export const contentSession = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.CONTENT_SESSION),
  answers: z.array(sessionAnswer).nullable(),
  completedAt: z.string().nullable(),
  completed: z.boolean(),
  contentId: z.string(),
  content: embeddedContent.nullable(),
  createdAt: z.string(),
  companyId: z.string().nullable(),
  company: embeddedCompany.nullable(),
  isPreview: z.boolean(),
  lastActivityAt: z.string(),
  progress: z.number(),
  userId: z.string().nullable(),
  user: embeddedUser.nullable(),
  versionId: z.string(),
  version: embeddedVersion.nullable(),
});
export class ContentSessionDto extends createZodDto(contentSession) {}

export const listContentSessionsResponse = z.object({
  results: z.array(contentSession),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListContentSessionsResponseDto extends createZodDto(listContentSessionsResponse) {}

export type ContentSession = z.infer<typeof contentSession>;
export type ContentSessionAnswer = z.infer<typeof sessionAnswer>;
export type SessionExpand = z.infer<typeof sessionExpand>;
export type ListContentSessionsQuery = z.infer<typeof listContentSessionsQuery>;
export type GetContentSessionQuery = z.infer<typeof getContentSessionQuery>;
