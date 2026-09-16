import { ROLE_CAPABILITIES, roleCan } from '@usertour/constants';
import { Capability, Role } from '@usertour/types';

/**
 * The matrix must keep its tiered shape: every capability is granted to
 * exactly one of the four known role sets, and the sets are strictly nested
 * (VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER). A capability that produces any other
 * role set (e.g. VIEWER+OWNER but not ADMIN) would silently change
 * authorization for every endpoint mapped to it, so it's a hard failure.
 */
const KNOWN_ROLE_SETS = [
  [Role.VIEWER, Role.EDITOR, Role.ADMIN, Role.OWNER], // read tier
  [Role.EDITOR, Role.ADMIN, Role.OWNER], // write tier
  [Role.ADMIN, Role.OWNER], // admin tier
  [Role.OWNER], // owner-only tier
].map((roles) => new Set(roles));

const setsEqual = (left: Set<Role>, right: Set<Role>) =>
  left.size === right.size && [...left].every((role) => right.has(role));

describe('ROLE_CAPABILITIES matrix', () => {
  it('grants every capability to exactly one of the four known role tiers', () => {
    for (const capability of Object.values(Capability)) {
      const grantedTo = new Set(
        (Object.values(Role) as Role[]).filter((role) => roleCan(role, capability)),
      );
      // No orphan: every capability must belong to some role.
      expect(grantedTo.size).toBeGreaterThan(0);
      // No fifth combination beyond read / write / admin / owner-only.
      expect(KNOWN_ROLE_SETS.some((known) => setsEqual(known, grantedTo))).toBe(true);
    }
  });

  it('keeps role capability sets strictly nested VIEWER ⊂ EDITOR ⊂ ADMIN ⊂ OWNER', () => {
    const ladder = [Role.VIEWER, Role.EDITOR, Role.ADMIN, Role.OWNER].map(
      (role) => new Set(ROLE_CAPABILITIES[role]),
    );
    for (let i = 1; i < ladder.length; i++) {
      const lower = ladder[i - 1];
      const upper = ladder[i];
      expect([...lower].every((cap) => upper.has(cap))).toBe(true);
      expect(upper.size).toBeGreaterThan(lower.size);
    }
  });

  it('EDITOR publishes only within a whitelist; ADMIN and OWNER publish anywhere', () => {
    expect(roleCan(Role.EDITOR, Capability.ContentPublish)).toBe(true);
    expect(roleCan(Role.EDITOR, Capability.ContentPublishAnyEnvironment)).toBe(false);
    expect(roleCan(Role.ADMIN, Capability.ContentPublishAnyEnvironment)).toBe(true);
    expect(roleCan(Role.OWNER, Capability.ContentPublishAnyEnvironment)).toBe(true);
    expect(roleCan(Role.VIEWER, Capability.ContentPublish)).toBe(false);
  });
});
