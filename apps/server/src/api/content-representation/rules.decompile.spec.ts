import { compileStartRules, compileTriggers } from './rules.compile';
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

  // A stored `logic` of an Object.prototype key (persistable via the untyped web
  // GraphQL write path) must NOT resolve to the inherited native function — that
  // leaks a function into `op`, which JSON.stringify then drops, returning a
  // condition with no `op` that no client can read back or repair.
  it('a prototype-key attr op passes through as a plain string, not a native function', () => {
    const out = decompileCondition(
      { type: 'user-attr', data: { attrId: 'a1', logic: 'constructor', value: 'x' } },
      resolvers,
    ) as { op: unknown };
    expect(typeof out.op).toBe('string'); // the fix: a string, never a function
    // Survives a JSON round-trip (a function-valued op would VANISH here — the
    // real-world symptom: get_content returns a condition with no `op`).
    expect(JSON.parse(JSON.stringify(out))).toHaveProperty('op');
  });

  it('a prototype-key state logic falls back to its default, not a native function', () => {
    // `content` maps logic → state via CONTENT_STATE; a prototype key must fall
    // to the default 'seen', never the inherited native function.
    const out = decompileCondition(
      { type: 'content', data: { contentId: 'c1', logic: 'constructor' } },
      IDENTITY_RESOLVERS,
    ) as { state: unknown };
    expect(out.state).toBe('seen');
  });

  it('a prototype-key event count logic falls back to at_least, not a function', () => {
    const out = decompileCondition(
      { type: 'event', data: { eventId: 'e1', countLogic: 'constructor', count: 2 } },
      resolvers,
    ) as { count?: { op: unknown } };
    expect(typeof out.count?.op).toBe('string');
    expect(out.count?.op).toBe('at_least');
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
      type: 'start_content',
      content: 'c1',
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
  it('maps when + do + waitSeconds', () => {
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
        waitSeconds: 500,
      },
    ]);
  });

  // Legacy-name lock: `waitMs` (the field's pre-release name) must be REJECTED
  // with a migration hint, not silently stripped — a stale agent prompt sending
  // waitMs would otherwise lose the delay without a trace.
  it('rejects the legacy `waitMs` key on triggers and startRules with a migration hint', async () => {
    const { representationTrigger, representationStartRules } = await import(
      './representation.schema'
    );
    for (const schema of [representationTrigger, representationStartRules]) {
      const bad = schema.safeParse({ when: [], do: [{ type: 'dismiss' }], waitMs: 300 });
      expect(bad.success).toBe(false);
      const issue = bad.error?.issues.find((i) => i.path.join('.') === 'waitMs');
      expect(issue?.message).toContain('waitSeconds');
      expect(issue?.message).toContain('SECONDS');
    }
    // waitSeconds itself still parses.
    expect(
      representationTrigger.safeParse({ do: [{ type: 'dismiss' }], waitSeconds: 3 }).success,
    ).toBe(true);
  });

  // Unit lock: `waitSeconds` compiles to the internal `wait` UNCHANGED (both are
  // seconds; the runtime multiplies by 1000). A round-trip can't catch a stray
  // ×1000 on both sides — this pins the literal value.
  it('compiles waitSeconds to internal `wait` with the same number (seconds, no conversion)', () => {
    const ids = { attributeId: (c: string) => c, eventId: (c: string) => c };
    const [rule] = compileTriggers([{ do: [{ type: 'dismiss' }], waitSeconds: 42 }], ids as never);
    expect((rule as unknown as { wait: number }).wait).toBe(42);

    const start = compileStartRules(
      { when: [], waitSeconds: 42 } as never,
      ids as never,
    ) as unknown as { autoStartRulesSetting: { wait: number } };
    expect(start.autoStartRulesSetting.wait).toBe(42);
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
      waitSeconds: 200,
      startIfNotComplete: true,
    });
  });

  it('returns undefined when disabled', () => {
    expect(
      decompileStartRules({ enabledAutoStartRules: false }, IDENTITY_RESOLVERS),
    ).toBeUndefined();
    expect(decompileHideRules({ enabledHideRules: false }, IDENTITY_RESOLVERS)).toBeUndefined();
  });

  it('a legacy list with NO operators decompiles as OR — mirroring the runtime', () => {
    // isConditionsActived: `operators === 'and' ? all : any` — a missing value
    // evaluates as ANY at runtime, so it must present as an any-group, not a bare
    // (ALL-by-contract) when list. Presenting it as AND would also re-stamp
    // operators:'and' on an echo write, silently flipping live behavior.
    const config = {
      enabledAutoStartRules: true,
      autoStartRules: [
        { type: 'segment', data: { segmentId: 's1', logic: 'is' } },
        { type: 'segment', data: { segmentId: 's2', logic: 'is' } },
      ],
    };
    expect(decompileStartRules(config, IDENTITY_RESOLVERS)).toEqual({
      when: [
        {
          type: 'group',
          match: 'any',
          conditions: [
            { type: 'segment', segment: 's1', in: true },
            { type: 'segment', segment: 's2', in: true },
          ],
        },
      ],
    });
  });

  it('an explicit and-stamped list still decompiles as a bare (ALL) when list', () => {
    const config = {
      enabledAutoStartRules: true,
      autoStartRules: [
        { type: 'segment', operators: 'and', data: { segmentId: 's1', logic: 'is' } },
        { type: 'segment', operators: 'and', data: { segmentId: 's2', logic: 'is' } },
      ],
    };
    expect(decompileStartRules(config, IDENTITY_RESOLVERS)).toEqual({
      when: [
        { type: 'segment', segment: 's1', in: true },
        { type: 'segment', segment: 's2', in: true },
      ],
    });
  });
});
