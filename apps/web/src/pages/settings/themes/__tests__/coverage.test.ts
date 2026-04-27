import { BUILDER_REGISTERED_PATHS } from '../components/theme-builder/schema/registered-paths';
import { unionLeafPaths } from './extract-leaf-paths';
import { allFixtures } from './fixtures';

// Coverage guard: every leaf path declared by ThemeTypesSetting (as observed
// across the canonical fixtures) must be reachable through the new builder UI.
// If the schema gains a field but the builder schema doesn't register it, this
// test fails with a precise list of missing paths.

describe('ThemeBuilder field coverage', () => {
  const schemaPaths = unionLeafPaths(...Object.values(allFixtures));
  const registeredSet = new Set(BUILDER_REGISTERED_PATHS);

  it('registers every canonical leaf path', () => {
    const missing = schemaPaths.filter((path) => !registeredSet.has(path));
    expect(missing).toEqual([]);
  });

  it('does not register duplicate paths', () => {
    expect(BUILDER_REGISTERED_PATHS.length).toBe(new Set(BUILDER_REGISTERED_PATHS).size);
  });
});
