import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray } from '../shared/query';

import { codeName as codeNameSchema } from '../shared/codename';
import { createdAtRangeFields } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

export const userExpand = z.enum(['companies', 'memberships', 'memberships.company']);

export const listUsersQuery = z.object({
  limit,
  cursor,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(userExpand).describe(
    'Inline: companies, memberships, memberships.company.',
  ),
  email: z.string().email().optional().describe('Filter to a user with this email.'),
  companyId: z.string().optional().describe('Filter to users in this company.'),
  segmentId: z.string().optional().describe('Filter to users in this segment.'),
  ...createdAtRangeFields,
});
export class ListUsersQueryDto extends createZodDto(listUsersQuery) {}

export const getUserQuery = z.object({
  expand: singleOrArray(userExpand).describe(
    'Inline: companies, memberships, memberships.company.',
  ),
});
export class GetUserQueryDto extends createZodDto(getUserQuery) {}

export const upsertUserBody = z.object({
  // Attribute keys are codeNames a write may CREATE, so they carry the strict v2
  // codeName rule (charset + length). The SDK identify path stays lenient.
  attributes: z
    .record(codeNameSchema, z.any())
    .optional()
    .describe(
      'Custom attributes to set on the user (merged into existing attributes). Each key must ' +
        'be a valid codeName: start with a letter, then letters/digits/underscores, 2–20 chars.',
    ),
});
export class UpsertUserBodyDto extends createZodDto(upsertUserBody) {}

export const company = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.COMPANY),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
});

export const companyMembership = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.COMPANY_MEMBERSHIP),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
  companyId: z.string(),
  userId: z.string(),
  company: company.optional(),
});

export const user = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.USER),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
  // Always present (null when the expand isn't requested) — mirrors v1.
  companies: z.array(company).nullable(),
  memberships: z.array(companyMembership).nullable(),
});
export class UserDto extends createZodDto(user) {}

export const listUsersResponse = z.object({
  results: z.array(user),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListUsersResponseDto extends createZodDto(listUsersResponse) {}

export type User = z.infer<typeof user>;
export type UserExpand = z.infer<typeof userExpand>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type GetUserQuery = z.infer<typeof getUserQuery>;
export type UpsertUserBody = z.infer<typeof upsertUserBody>;
