import { validateAutoStartForType } from './auto-start.validate';
import type { RepresentationStartRules } from './representation.schema';

/**
 * The CONTENT TYPE × START-RULE KNOB matrix, stated as one table.
 *
 * `auto-start.validate.spec.ts` walks the types one at a time, which is how the
 * rules were learned but not how they are used: the question an author actually
 * asks is "which of these seven types can do X", and no assertion answered it.
 * Two consequences this file fixes — launcher was never asserted at all (the
 * one type that supports NOTHING, so nothing failed when it was skipped), and
 * a knob added to the capability record would need seven separate edits before
 * anything went red.
 *
 * Read the table below as the contract. A `false` cell means the write is
 * REJECTED, not ignored: setting a frequency on a banner is an error, not a
 * silently dropped field.
 */

type Knob =
  | 'frequency'
  | 'atLeast'
  | 'priority'
  | 'waitSeconds'
  | 'startIfNotComplete'
  | 'hideRules';

/** The whole capability surface, one row per content type. */
const MATRIX: Record<string, Record<Knob, boolean>> = {
  flow: {
    frequency: true,
    atLeast: true,
    priority: true,
    waitSeconds: true,
    startIfNotComplete: true,
    hideRules: true,
  },
  checklist: {
    // atLeast is the lone hole: the builder hides that control for checklists.
    frequency: true,
    atLeast: false,
    priority: true,
    waitSeconds: true,
    startIfNotComplete: true,
    hideRules: true,
  },
  banner: {
    // A singleton competing for one slot — it needs a tie-break and nothing else.
    frequency: false,
    atLeast: false,
    priority: true,
    waitSeconds: false,
    startIfNotComplete: false,
    hideRules: false,
  },
  'resource-center': {
    frequency: false,
    atLeast: false,
    priority: true,
    waitSeconds: false,
    startIfNotComplete: false,
    hideRules: true,
  },
  launcher: {
    // Supports NOTHING. Untested until now precisely because an all-false row
    // fails silently when it is skipped.
    frequency: false,
    atLeast: false,
    priority: false,
    waitSeconds: false,
    startIfNotComplete: false,
    hideRules: false,
  },
  tracker: {
    frequency: false,
    atLeast: false,
    priority: false,
    waitSeconds: false,
    startIfNotComplete: false,
    hideRules: false,
  },
  announcement: {
    frequency: false,
    atLeast: false,
    priority: false,
    waitSeconds: false,
    startIfNotComplete: false,
    hideRules: false,
  },
};

const when: RepresentationStartRules['when'] = [];

/** A start-rules body carrying exactly one knob. */
const withKnob = (knob: Knob): RepresentationStartRules | null => {
  switch (knob) {
    case 'frequency':
      return { when, frequency: { mode: 'once' } } as RepresentationStartRules;
    case 'atLeast':
      // atLeast rides inside frequency, so a type without `frequency` reports
      // both errors — asserted as "at least one", not an exact count.
      return {
        when,
        frequency: { mode: 'once', atLeast: { duration: 5, unit: 'minutes' } },
      } as RepresentationStartRules;
    case 'priority':
      return { when, priority: 'high' } as RepresentationStartRules;
    case 'waitSeconds':
      return { when, waitSeconds: 10 } as RepresentationStartRules;
    case 'startIfNotComplete':
      return { when, startIfNotComplete: true } as RepresentationStartRules;
    case 'hideRules':
      return null;
  }
};

const KNOBS: Knob[] = [
  'frequency',
  'atLeast',
  'priority',
  'waitSeconds',
  'startIfNotComplete',
  'hideRules',
];

describe('content type × start-rule knob', () => {
  for (const [type, caps] of Object.entries(MATRIX)) {
    describe(type, () => {
      it.each(KNOBS)('%s', (knob) => {
        const errs =
          knob === 'hideRules'
            ? validateAutoStartForType(null, { when }, type)
            : validateAutoStartForType(withKnob(knob), null, type);

        if (caps[knob]) {
          // atLeast on a type WITH frequency must be clean; on one without,
          // the frequency error is expected and covered by its own cell.
          expect(errs).toEqual([]);
        } else {
          expect(errs.length).toBeGreaterThan(0);
          expect(errs.join(' ')).toContain(type);
        }
      });
    });
  }
});

describe('the capability table, stated as a whole', () => {
  it('every type supports exactly the knobs the table claims', () => {
    const observed: Record<string, Knob[]> = {};
    for (const type of Object.keys(MATRIX)) {
      observed[type] = KNOBS.filter((knob) => {
        const errs =
          knob === 'hideRules'
            ? validateAutoStartForType(null, { when }, type)
            : validateAutoStartForType(withKnob(knob), null, type);
        return errs.length === 0;
      });
    }
    const expected = Object.fromEntries(
      Object.entries(MATRIX).map(([type, caps]) => [type, KNOBS.filter((k) => caps[k])]),
    );
    expect(observed).toEqual(expected);
  });

  it('three types support nothing at all — launcher, tracker, announcement', () => {
    const nothing = Object.entries(MATRIX)
      .filter(([, caps]) => KNOBS.every((k) => !caps[k]))
      .map(([type]) => type)
      .sort();
    expect(nothing).toEqual(['announcement', 'launcher', 'tracker']);
  });

  it('an unknown content type is left to other validators rather than guessed at', () => {
    expect(validateAutoStartForType(withKnob('frequency'), { when }, 'not-a-type')).toEqual([]);
  });

  it('clearing rules is allowed on every type', () => {
    for (const type of Object.keys(MATRIX)) {
      expect(validateAutoStartForType(null, null, type)).toEqual([]);
    }
  });
});
