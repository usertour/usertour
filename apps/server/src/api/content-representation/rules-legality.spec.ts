import { ContentDataType } from '@usertour/types';

import { collectWriteViolations } from './write-guards';

/**
 * The SLOT × CONDITION legality matrix.
 *
 * The same condition vocabulary is accepted in eight different places, and each
 * place accepts a different subset. Today that truth is spread across three
 * sources — `AUTO_START_CAPABILITIES` (which knobs a type has),
 * `SERVER_EVALUATED_CONDITION_TYPES` (what a polled slot cannot see), and the
 * per-type action/condition guards — and no single assertion states it. An
 * author asking "can I gate this button on a segment?" has to read all three.
 *
 * This is that statement, driven off one table so a new condition type or a new
 * slot shows up as an unfilled cell rather than as silence. It runs as a unit
 * test on the write walk (a pure function over the request body), so the whole
 * matrix is reachable without a database or a socket.
 *
 * The load-bearing distinction is REACTIVE slots. A trigger's `when`, a
 * button's show/hide/disable and a tracker's start rules are polled in the
 * browser mid-session, so a condition the SERVER evaluates (event / segment /
 * content-state, against stored history) can never become true there. Those are
 * rejected at write. Every other slot takes the full set.
 */

// ── the condition vocabulary, one builder per representation type ────────────
const CONDITIONS = {
  attribute: { type: 'attribute', scope: 'user', attribute: 'plan', op: 'is', value: 'pro' },
  current_url: { type: 'current_url', includes: ['*'] },
  element: { type: 'element', target: { selector: '#x' }, state: 'present' },
  text_input: { type: 'text_input', target: { selector: '#x' }, value: 'v', op: 'is' },
  text_filled: { type: 'text_filled', target: { selector: '#x' } },
  time_window: { type: 'time_window', start: '2020-01-01T00:00:00.000Z' },
  event: { type: 'event', event: 'evt_spike_other' },
  segment: { type: 'segment', segment: 'seg-1', in: true },
  content_state: { type: 'content_state', content: 'c-1', state: 'seen' },
} as const;

type ConditionName = keyof typeof CONDITIONS;
const ALL: ConditionName[] = Object.keys(CONDITIONS) as ConditionName[];

/** What a polled (browser-side) slot cannot evaluate. */
const SERVER_ONLY: ConditionName[] = ['event', 'segment', 'content_state'];
const CLIENT_OK = ALL.filter((c) => !SERVER_ONLY.includes(c));

const cond = (name: ConditionName) => ({ ...CONDITIONS[name] });
/** Same condition, wrapped in a group — nesting must not smuggle it past a slot guard. */
const nested = (name: ConditionName) => ({
  type: 'group',
  match: 'all',
  conditions: [cond(name)],
});

// ── the slots, each expressed as the write body that carries it ──────────────
type Slot = {
  name: string;
  reactive: boolean;
  contentType: ContentDataType;
  build: (c: unknown) => Parameters<typeof collectWriteViolations>[0];
};

const step = (extra: Record<string, unknown>) => ({
  type: 'tooltip',
  target: { selector: '#x' },
  content: [{ type: 'text', markdown: 'x' }],
  ...extra,
});

