import { ApiObjectType } from '../shared/object-type';
import { Company, CompanyExpand } from './companies.schema';

/**
 * Pure biz-company -> API company mapping. Identical to the v1 facade (byte-for-byte
 * parity). `users` / `memberships` are always present (null unless expanded).
 */
export function mapCompany(bizCompany: any, expand?: CompanyExpand[]): Company {
  const memberships =
    expand?.includes('memberships') || expand?.includes('memberships.user')
      ? bizCompany.bizUsersOnCompany?.map((membership: any) => ({
          id: membership.id,
          object: ApiObjectType.COMPANY_MEMBERSHIP,
          attributes: membership.data || {},
          createdAt: membership.createdAt.toISOString(),
          companyId: membership.bizCompanyId,
          userId: membership.bizUserId,
          user: expand?.includes('memberships.user')
            ? {
                id: membership.bizUser.externalId,
                object: ApiObjectType.USER,
                attributes: membership.bizUser.data || {},
                createdAt: membership.bizUser.createdAt.toISOString(),
              }
            : undefined,
        }))
      : null;

  return {
    id: bizCompany.externalId,
    object: ApiObjectType.COMPANY,
    attributes: bizCompany.data || {},
    createdAt: bizCompany.createdAt.toISOString(),
    users: expand?.includes('users')
      ? bizCompany.bizUsersOnCompany?.map((membership: any) => ({
          id: membership.bizUser.externalId,
          object: ApiObjectType.USER,
          attributes: membership.bizUser.data || {},
          createdAt: membership.bizUser.createdAt.toISOString(),
        }))
      : null,
    memberships,
  };
}
