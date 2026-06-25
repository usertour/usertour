import {
  IDENTITY_RESOLVERS,
  decompileAction,
  decompileCondition,
  decompileHideRules,
  decompileStartRules,
  decompileTriggers,
} from './rules.decompile';

const resolvers = {
  attributeCode: (id: string) => (id === 'a1' ? 'plan' : id),
  eventCode: (id: string) => (id === 'e1' ? 'signed_up' : id),
};

describe('decompileCondition', () => {
  it('group → match comes from the children joiner, not the group node', () => {
    // A group's internal and/or is stored on its CHILDREN's `operators` (the
    // runtime reads `group.conditions[0].operators`). The group node's own
    // `operators` is the parent-list joiner and must NOT determine `match` —
    // here it is 'and' yet the OR children make this an 'any' group.
    expect(
      decompileCondition(
        {
          type: 'group',
          operators: 'and',
          conditions: [
            { type: 'segment', operators: 'or', data: { segmentId: 's1' } },
            { type: 'segment', operators: 'or', data: { segmentId: 's2' } },
          ],
        },
        IDENTITY_RESOLVERS,
      ),
    ).toEqual({
      type: 'group',
      match: 'any',
      conditions: [
        { type: 'segment', segment: 's1', in: true },
        { type: 'segment', segment: 's2', in: true },
      ],
    });
  });

  it('user-attr resolves attribute code + maps the operator', () => {
    expect(
      decompileCondition(
        { type: 'user-attr', data: { attrId: 'a1', logic: 'isGreaterThan', value: '5' } },
        resolvers,
      ),
    ).toEqual({ type: 'attribute', scope: 'user', attribute: 'plan', op: 'gt', value: '5' });
  });

  it('event-attr resolves to event_attribute (attrId → code via attributeCode)', () => {
    expect(
      decompileCondition(
        { type: 'event-attr', data: { attrId: 'a1', logic: 'is', value: 'x' } },
        resolvers,
      ),
    ).toEqual({ type: 'event_attribute', attribute: 'plan', op: 'is', value: 'x' });
  });

  it('task-is-clicked resolves to the parameterless task_clicked', () => {
    expect(decompileCondition({ type: 'task-is-clicked', data: {} }, resolvers)).toEqual({
      type: 'task_clicked',
    });
  });

  it('segment maps logic to in/not', () => {
    expect(
      decompileCondition(
        { type: 'segment', data: { segmentId: 's1', logic: 'not' } },
        IDENTITY_RESOLVERS,
      ),
    ).toEqual({ type: 'segment', segment: 's1', in: false });
  });

  it('current-page → includes/excludes', () => {
    expect(
      decompileCondition(
        { type: 'current-page', data: { includes: ['/app/*'], excludes: ['/app/admin'] } },
        IDENTITY_RESOLVERS,
      ),
    ).toEqual({ type: 'current_url', includes: ['/app/*'], excludes: ['/app/admin'] });
  });

  it('event maps count / within / scope / nested where', () => {
    const out = decompileCondition(
      {
        type: 'event',
        data: {
          eventId: 'e1',
          countLogic: 'atLeast',
          count: 2,
          timeLogic: 'inTheLast',
          windowValue: 7,
          timeUnit: 'days',
          scope: 'byCurrentUserInCurrentCompany',
          whereConditions: [
            { type: 'user-attr', data: { attrId: 'a1', logic: 'is', value: 'pro' } },
          ],
        },
      },
      resolvers,
    );
    expect(out).toEqual({
      type: 'event',
      event: 'signed_up',
      count: { op: 'at_least', n: 2 },
      within: { op: 'in_the_last', value: 7, unit: 'days' },
      scope: 'current_user_in_company',
      where: [{ type: 'attribute', scope: 'user', attribute: 'plan', op: 'is', value: 'pro' }],
    });
  });

  it('unknown / non-authorable types → unsupported', () => {
    expect(decompileCondition({ type: 'wait', data: {} }, IDENTITY_RESOLVERS)).toEqual({
      type: 'unsupported',
      note: 'wait',
    });
  });
});

describe('decompileAction', () => {
  it('maps every action type', () => {
    expect(decompileAction({ type: 'step-goto', data: { stepCvid: 'cv2' } })).toEqual({
      type: 'goto_step',
      step: 'cv2',
    });
    expect(
      decompileAction({ type: 'flow-start', data: { contentId: 'c1', stepCvid: 'cv0' } }),
    ).toEqual({
      type: 'start_flow',
      flow: 'c1',
      step: 'cv0',
    });
    expect(
      decompileAction({ type: 'page-navigate', data: { url: 'https://x.io', openType: 'new' } }),
    ).toEqual({
      type: 'navigate',
      url: 'https://x.io',
      newTab: true,
    });
    expect(decompileAction({ type: 'flow-dismis', data: {} })).toEqual({ type: 'dismiss' });
    expect(decompileAction({ type: 'javascript-evaluate', data: { value: 'alert(1)' } })).toEqual({
      type: 'run_javascript',
      script: 'alert(1)',
    });
  });
});

describe('decompileTriggers', () => {
  it('maps when + do + waitMs', () => {
    expect(
      decompileTriggers(
        [
          {
            conditions: [{ type: 'segment', data: { segmentId: 's1' } }],
            actions: [{ type: 'flow-dismis', data: {} }],
            wait: 500,
          },
        ],
        IDENTITY_RESOLVERS,
      ),
    ).toEqual([
      {
        when: [{ type: 'segment', segment: 's1', in: true }],
        do: [{ type: 'dismiss' }],
        waitMs: 500,
      },
    ]);
  });
});

describe('start / hide rules', () => {
  it('decompiles auto-start config (rules + frequency + priority)', () => {
    const config = {
      enabledAutoStartRules: true,
      autoStartRules: [{ type: 'segment', data: { segmentId: 's1' } }],
      autoStartRulesSetting: {
        frequency: { frequency: 'multiple', every: { times: 3, duration: 1, unit: 'days' } },
        priority: 'high',
        wait: 200,
        startIfNotComplete: true,
      },
    };
    expect(decompileStartRules(config, IDENTITY_RESOLVERS)).toEqual({
      when: [{ type: 'segment', segment: 's1', in: true }],
      frequency: { mode: 'multiple', every: { times: 3, duration: 1, unit: 'days' } },
      priority: 'high',
      waitMs: 200,
      startIfNotComplete: true,
    });
  });

  it('returns undefined when disabled', () => {
    expect(
      decompileStartRules({ enabledAutoStartRules: false }, IDENTITY_RESOLVERS),
    ).toBeUndefined();
    expect(decompileHideRules({ enabledHideRules: false }, IDENTITY_RESOLVERS)).toBeUndefined();
  });
});
