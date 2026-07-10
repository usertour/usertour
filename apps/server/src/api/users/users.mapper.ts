import { ApiObjectType } from '../shared/object-type';
import { mapCompanyRef, mapMembership } from '../shared/biz-refs';
import { User, UserExpand } from './users.schema';

/**
 * Pure biz-user -> API user mapping. Intentionally identical to the v1 facade so
 * the external JSON is byte-for-byte the same (asserted by the v1<->v2 parity
 * e2e). `companies` / `memberships` are always present (null unless expanded).
 */
export function mapUser(bizUser: any, expand?: UserExpand[]): User {
  const memberships =
    expand?.includes('memberships') || expand?.includes('memberships.company')
      ? bizUser.bizUsersOnCompany?.map((membership: any) =>
          mapMembership(
            membership,
            expand?.includes('memberships.company')
              ? { company: mapCompanyRef(membership.bizCompany) }
              : undefined,
          ),
        )
      : null;

  return {
    id: bizUser.externalId,
    object: ApiObjectType.USER,
    attributes: bizUser.data || {},
    createdAt: bizUser.createdAt.toISOString(),
    companies: expand?.includes('companies')
      ? bizUser.bizUsersOnCompany?.map((membership: any) => mapCompanyRef(membership.bizCompany))
      : null,
    memberships,
  };
}
