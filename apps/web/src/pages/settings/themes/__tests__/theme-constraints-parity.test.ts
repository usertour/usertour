import { THEME_SETTING_CONSTRAINTS } from '@usertour/constants';
import { builderSections } from '../components/theme-builder/schema/sections';
import type { BuilderSection, FieldDef } from '../components/theme-builder/schema/types';

/**
 * `THEME_SETTING_CONSTRAINTS` (in @usertour/constants) is the neutral SSOT the
 * server validates theme-settings writes against. The builder's field schema
 * (`builderSections`, web-local) is the UI authoring surface. They must describe
 * the SAME constraints, or the API and the builder would accept different theme
 * settings.
 *
 * This projects the builder fields to constraints and asserts they equal the
 * committed table — so a builder change to a range / enum / writable field fails
 * here until `THEME_SETTING_CONSTRAINTS` is updated to match. (The server never
 * imports the builder schema; this test is the only bridge.)
 *
 * Keep this projection identical to the one the table was generated from.
 */

type Constraint =
  | { kind: 'number'; min?: number; max?: number }
  | { kind: 'color'; allowAuto: boolean }
  | { kind: 'enum'; values: (string | number)[] }
  | { kind: 'boolean' }
  | { kind: 'string' };

const projectField = (f: FieldDef): Array<[string, Constraint]> => {
  switch (f.type) {
    case 'number':
    case 'slider': {
      const c: Constraint = { kind: 'number' };
      if (f.min !== undefined) c.min = f.min;
      if (f.max !== undefined) c.max = f.max;
      return [[f.path, c]];
    }
    case 'color':
      return [[f.path, { kind: 'color', allowAuto: f.allowAuto ?? false }]];
    case 'triple-color':
      return f.paths.map(
        (p, i) =>
          [p, { kind: 'color', allowAuto: f.allowAuto?.[i] ?? false }] as [string, Constraint],
      );
    case 'select':
      return [
        [
          f.path,
          {
            kind: 'enum',
            values: f.options.map((o) => (f.valueAsNumber ? Number(o.value) : o.value)),
          },
        ],
      ];
    case 'boolean':
      return [[f.path, { kind: 'boolean' }]];
    case 'text':
    case 'font-family':
    case 'code':
      return [[f.path, { kind: 'string' }]];
    case 'sub-section':
      return f.fields.flatMap(projectField);
    default:
      return [];
  }
};

const projectBuilder = (): Record<string, Constraint> => {
  const out: Record<string, Constraint> = {};
  for (const section of builderSections as BuilderSection[]) {
    for (const field of section.fields) {
      for (const [path, c] of projectField(field)) out[path] = c;
    }
  }
  return out;
};

describe('theme settings constraints ↔ builder parity', () => {
  it('THEME_SETTING_CONSTRAINTS equals the builder field schema projection', () => {
    expect(projectBuilder()).toEqual(THEME_SETTING_CONSTRAINTS);
  });
});
