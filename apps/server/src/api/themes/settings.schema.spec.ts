import { themeSettingsPatchSchema } from './settings.schema';

// The schema is generated from the builder field schema (the constraint SSOT).
// These cover the generation rules, not every field — a builder change to a
// covered field's range/options flows through automatically.
describe('themeSettingsPatchSchema (generated from the field SSOT)', () => {
  const ok = (v: unknown) => themeSettingsPatchSchema.safeParse(v).success;

  it('accepts a partial patch of covered fields', () => {
    expect(
      ok({
        font: { fontSize: 18, linkColor: 'Auto' },
        border: { borderRadius: 12, borderWidthEnabled: true },
      }),
    ).toBe(true);
  });

  it('enforces numeric ranges from the FieldDef', () => {
    // font.fontSize is min 10 / max 24
    expect(ok({ font: { fontSize: 18 } })).toBe(true);
    expect(ok({ font: { fontSize: 999 } })).toBe(false);
    expect(ok({ font: { fontSize: 4 } })).toBe(false);
  });

  it('validates colors as hex, and allows Auto only where the field allows it', () => {
    // font.linkColor is a color field with allowAuto: true
    expect(ok({ font: { linkColor: '#ff0000' } })).toBe(true);
    expect(ok({ font: { linkColor: 'Auto' } })).toBe(true);
    expect(ok({ font: { linkColor: 'red' } })).toBe(false);
  });

  it('enforces enum options (numeric select)', () => {
    // font.fontWeightNormal is a valueAsNumber select of 100..900
    expect(ok({ font: { fontWeightNormal: 700 } })).toBe(true);
    expect(ok({ font: { fontWeightNormal: 555 } })).toBe(false);
  });

  it('rejects unknown paths (strict) at every level', () => {
    expect(ok({ font: { bogus: 1 } })).toBe(false);
    expect(ok({ totallyUnknown: 'x' })).toBe(false);
  });

  it('rejects a not-yet-covered niche-kind path (placement) as unknown', () => {
    // checklist.placement is a `placement` field — deferred, so not writable yet
    expect(ok({ checklist: { placement: { position: 'leftBottom' } } })).toBe(false);
  });

  it('accepts an empty patch', () => {
    expect(ok({})).toBe(true);
  });
});
