import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';
import { cursor, limit } from '../shared/pagination.schema';

/** A query param that arrives as a single value or a repeated array. */
function singleOrArray<T extends z.ZodTypeAny>(item: T) {
  return z.union([item, z.array(item)]).optional();
}

export const companyExpand = z.enum(['users', 'memberships', 'memberships.user']);
const orderByField = z.enum(['createdAt', '-createdAt']);

export const listCompaniesQuery = z.object({
  limit,
  cursor,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(companyExpand).describe('Inline: users, memberships, memberships.user.'),
  segmentId: z.string().optional().describe('Filter to companies in this segment.'),
});
export class ListCompaniesQueryDto extends createZodDto(listCompaniesQuery) {}

export const getCompanyQuery = z.object({
  expand: singleOrArray(companyExpand).describe('Inline: users, memberships, memberships.user.'),
});
export class GetCompanyQueryDto extends createZodDto(getCompanyQuery) {}

export const upsertCompanyBody = z.object({
  attributes: z
    .record(z.string(), z.any())
    .optional()
    .describe('Custom attributes to set on the company (merged into existing attributes).'),
});
export class UpsertCompanyBodyDto extends createZodDto(upsertCompanyBody) {}

export const upsertMembershipBody = z.object({
  attributes: z
    .record(z.string(), z.any())
    .optional()
    .describe("Custom attributes to set on the membership (e.g. the user's role in the company)."),
});
export class UpsertMembershipBodyDto extends createZodDto(upsertMembershipBody) {}

const embeddedUser = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.USER),
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
  user: embeddedUser.optional(),
});

export const company = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.COMPANY),
  attributes: z.record(z.string(), z.any()),
  createdAt: z.string(),
  // Always present (null when the expand isn't requested) — mirrors v1.
  users: z.array(embeddedUser).nullable(),
  memberships: z.array(companyMembership).nullable(),
});
export class CompanyDto extends createZodDto(company) {}

export const listCompaniesResponse = z.object({
  results: z.array(company),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListCompaniesResponseDto extends createZodDto(listCompaniesResponse) {}

export type Company = z.infer<typeof company>;
export type CompanyExpand = z.infer<typeof companyExpand>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuery>;
export type GetCompanyQuery = z.infer<typeof getCompanyQuery>;
export type UpsertCompanyBody = z.infer<typeof upsertCompanyBody>;
export type UpsertMembershipBody = z.infer<typeof upsertMembershipBody>;
