import {
  canCompleteChecklistItem,
  extractClientConditionWaitTimers,
  findCurrentStepCvid,
  findStepIdByLatestCvid,
  getAttributeValue,
  priorityCompare,
} from './content.util';

describe('getAttributeValue — own keys only', () => {
  it('reads a stored value, and null for a missing key or no data', () => {
    expect(getAttributeValue({ plan: 'pro' }, 'plan')).toBe('pro');
    expect(getAttributeValue({ plan: 'pro' }, 'seats')).toBeNull();
    expect(getAttributeValue(null, 'plan')).toBeNull();
  });

  it('a missing prototype-named key is null, not the inherited function', () => {
    expect(getAttributeValue({}, 'constructor')).toBeNull();
    expect(getAttributeValue({}, 'toString')).toBeNull();
    expect(getAttributeValue({ constructor: 'A' }, 'constructor')).toBe('A');
  });
});

// Sort semantics: negative = a first. PRIORITIES is ordered highest→lowest, so
// a lower index sorts first.
const v = (priority?: string) =>
  ({ config: { autoStartRulesSetting: priority ? { priority } : {} } }) as never;

describe('priorityCompare — unset ranks as medium (was: unset made the pair incomparable)', () => {
  it('highest outranks unset', () => {
    expect(priorityCompare(v('highest'), v())).toBeLessThan(0);
    expect(priorityCompare(v(), v('highest'))).toBeGreaterThan(0);
  });

  it('unset outranks low/lowest (it is medium, not bottom)', () => {
    expect(priorityCompare(v(), v('low'))).toBeLessThan(0);
    expect(priorityCompare(v(), v('lowest'))).toBeLessThan(0);
  });

  it('unset ties with explicit medium; two unset tie', () => {
    expect(priorityCompare(v(), v('medium'))).toBe(0);
    expect(priorityCompare(v(), v())).toBe(0);
  });

  it('an unrecognized value also ranks as medium instead of jumping the queue', () => {
    expect(priorityCompare(v('bogus'), v('highest'))).toBeGreaterThan(0);
    expect(priorityCompare(v('bogus'), v('lowest'))).toBeLessThan(0);
  });

  it('explicit ordering still holds', () => {
    expect(priorityCompare(v('high'), v('low'))).toBeLessThan(0);
    expect(priorityCompare(v('low'), v('high'))).toBeGreaterThan(0);
  });
});

// L3 (checklist tier-C): the ordered gate must count only items the user can
// SEE — the widget gets the visible slice and renders the first visible
// incomplete task as clickable, so a hidden incomplete predecessor made that
// task silently uncompletable.
describe('canCompleteChecklistItem — ordered skips invisible predecessors', () => {
  const item = (id: string, over: object = {}) =>
    ({ id, isCompleted: false, isVisible: true, ...over }) as never;

  it('hidden incomplete predecessor no longer blocks', () => {
    const items = [item('a', { isVisible: false }), item('b')];
    expect(canCompleteChecklistItem('ordered', items, items[1])).toBe(true);
  });

  it('visible incomplete predecessor still blocks', () => {
    const items = [item('a'), item('b')];
    expect(canCompleteChecklistItem('ordered', items, items[1])).toBe(false);
  });

  it('completed predecessors unblock regardless of visibility', () => {
    const items = [
      item('a', { isCompleted: true }),
      item('b', { isCompleted: true, isVisible: false }),
      item('c'),
    ];
    expect(canCompleteChecklistItem('ordered', items, items[2])).toBe(true);
  });

  it('legacy items with isVisible undefined are treated as visible (still block)', () => {
    const items = [item('a', { isVisible: undefined }), item('b')];
    expect(canCompleteChecklistItem('ordered', items, items[1])).toBe(false);
  });

  it("'any' order never gates", () => {
    const items = [item('a'), item('b')];
    expect(canCompleteChecklistItem('any', items, items[1])).toBe(true);
  });
});

describe('extractClientConditionWaitTimers — the delivery-side 300s cap', () => {
  const version = (wait: number) =>
    ({
      id: 'v1',
      contentId: 'c1',
      content: { type: 'flow' },
      config: {
        enabledAutoStartRules: true,
        autoStartRules: [{ type: 'current_url' }],
        autoStartRulesSetting: { wait },
      },
    }) as never;

  it('clamps a pasted-milliseconds value to 300 seconds', () => {
    // 300000 is the recurring mistake: a milliseconds value in the SECONDS
    // field. Unclamped it armed a 3.5-day timer while every describe promised
    // "capped at 300 seconds by the runtime".
    const [timer] = extractClientConditionWaitTimers([version(300_000)]);
    expect(timer.waitTime).toBe(300);
  });

  it('passes legal values through untouched', () => {
    const [timer] = extractClientConditionWaitTimers([version(45)]);
    expect(timer.waitTime).toBe(45);
    expect(extractClientConditionWaitTimers([version(0)])).toEqual([]);
  });
});

describe('the step a session resumes on after its version changed', () => {
  // The session still points at a step row of the version it started on. The
  // version now published has other rows for the same steps, so the step is
  // found again by its cvid, read from the last step the session reported.
  const stepSeen = (codeName: string, cvidAttribute: string, cvid: string, at: string) => ({
    createdAt: new Date(at),
    event: { codeName },
    data: { [cvidAttribute]: cvid },
  });
  const republished = (type: string, bizEvent: unknown[]) =>
    ({
      id: 'v2',
      contentId: 'c1',
      content: { id: 'c1', type },
      steps: [
        { id: 'v2-step-1', cvid: 'cvid-1' },
        { id: 'v2-step-2', cvid: 'cvid-2' },
      ],
      session: { activeSession: { id: 's1', currentStepId: 'v1-step-2', bizEvent } },
    }) as never;

  it("finds a flow session's step by the cvid of its last step-seen event", () => {
    const events = [
      stepSeen('flow_step_seen', 'flow_step_cvid', 'cvid-1', '2026-01-01T00:00:00Z'),
      stepSeen('flow_step_seen', 'flow_step_cvid', 'cvid-2', '2026-01-01T00:01:00Z'),
    ];
    expect(findCurrentStepCvid(republished('flow', events))).toBe('cvid-2');
  });

  it("finds an embed session's step the same way", () => {
    const events = [
      stepSeen('embed_step_seen', 'embed_step_cvid', 'cvid-1', '2026-01-01T00:00:00Z'),
      stepSeen('embed_step_seen', 'embed_step_cvid', 'cvid-2', '2026-01-01T00:01:00Z'),
    ];
    expect(findCurrentStepCvid(republished('embed', events))).toBe('cvid-2');
    expect(
      findStepIdByLatestCvid({
        version: {
          steps: [
            { id: 'v2-step-1', cvid: 'cvid-1' },
            { id: 'v2-step-2', cvid: 'cvid-2' },
          ],
        },
        bizEvent: events,
      } as never),
    ).toBe('v2-step-2');
  });
});
