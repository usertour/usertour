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

  it('covers placement / progress; accepts media-asset keys (guarded in the service)', () => {
    // placement: position enum (checklist's 5-set) + numeric offsets
    expect(ok({ checklist: { placement: { position: 'leftBottom', positionOffsetX: 10 } } })).toBe(
      true,
    );
    expect(ok({ checklist: { placement: { position: 'nope' } } })).toBe(false);
    // dynamic-number progress heights
    expect(ok({ progress: { narrowHeight: 8 } })).toBe(true);
    expect(ok({ progress: { narrowHeight: 999 } })).toBe(false);
    // Media assets pass the SCHEMA so a read response round-trips; the service
    // rejects them when the value differs from the theme's current one.
    expect(ok({ avatar: { type: 'url', url: 'https://x/a.png' } })).toBe(true);
    expect(ok({ resourceCenter: { logoUrl: 'https://x/l.png' } })).toBe(true);
    // a plain style number (icon size) stays in
    expect(ok({ avatar: { size: 40 } })).toBe(true);
  });

  it('accepts an empty patch', () => {
    expect(ok({})).toBe(true);
  });

  // ── stored-data round-trip (console sweep endpoint 7) ─────────────────
  // Every rule below exists because 3928/3928 production themes failed to
  // round-trip before it: the builder's STORED shapes disagree with its UI
  // field list, and the schema must accept what reads return.

  it('normalizes numeric strings (the builder stores "8" for borderRadius)', () => {
    const r = themeSettingsPatchSchema.safeParse({ border: { borderRadius: '8' } });
    expect(r.success).toBe(true);
    expect((r as { data: { border: { borderRadius: number } } }).data.border.borderRadius).toBe(8);
    // Range still applies to the coerced value; junk strings still fail.
    expect(ok({ border: { borderRadius: '999' } })).toBe(false);
    expect(ok({ border: { borderRadius: 'abc' } })).toBe(false);
  });

  it('treats null as an omitted key (stored "unset" borderRadius)', () => {
    const r = themeSettingsPatchSchema.safeParse({
      resourceCenterLauncherButton: { borderRadius: null },
    });
    expect(r.success).toBe(true);
    // Null must be STRIPPED (≡ omitted), never passed through: a passed-through
    // null would overwrite the stored value in the merge. The .nullable() in
    // the generator is declaration-only (so spec-validating clients accept the
    // round-trip); this assertion pins the runtime side of that split.
    const data = (r as { data: { resourceCenterLauncherButton?: Record<string, unknown> } }).data;
    expect(data.resourceCenterLauncherButton?.borderRadius).toBeUndefined();
  });

  it('accepts the full stored color-group shape incl. derived auto* companions', () => {
    // ThemeTypesSettingsColor always persists all six keys; the SSOT only
    // lists the UI-exposed ones. brandColor's autoHover/autoActive are the
    // derived concrete colors behind 'Auto' (re-derived server-side on write).
    expect(
      ok({
        brandColor: {
          color: '#f8fafc',
          hover: 'Auto',
          active: 'Auto',
          background: '#111111',
          autoHover: '#3162ec',
          autoActive: '#274fbd',
        },
        buttons: {
          primary: {
            backgroundColor: {
              color: '#FFFFFF',
              hover: 'Auto',
              active: 'Auto',
              background: 'Auto',
            },
            textColor: { color: 'Auto', hover: 'Auto', active: 'Auto', background: '#FFFFFF' },
          },
        },
        banner: {
          backgroundColor: { color: '#FFFFFF', hover: 'Auto', active: 'Auto', background: 'Auto' },
        },
      }),
    ).toBe(true);
  });

  it('does NOT extend the resource-center launcher color group (a different type)', () => {
    // {background, hover, active, foreground} — no `color`, no auto* keys.
    expect(ok({ resourceCenterLauncherButton: { color: { foreground: '#fff' } } })).toBe(true);
    expect(ok({ resourceCenterLauncherButton: { color: { autoHover: '#fff' } } })).toBe(false);
  });

  it('trims stray whitespace in stored colors; real garbage still fails', () => {
    expect(ok({ mainColor: { hover: ' #1E293B' } })).toBe(true);
    expect(ok({ xbutton: { color: '#fffffff' } })).toBe(false); // 7 digits
    expect(ok({ font: { linkColor: 'hsl(207, 100%, 33%)' } })).toBe(false);
  });

  it('accepts the announcement / unread-badge groups (parity rows added)', () => {
    expect(
      ok({
        announcement: { bubbleWidth: 400, modalWidth: 500 },
        resourceCenterUnreadBadge: { backgroundColor: '#ff0000', textColor: '#ffffff' },
      }),
    ).toBe(true);
    expect(ok({ announcement: { bubbleWidth: 9999 } })).toBe(false);
  });
});
