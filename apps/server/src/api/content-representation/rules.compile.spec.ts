import { collectRuleIssues } from './condition-validate';
import {
  collectEchoableActions,
  compileActions,
  compileConditions,
  compileStartRules,
} from './rules.compile';

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

describe('compileStartRules — settings-only patch (when omitted)', () => {
  it('emits NO condition keys, so the caller merge keeps stored rules untouched', () => {
    const out = compileStartRules({ frequency: { mode: 'once' } } as never, r) as Record<
      string,
      unknown
    >;
    expect(out.autoStartRules).toBeUndefined();
    expect(out.enabledAutoStartRules).toBeUndefined();
    expect((out.autoStartRulesSetting as { frequency: { frequency: string } }).frequency).toEqual({
      frequency: 'once',
    });
  });

  it('with `when` present it still fully replaces conditions and re-enables', () => {
    const out = compileStartRules({ when, priority: 'high' } as never, r) as Record<
      string,
      unknown
    >;
    expect(out.enabledAutoStartRules).toBe(true);
    expect(Array.isArray(out.autoStartRules)).toBe(true);
  });
});

describe('compileActions — echo-if-existing for non-representable actions', () => {
  const jsRule = {
    id: 'a1',
    type: 'javascript-evaluate',
    data: { value: 'console.log(1)' },
  };
  const mysteryRule = { id: 'a2', type: 'future-mystery-action', data: { x: 1 } };
  const pool = { ...r, echoActions: [jsRule, mysteryRule] };
  const msg = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return (e as { getMessage?: (l: string) => string }).getMessage?.('en') ?? String(e);
    }
    throw new Error('expected throw');
  };

  it('run_javascript echoed with the stored script → stored action preserved verbatim', () => {
    const out = compileActions([{ type: 'run_javascript', script: 'console.log(1)' }] as any, pool);
    expect(out).toEqual([jsRule]);
    expect(out[0]).not.toBe(jsRule); // cloned, not shared
  });

  it('run_javascript with a DIFFERENT script → rejected (no new/edited scripts)', () => {
    expect(
      msg(() => compileActions([{ type: 'run_javascript', script: 'evil()' }] as any, pool)),
    ).toMatch(/blocked for security/i);
  });

  it('run_javascript with no pool (fresh create) → rejected', () => {
    expect(
      msg(() => compileActions([{ type: 'run_javascript', script: 'console.log(1)' }] as any, r)),
    ).toMatch(/blocked for security/i);
  });

  it('unsupported echo whose note matches a stored action → preserved verbatim', () => {
    const out = compileActions(
      [{ type: 'unsupported', note: 'future-mystery-action' }] as any,
      pool,
    );
    expect(out).toEqual([mysteryRule]);
  });

  it('fresh unsupported (no matching stored action) → rejected, not silently dropped', () => {
    expect(msg(() => compileActions([{ type: 'unsupported', note: 'nope' }] as any, pool))).toMatch(
      /echo-only/i,
    );
    expect(msg(() => compileActions([{ type: 'unsupported' }] as any, r))).toMatch(/echo-only/i);
  });

  it('collectEchoableActions harvests actions/clickedActions lists at any depth, nothing else', () => {
    const prev = {
      items: [{ clickedActions: [jsRule], completeConditions: [{ type: 'task-is-clicked' }] }],
      content: [{ children: [{ children: [{ element: { data: { actions: [mysteryRule] } } }] }] }],
      hideRules: [{ type: 'current-page', data: {} }],
    };
    const got = collectEchoableActions(prev);
    expect(got).toEqual([jsRule, mysteryRule]);
  });
});
