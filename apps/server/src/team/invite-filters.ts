import { Prisma } from '@prisma/client';

/**
 * Where clause matching invites that are still acceptable: not expired /
 * canceled / deleted, and (if expiresAt is set) not past the TTL.
 *
 * Centralised so admin list, dedup check, seat counter, and accept-time
 * lookup all agree on what "active" means. Spreading it into a larger
 * where clause is safe as long as the caller does not also use a top-level
 * `OR` field.
 */
export function activeInviteWhere(): Prisma.InviteWhereInput {
  return {
    expired: false,
    canceled: false,
    deleted: false,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
}
