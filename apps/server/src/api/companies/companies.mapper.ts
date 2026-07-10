import { ApiObjectType } from '../shared/object-type';
import { mapMembership, mapUserRef } from '../shared/biz-refs';
import { Company, CompanyExpand } from './companies.schema';

/**
 * Pure biz-company -> API company mapping. Identical to the v1 facade (byte-for-byte
 * parity). `users` / `memberships` are always present (null unless expanded).
 */
export function mapCompany(bizCompany: any, expand?: CompanyExpand[]): Company {
  const memberships =
    expand?.includes('memberships') || expand?.includes('memberships.user')
      ? bizCompany.bizUsersOnCompany?.map((membership: any) =>
          mapMembership(
            membership,
            expand?.includes('memberships.user')
              ? { user: mapUserRef(membership.bizUser) }
              : undefined,
          ),
        )
      : null;

  return {
    id: bizCompany.externalId,
    object: ApiObjectType.COMPANY,
    attributes: bizCompany.data || {},
    createdAt: bizCompany.createdAt.toISOString(),
    users: expand?.includes('users')
      ? bizCompany.bizUsersOnCompany?.map((membership: any) => mapUserRef(membership.bizUser))
      : null,
    memberships,
  };
}
