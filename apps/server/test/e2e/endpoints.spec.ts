import { ENDPOINT_CAPABILITY } from '@/modules/auth/permission/endpoint-capability.map';

import { ENDPOINTS } from './endpoints';

/**
 * Keeps the authorization registry honest.
 *
 * `endpoint-decorator.spec.ts` already closes the loop between the resolvers
 * and the capability map (every `@RequirePermission` is mapped, with the
 * capability the map assigns). What nothing enforced is the last link: that
 * every mapped endpoint is actually EXERCISED by the authorization contract —
 * permission.e2e-spec.ts (deny/allow per role) and the smoke spot-check, both
 * driven by ENDPOINTS. 26 endpoints had drifted out of it, including the
 * identity-verification signing secrets and the audit log, so a wrong
 * capability on any of them would have failed silently.
 *
 * The REST v2 side has the same guard (api/capability-matrix.e2e-spec.ts diffs
 * its table against the generated OpenAPI document); this is its GraphQL twin.
 * It is a unit spec on purpose: adding an endpoint must fail in seconds, not
 * only in the e2e run.
 */
describe('permission endpoint registry (test/e2e/endpoints.ts)', () => {
  const registered = ENDPOINTS.map((endpoint) => endpoint.key);

  it('covers every endpoint in the capability map, and nothing more', () => {
    const mapped = Object.keys(ENDPOINT_CAPABILITY);
    // Missing: add a row (an endpoint nothing asserts the role contract for).
    // Extra: the endpoint is gone or was renamed — drop or rename the row.
    expect([...registered].sort()).toEqual([...mapped].sort());
  });

  it('registers each endpoint once', () => {
    expect(registered).toHaveLength(new Set(registered).size);
  });
});
