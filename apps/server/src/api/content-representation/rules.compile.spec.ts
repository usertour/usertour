import { collectRuleIssues } from './condition-validate';
import { compileConditions, compileStartRules } from './rules.compile';

// current_url needs no id resolution; stub the resolvers.
const r = { attributeId: (c: string) => c, eventId: (c: string) => c } as any;
const when = [{ type: 'current_url', includes: ['*'] }] as any;
const freq = (mode: string, every?: object) =>
  (compileStartRules({ when, frequency: { mode, ...(every ? { every } : {}) } } as any, r) as any)
    .autoStartRulesSetting.frequency;

describe('compileStartRules — frequency.every defaults', () => {
  it('unlimited: synthesizes the window (duration/unit) but NOT times — runtime ignores times for unlimited', () => {
    const f = freq('unlimited');
    expect(f.frequency).toBe('unlimited');
    expect(f.every.duration).toBeDefined();
    expect(f.every.unit).toBeDefined();
    expect(f.every.times).toBeUndefined();
  });

  it('multiple: synthesizes times (the count cap it actually uses)', () => {
    expect(freq('multiple').every.times).toBeDefined();
  });

  it('once: no every synthesized at all', () => {
    expect(freq('once').every).toBeUndefined();
  });

  it('unlimited + caller-provided every.times → respected, not dropped', () => {
    expect(freq('unlimited', { times: 5, duration: 3, unit: 'days' }).every.times).toBe(5);
  });
});

describe('compileConditions — event without `within`', () => {
  const event = (extra: object = {}) =>
    compileConditions(
      [{ type: 'event', event: 'e1', count: { op: 'at_least', n: 1 }, ...extra } as any],
      r,
    )[0] as any;

  it('defaults a missing time window to atAnyPointInTime (not an empty timeLogic)', () => {
    // `within` is optional in the schema; omitting it must still produce an
    // explicit "any point in time" timeLogic so the condition validates.
    expect(event().data.timeLogic).toBe('atAnyPointInTime');
  });

  it('an event condition with no `within` passes rule validation (no "needs time window")', () => {
    const issues = collectRuleIssues(event(), { events: [{ id: 'e1' }] } as any);
    expect(issues).toEqual([]);
  });

  it('still honors an explicit `within`', () => {
    expect(event({ within: { op: 'in_the_last', value: 7, unit: 'days' } }).data).toMatchObject({
      timeLogic: 'inTheLast',
      windowValue: 7,
      timeUnit: 'days',
    });
  });
});
