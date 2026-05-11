import { cloneDeep, getPath, setPath } from '../components/theme-builder/draft-util';
import { BUILDER_REGISTERED_PATHS } from '../components/theme-builder/schema/registered-paths';
import { extractLeafPaths } from './extract-leaf-paths';
import { allFixtures } from './fixtures';

// Round-trip guards on the path-walking utilities the new builder relies on.
//
// These exercise the same getPath/setPath that useThemeBuilderDraft delegates
// to. If a regression breaks per-field reads/writes — silently dropping a
// sibling, or writing into the wrong subtree — these tests catch it without
// needing a DOM/RTL environment.

const SENTINEL = '__round_trip_sentinel__';

describe('Draft round-trip', () => {
  for (const [fixtureName, fixture] of Object.entries(allFixtures)) {
    describe(`fixture: ${fixtureName}`, () => {
      // Only exercise paths that exist in the fixture — registered paths are a
      // superset (we register every canonical path; not every path is set in
      // every fixture, especially optional ones).
      const presentPaths = new Set(extractLeafPaths(fixture));
      const exercisedPaths = BUILDER_REGISTERED_PATHS.filter((p) => presentPaths.has(p));

      it('exercises a non-trivial number of paths', () => {
        expect(exercisedPaths.length).toBeGreaterThan(50);
      });

      it.each(exercisedPaths)(
        'idempotent set: writing %s back to its own value preserves the fixture',
        (path) => {
          const value = getPath(fixture, path);
          const next = setPath(cloneDeep(fixture) as Record<string, unknown>, path, value);
          expect(next).toEqual(fixture);
        },
      );

      it.each(exercisedPaths)(
        'isolated set: writing %s to a sentinel changes only that path',
        (path) => {
          const next = setPath(cloneDeep(fixture) as Record<string, unknown>, path, SENTINEL);
          // Only the target path changed.
          expect(getPath(next, path)).toBe(SENTINEL);
          // Every other registered path that was present in the fixture keeps
          // its original value.
          for (const otherPath of exercisedPaths) {
            if (otherPath === path) continue;
            expect(getPath(next, otherPath)).toEqual(getPath(fixture, otherPath));
          }
        },
      );
    });
  }
});

// Sanity that the fixtures themselves are JSON-stable, so a deepEqual failure
// in the round-trip suite above can be trusted to indicate a real bug rather
// than fixture instability.
describe('Round-trip fixture invariants', () => {
  it.each(Object.entries(allFixtures))('%s round-trips through JSON', (_name, fixture) => {
    expect(JSON.parse(JSON.stringify(fixture))).toEqual(fixture);
  });
});
