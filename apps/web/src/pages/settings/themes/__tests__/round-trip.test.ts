import { allFixtures, defaultsFixture } from './fixtures';

// Round-trip contract for the new ThemeBuilder.
//
//   for each fixture F:
//     1. mount <ThemeBuilder initialSettings={F} onSave={spy} />
//     2. immediately invoke the save handler without any user interaction
//     3. expect(spy).toHaveBeenCalledWith(F)         // no field lost
//
//     for each leaf path P in F:
//       4. mount with F, edit only P via the rendered UI, save
//       5. expect saved JSON to equal F with only P changed
//
// Step 1-3 catches "the new builder silently drops fields on a no-op save".
// Step 4-5 catches "the new builder reaches every settings field through the
// UI", which together with the schema-snapshot test forms the field coverage
// guard.
//
// Currently skipped — wired up once the new builder lands and exposes a
// testable mount entry point.
describe.skip('ThemeBuilder round-trip', () => {
  it.each(Object.entries(allFixtures))('preserves %s fixture on no-op save', (_name, _fixture) => {
    // TODO(theme-rewrite): mount <ThemeBuilder /> with fixture, trigger save,
    // assert the saved settings deep-equal the fixture.
  });
});

// Sanity check that the deep-equality strategy works on a concrete fixture.
// Not the actual round-trip test — that's blocked above — but this proves the
// fixture itself is structurally clonable / comparable, so when the real test
// goes live a failure is unambiguous.
describe('ThemeBuilder round-trip — fixture invariants', () => {
  it('defaults fixture is deep-equal to its structured clone', () => {
    expect(structuredClone(defaultsFixture)).toEqual(defaultsFixture);
  });

  it('every fixture is JSON-serializable without loss', () => {
    for (const [name, fixture] of Object.entries(allFixtures)) {
      const roundTripped = JSON.parse(JSON.stringify(fixture));
      expect(roundTripped).toEqual(fixture);
      // name shows up in the assertion message if a fixture ever fails.
      expect(name).toBeDefined();
    }
  });
});
