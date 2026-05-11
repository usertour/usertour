import { allFixtures, defaultsFixture, darkFixture, richFixture } from './fixtures';
import { sortedLeafPaths, unionLeafPaths } from './extract-leaf-paths';

// These tests freeze the shape of ThemeTypesSetting. Any field added, removed,
// renamed, or changed in nesting depth will fail one of the snapshots, forcing
// an explicit `jest -u` and a code review of the schema change.
//
// During the theme builder rewrite, this is the safety net that catches "we
// forgot to migrate field X" — if a field exists in the old data but the new
// builder drops it during save, the snapshot will diverge from the saved JSON.

describe('ThemeTypesSetting schema snapshot', () => {
  it('defaults fixture has stable leaf paths', () => {
    expect(sortedLeafPaths(defaultsFixture)).toMatchSnapshot();
  });

  it('dark fixture has stable leaf paths', () => {
    expect(sortedLeafPaths(darkFixture)).toMatchSnapshot();
  });

  it('rich fixture (all optional fields populated) has stable leaf paths', () => {
    expect(sortedLeafPaths(richFixture)).toMatchSnapshot();
  });

  it('union of all fixtures has stable leaf paths (authoritative schema)', () => {
    expect(unionLeafPaths(...Object.values(allFixtures))).toMatchSnapshot();
  });
});
