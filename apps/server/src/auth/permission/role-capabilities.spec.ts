import { ROLE_CAPABILITIES, roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';

/**
 * The matrix must keep the exact shape the codebase has today: every
 * capability is granted to one of the three known role sets, and the role
 * sets are strictly nested. A capability that produces any other role set
 * (e.g. VIEWER+OWNER but not ADMIN) would silently change authorization
 * once endpoints migrate to @RequirePermission, so it's a hard failure.
 */
const KNOWN_ROLE_SETS = [
  [Role.VIEWER, Role.ADMIN, Role.OWNER], // read tier
  [Role.ADMIN, Role.OWNER], // write tier
  [Role.OWNER], // owner-only tier
].map((roles) => new Set(roles));

const setsEqual = (left: Set<Role>, right: Set<Role>) =>
  left.size === right.size && [...left].every((role) => right.has(role));

describe('ROLE_CAPABILITIES matrix', () => {
  it('grants every capability to exactly one of the three known role tiers', () => {
    for (const capability of Object.values(Capability)) {
      const grantedTo = new Set(
        (Object.values(Role) as Role[]).filter((role) => roleCan(role, capability)),
      );
      // No orphan: every capability must belong to some role.
      expect(grantedTo.size).toBeGreaterThan(0);
      // No fourth combination beyond read / write / owner-only.
      expect(KNOWN_ROLE_SETS.some((known) => setsEqual(known, grantedTo))).toBe(true);
    }
  });

  it('keeps role capability sets strictly nested VIEWER ⊂ ADMIN ⊂ OWNER', () => {
    const viewer = new Set(ROLE_CAPABILITIES[Role.VIEWER]);
    const admin = new Set(ROLE_CAPABILITIES[Role.ADMIN]);
    const owner = new Set(ROLE_CAPABILITIES[Role.OWNER]);

    expect([...viewer].every((cap) => admin.has(cap))).toBe(true);
    expect([...admin].every((cap) => owner.has(cap))).toBe(true);
    expect(admin.size).toBeGreaterThan(viewer.size);
    expect(owner.size).toBeGreaterThan(admin.size);
  });
});