const SLOTS: Slot[] = [
  {
    name: 'startRules.when',
    reactive: false,
    contentType: ContentDataType.FLOW,
    build: (c) => ({ contentType: ContentDataType.FLOW, startRules: { when: [c] } }),
  },
  {
    name: 'hideRules.when',
    reactive: false,
    contentType: ContentDataType.FLOW,
    build: (c) => ({ contentType: ContentDataType.FLOW, hideRules: { when: [c] } }),
  },
  {
    name: 'trigger.when',
    reactive: true,
    contentType: ContentDataType.FLOW,
    build: (c) => ({
      contentType: ContentDataType.FLOW,
      steps: [step({ triggers: [{ when: [c], do: [{ type: 'dismiss' }] }] })],
    }),
  },
  {
    name: 'button.disabledWhen',
    reactive: true,
    contentType: ContentDataType.FLOW,
    build: (c) => ({
      contentType: ContentDataType.FLOW,
      steps: [
        step({
          content: [
            { type: 'button', text: 'b', actions: [{ type: 'dismiss' }], disabledWhen: [c] },
          ],
        }),
      ],
    }),
  },
  {
    name: 'button.hiddenWhen',
    reactive: true,
    contentType: ContentDataType.FLOW,
    build: (c) => ({
      contentType: ContentDataType.FLOW,
      steps: [
        step({
          content: [{ type: 'button', text: 'b', actions: [{ type: 'dismiss' }], hiddenWhen: [c] }],
        }),
      ],
    }),
  },
  {
    name: 'tracker.startRules.when',
    reactive: true,
    contentType: ContentDataType.TRACKER,
    build: (c) => ({
      contentType: ContentDataType.TRACKER,
      startRules: { when: [c] },
      data: { event: 'evt_spike_other' },
    }),
  },
  {
    name: 'checklist.items[].completeWhen',
    reactive: false,
    contentType: ContentDataType.CHECKLIST,
    build: (c) => ({
      contentType: ContentDataType.CHECKLIST,
      data: { items: [{ id: 'i1', name: 'task', completeWhen: [c] }] },
    }),
  },
  {
    name: 'checklist.items[].onlyShowWhen',
    reactive: false,
    contentType: ContentDataType.CHECKLIST,
    build: (c) => ({
      contentType: ContentDataType.CHECKLIST,
      data: {
        items: [{ id: 'i1', name: 'task', clickActions: [{ type: 'dismiss' }], onlyShowWhen: [c] }],
      },
    }),
  },
];

/** Only the reactive-slot rule; other violations (shape, refs) are other specs' business. */
const reactiveIssues = (body: Parameters<typeof collectWriteViolations>[0]) =>
  collectWriteViolations(body).issues.filter((i) => i.rule === 'reactive_condition');

describe('slot × condition legality matrix', () => {
  describe.each(SLOTS)('$name (reactive: $reactive)', (slot) => {
    it.each(CLIENT_OK)('accepts %s', (name) => {
      expect(reactiveIssues(slot.build(cond(name)))).toEqual([]);
    });

    it.each(SERVER_ONLY)(slot.reactive ? 'REJECTS %s (server-evaluated)' : 'accepts %s', (name) => {
      const issues = reactiveIssues(slot.build(cond(name)));
      if (slot.reactive) {
        expect(issues).toHaveLength(1);
        expect(issues[0].message).toContain(name === 'content_state' ? 'content' : name);
      } else {
        expect(issues).toEqual([]);
      }
    });

    it.each(SERVER_ONLY)('applies the same verdict to %s nested in a group', (name) => {
      const issues = reactiveIssues(slot.build(nested(name)));
      expect(issues).toHaveLength(slot.reactive ? 1 : 0);
    });
  });
});

describe('the matrix, stated as a whole', () => {
  it('every reactive slot rejects exactly the server-evaluated set — no more, no less', () => {
    for (const slot of SLOTS.filter((s) => s.reactive)) {
      const rejected = ALL.filter((c) => reactiveIssues(slot.build(cond(c))).length > 0);
      expect({ slot: slot.name, rejected }).toEqual({
        slot: slot.name,
        rejected: SERVER_ONLY,
      });
    }
  });

  it('every non-reactive slot takes the full vocabulary', () => {
    for (const slot of SLOTS.filter((s) => !s.reactive)) {
      const rejected = ALL.filter((c) => reactiveIssues(slot.build(cond(c))).length > 0);
      expect({ slot: slot.name, rejected }).toEqual({ slot: slot.name, rejected: [] });
    }
  });

  it('a reactive slot reports one issue PER offending condition, not one per slot', () => {
    const slot = SLOTS.find((s) => s.name === 'trigger.when')!;
    const body = {
      contentType: ContentDataType.FLOW,
      steps: [
        step({
          triggers: [{ when: SERVER_ONLY.map(cond), do: [{ type: 'dismiss' }] }],
        }),
      ],
    };
    expect(reactiveIssues(body)).toHaveLength(SERVER_ONLY.length);
    // and each carries the path of the condition that caused it
    expect(new Set(reactiveIssues(body).map((i) => i.path))).toHaveProperty(
      'size',
      SERVER_ONLY.length,
    );
    void slot;
  });
});
