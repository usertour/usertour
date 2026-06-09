import { ApiObjectType } from '../shared/object-type';
import { User, UserExpand } from './users.schema';

/**
 * Pure biz-user -> API user mapping. Intentionally identical to the v1 facade so
 * the external JSON is byte-for-byte the same (asserted by the v1<->v2 parity
 * e2e). `companies` / `memberships` are always present (null unless expanded).
 */
export function mapUser(bizUser: any, expand?: UserExpand[]): User {
  const memberships =
    expand?.includes('memberships') || expand?.includes('memberships.company')
      ? bizUser.bizUsersOnCompany?.map((membership: any) => ({
          id: membership.id,
          object: ApiObjectType.COMPANY_MEMBERSHIP,
          attributes: membership.data || {},
          createdAt: membership.createdAt.toISOString(),
          companyId: membership.bizCompanyId,
          userId: membership.bizUserId,
          company: expand?.includes('memberships.company')
            ? {
                id: membership.bizCompany.externalId,
                object: ApiObjectType.COMPANY,
                attributes: membership.bizCompany.data || {},
                createdAt: membership.bizCompany.createdAt.toISOString(),
              }
            : undefined,
        }))
      : null;

  return {
    id: bizUser.externalId,
    object: ApiObjectType.USER,
    attributes: bizUser.data || {},
    createdAt: bizUser.createdAt.toISOString(),
    companies: expand?.includes('companies')
      ? bizUser.bizUsersOnCompany?.map((membership: any) => ({
          id: membership.bizCompany.externalId,
          object: ApiObjectType.COMPANY,
          attributes: membership.bizCompany.data || {},
          createdAt: membership.bizCompany.createdAt.toISOString(),
        }))
      : null,
    memberships,
  };
}
