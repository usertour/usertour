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
    .describe(
      'Filter by GENUINE completion: true = the user reached the goal (flow finished / every ' +
        'checklist task done), false = did not. This is NOT "ended" — a dismissed session is ' +
        'not completed, and a completed checklist may still be open.',
    ),
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
  answerValue: z
    .union([z.number(), z.string(), z.array(z.string())])
    .nullable()
    .describe(
      "The answer's value in its real type, keyed off answerType: nps / star-rating / scale → a " +
        'number; single-line-text / multi-line-text → a string; multiple-choice → an array of the ' +
        'chosen option strings. null only when the stored value is missing.',
    ),
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
  completed: z
    .boolean()
    .describe(
      'Whether the user GENUINELY reached the goal — a flow ran to its end (or an explicit ' +
        'completion step) / every checklist task was checked. Independent of whether the session ' +
        'is still open: a completed checklist can still be showing, and a flow can complete at a ' +
        'mid-flow completion step and keep running. Only flows and checklists can be completed; ' +
        'banners / launchers / resource centers are seen-then-dismissed and are always false.',
    ),
  completedAt: z
    .string()
    .nullable()
    .describe('When the goal was reached (null if never completed).'),
  endedAt: z
    .string()
    .nullable()
    .describe(
      'When the session closed (null while it is still open/active). A session can be completed ' +
        'but not yet ended (still open), or ended without being completed (dismissed).',
    ),
  endReason: z
    .string()
    .nullable()
    .describe(
      'Why the session ended (null while open) — e.g. `user_closed`, `auto_dismissed`, ' +
        '`action`, `end_from_program`, `admin_ended`. Distinguishes a genuine finish from a ' +
        'dismissal even when both leave the session ended.',
    ),
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
