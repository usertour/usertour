import {
  BUILDER_REGISTERED_PATHS,
  DERIVED_PATHS,
  VESTIGIAL_PATHS,
} from '../components/theme-builder/schema/registered-paths';
import { unionLeafPaths } from './extract-leaf-paths';
import { allFixtures } from './fixtures';

// Coverage guard: every leaf path declared by ThemeTypesSetting (as observed
// across the canonical fixtures) must be reachable from the builder via one
// of three buckets: a direct form field (BUILDER_REGISTERED_PATHS), an
// auto-derived path (DERIVED_PATHS — e.g. autoHover/autoActive), or a
// vestigial type field that v1 never exposed (VESTIGIAL_PATHS).
// If the schema gains a field but none of the registries cover it, this test
// fails with a precise list of missing paths.

describe('ThemeBuilder field coverage', () => {
  const schemaPaths = unionLeafPaths(...Object.values(allFixtures));
  const reachableSet = new Set([...BUILDER_REGISTERED_PATHS, ...DERIVED_PATHS, ...VESTIGIAL_PATHS]);

  it('reaches every canonical leaf path (registered ∪ derived ∪ vestigial)', () => {
    const missing = schemaPaths.filter((path) => !reachableSet.has(path));
    expect(missing).toEqual([]);
  });

  it('does not register duplicate paths', () => {
    expect(BUILDER_REGISTERED_PATHS.length).toBe(new Set(BUILDER_REGISTERED_PATHS).size);
  });

  it('registered, derived, and vestigial paths do not overlap', () => {
    const registered = new Set(BUILDER_REGISTERED_PATHS);
    const overlapDerived = DERIVED_PATHS.filter((p) => registered.has(p));
    const overlapVestigial = VESTIGIAL_PATHS.filter((p) => registered.has(p));
    const derivedSet = new Set(DERIVED_PATHS);
    const overlapDerivedVestigial = VESTIGIAL_PATHS.filter((p) => derivedSet.has(p));
    expect(overlapDerived).toEqual([]);
    expect(overlapVestigial).toEqual([]);
    expect(overlapDerivedVestigial).toEqual([]);
  });
});
