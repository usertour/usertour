import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { orderByField, singleOrArray, isoTimestamp } from '../shared/query';

import { codeName as codeNameSchema } from '../shared/codename';
import { createdAtRangeFields } from '@/common/filters';
import { ApiObjectType } from '../shared/object-type';
import { cursor, limit, nextPageUrl, previousPageUrl } from '../shared/pagination.schema';

export const companyExpand = z.enum(['users', 'memberships', 'memberships.user']);

export const listCompaniesQuery = z.object({
  limit,
  cursor,
  orderBy: singleOrArray(orderByField).describe('Order by createdAt / -createdAt.'),
  expand: singleOrArray(companyExpand).describe('Inline: users, memberships, memberships.user.'),
  segmentId: z.string().optional().describe('Filter to companies in this segment.'),
  ...createdAtRangeFields,
});
export class ListCompaniesQueryDto extends createZodDto(listCompaniesQuery) {}

export const getCompanyQuery = z.object({
  expand: singleOrArray(companyExpand).describe('Inline: users, memberships, memberships.user.'),
});
export class GetCompanyQueryDto extends createZodDto(getCompanyQuery) {}

export const upsertCompanyBody = z
  .object({
    // Attribute keys are codeNames a write may CREATE → strict v2 codeName rule.
    attributes: z
      .record(codeNameSchema, z.any())
      .optional()
      .describe(
        'Custom attributes to set on the company (merged into existing attributes). Attributes with an unknown codeName AUTO-CREATE a definition (dataType inferred from the value) — a mistyped key silently creates a new attribute instead of updating the real one. Each key must ' +
          'be a valid codeName: start with a letter, then letters/digits/underscores, 2–100 chars.',
      ),
  })
  .strict();
export class UpsertCompanyBodyDto extends createZodDto(upsertCompanyBody) {}

export const upsertMembershipBody = z
  .object({
    // Attribute keys are codeNames a write may CREATE → strict v2 codeName rule.
    attributes: z
      .record(codeNameSchema, z.any())
      .optional()
      .describe(
        "Custom attributes to set on the membership (e.g. the user's role in the company). Each " +
          'key must be a valid codeName: start with a letter, then letters/digits/underscores, ' +
          '2–100 chars.',
      ),
  })
  .strict();
export class UpsertMembershipBodyDto extends createZodDto(upsertMembershipBody) {}

const embeddedUser = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.USER),
  attributes: z.record(z.string(), z.any()),
  createdAt: isoTimestamp,
});

export const companyMembership = z.object({
  id: z
    .string()
    .describe(
      'Internal membership record id (not addressable anywhere) — join on userId/companyId instead.',
    ),
  object: z.literal(ApiObjectType.COMPANY_MEMBERSHIP),
  attributes: z.record(z.string(), z.any()),
  createdAt: isoTimestamp,
  companyId: z.string().describe('External company id — the id companies are addressed by.'),
  userId: z.string().describe('External user id — the id users are addressed by.'),
  user: embeddedUser.optional(),
});

export class CompanyMembershipDto extends createZodDto(companyMembership) {}
export type CompanyMembership = z.infer<typeof companyMembership>;

export const company = z.object({
  id: z.string().describe('External company id — the id your app supplied at group/upsert.'),
  object: z.literal(ApiObjectType.COMPANY),
  attributes: z.record(z.string(), z.any()),
  createdAt: isoTimestamp,
  users: z
    .array(embeddedUser)
    .nullable()
    .describe('null = not expanded (pass expand: ["users"]); [] = expanded, none.'),
  memberships: z
    .array(companyMembership)
    .nullable()
    .describe('null = not expanded (pass expand: ["memberships"]); [] = expanded, none.'),
});
export class CompanyDto extends createZodDto(company) {}

export const listCompaniesResponse = z.object({
  results: z.array(company),
  next: nextPageUrl,
  previous: previousPageUrl,
});
export class ListCompaniesResponseDto extends createZodDto(listCompaniesResponse) {}

export type Company = z.infer<typeof company>;
export type CompanyExpand = z.infer<typeof companyExpand>;
export type ListCompaniesQuery = z.infer<typeof listCompaniesQuery>;
export type GetCompanyQuery = z.infer<typeof getCompanyQuery>;
export type UpsertCompanyBody = z.infer<typeof upsertCompanyBody>;
export type UpsertMembershipBody = z.infer<typeof upsertMembershipBody>;
