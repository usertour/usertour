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

describe('compileConditions — bare event (no count, no within)', () => {
  // `{type:event, event}` with nothing else is the common "has this happened?"
  // check. A missing `count` is dangerous (runtime `count ?? 0` → at_least 0 =
  // match-all), so it must compile to an explicit at_least 1, and a missing
  // `within` to atAnyPointInTime — together a clean, validatable "happened ≥1×".
  const bare = () => compileConditions([{ type: 'event', event: 'e1' } as any], r)[0] as any;

  it('defaults to at_least 1 over any time (never an empty/match-all count)', () => {
    expect(bare().data).toMatchObject({
      countLogic: 'atLeast',
      count: 1,
      timeLogic: 'atAnyPointInTime',
    });
  });

  it('passes rule validation (no "needs a count" / "needs a time window")', () => {
    expect(collectRuleIssues(bare(), { events: [{ id: 'e1' }] } as any)).toEqual([]);
  });
});

describe('compileConditions — `flow`-state condition gates any content type', () => {
  // The `flow` representation key compiles to a `content` rule keyed only by id;
  // validation checks the id EXISTS, not that it points at a flow — so a tour can
  // gate on a BANNER (or checklist, etc.) being `seen`. Locks the documented
  // "despite the `flow` name, any content type works" behavior.
  const gateOn = (id: string) =>
    compileConditions([{ type: 'content_state', content: id, state: 'seen' } as any], r);

  it('a banner contentId validates clean (existence-only, type-agnostic)', () => {
    const issues = collectRuleIssues(gateOn('banner-1'), {
      contents: [{ id: 'banner-1', type: 'banner' }],
    } as any);
    expect(issues).toEqual([]);
  });

  it('an unknown contentId is flagged as unknown content', () => {
    const issues = collectRuleIssues(gateOn('nope'), { contents: [{ id: 'banner-1' }] } as any);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/unknown content/i);
  });
});
