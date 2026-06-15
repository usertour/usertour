import { validateAutoStartForType } from './auto-start.validate';
import type { RepresentationStartRules } from './representation.schema';

const when: RepresentationStartRules['when'] = [];

describe('validateAutoStartForType', () => {
  it('flow supports every auto-start setting', () => {
    const start: RepresentationStartRules = {
      when,
      frequency: {
        mode: 'multiple',
        every: { times: 2, duration: 1, unit: 'days' },
        atLeast: { duration: 5, unit: 'minutes' },
      },
      priority: 'high',
      waitMs: 1000,
      startIfNotComplete: true,
    };
    expect(validateAutoStartForType(start, { when }, 'flow')).toEqual([]);
  });

  it('checklist supports all but the frequency `atLeast` window', () => {
    const ok: RepresentationStartRules = {
      when,
      frequency: { mode: 'multiple', every: { times: 2, duration: 1, unit: 'days' } },
      priority: 'low',
      waitMs: 0,
      startIfNotComplete: false,
    };
    expect(validateAutoStartForType(ok, { when }, 'checklist')).toEqual([]);

    const withAtLeast: RepresentationStartRules = {
      when,
      frequency: { mode: 'multiple', atLeast: { duration: 5, unit: 'minutes' } },
    };
    expect(validateAutoStartForType(withAtLeast, undefined, 'checklist')).toEqual([
      'checklist content does not support a frequency `atLeast` window.',
    ]);
  });

  it.each(['launcher', 'banner'])(
    '%s (show-only) allows conditions but no settings/hide rules',
    (type) => {
      // Bare conditions are fine.
      expect(validateAutoStartForType({ when }, undefined, type)).toEqual([]);

      const start: RepresentationStartRules = {
        when,
        frequency: { mode: 'once' },
        priority: 'high',
        waitMs: 500,
        startIfNotComplete: true,
      };
      const errs = validateAutoStartForType(start, { when }, type);
      expect(errs).toEqual([
        `${type} content does not support a start \`frequency\`.`,
        `${type} content does not support a start \`priority\`.`,
        `${type} content does not support a start \`waitMs\`.`,
        `${type} content does not support \`startIfNotComplete\`.`,
        `${type} content does not support \`hideRules\`.`,
      ]);
    },
  );

  it('resource-center allows priority + hide rules but not frequency/wait/ifComplete', () => {
    expect(
      validateAutoStartForType({ when, priority: 'medium' }, { when }, 'resource-center'),
    ).toEqual([]);

    const start: RepresentationStartRules = {
      when,
      frequency: { mode: 'once' },
      waitMs: 100,
      startIfNotComplete: true,
    };
    expect(validateAutoStartForType(start, undefined, 'resource-center')).toEqual([
      'resource-center content does not support a start `frequency`.',
      'resource-center content does not support a start `waitMs`.',
      'resource-center content does not support `startIfNotComplete`.',
    ]);
  });

  it('tracker allows conditions only — rejects all settings and hide rules', () => {
    expect(validateAutoStartForType({ when }, undefined, 'tracker')).toEqual([]);
    const errs = validateAutoStartForType({ when, priority: 'high' }, { when }, 'tracker');
    expect(errs).toContain('tracker content does not support a start `priority`.');
    expect(errs).toContain('tracker content does not support `hideRules`.');
  });

  it('clearing rules (null body) is always allowed', () => {
    expect(validateAutoStartForType(null, null, 'launcher')).toEqual([]);
    expect(validateAutoStartForType(undefined, undefined, 'banner')).toEqual([]);
  });

  it('unknown content type is left to other validators (no violations)', () => {
    const start: RepresentationStartRules = { when, frequency: { mode: 'once' }, priority: 'high' };
    expect(validateAutoStartForType(start, { when }, 'mystery')).toEqual([]);
    expect(validateAutoStartForType(start, { when }, undefined)).toEqual([]);
  });
});
