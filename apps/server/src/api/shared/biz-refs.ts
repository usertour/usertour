import { ApiObjectType } from './object-type';

/**
 * Shared public-JSON shapes for biz users / companies / memberships, so the
 * companies and users mappers (and their `users` / `companies` / `memberships`
 * expands) emit ONE definition instead of four hand-written copies that can drift.
 * User/company refs are the v1-facade byte-for-byte shapes (the v1<->v2 parity
 * e2e pins them); the membership shape deliberately diverges — see mapMembership.
 */

/** A user reference (the shape emitted for `users` / `memberships.user`). */
export function mapUserRef(bizUser: any) {
  return {
    id: bizUser.externalId,
    object: ApiObjectType.USER,
    attributes: bizUser.data || {},
    createdAt: bizUser.createdAt.toISOString(),
  };
}

/** A company reference (the shape emitted for `companies` / `memberships.company`). */
export function mapCompanyRef(bizCompany: any) {
  return {
    id: bizCompany.externalId,
    object: ApiObjectType.COMPANY,
    attributes: bizCompany.data || {},
    createdAt: bizCompany.createdAt.toISOString(),
  };
}

/**
 * A company-membership object. The v2 surface addresses users and companies by
 * EXTERNAL id everywhere, so the caller passes the pair explicitly — one side
 * from the parent it's expanding under, the other from the included relation.
 * (Deliberate divergence from the v1 facade, which emits the internal row ids
 * here; feeding those into any other endpoint 404s.) `id` is the membership's
 * OWN identifier — the pair has no external addressing of its own. `nested`
 * inlines the counterpart reference the caller expanded (the company mapper
 * adds `user`, the user mapper adds `company`).
 */
export function mapMembership(
  membership: any,
  ids: { companyId: string; userId: string },
  nested?: { user?: ReturnType<typeof mapUserRef>; company?: ReturnType<typeof mapCompanyRef> },
) {
  return {
    id: membership.id,
    object: ApiObjectType.COMPANY_MEMBERSHIP,
    attributes: membership.data || {},
    createdAt: membership.createdAt.toISOString(),
    companyId: ids.companyId,
    userId: ids.userId,
    ...nested,
  };
}
