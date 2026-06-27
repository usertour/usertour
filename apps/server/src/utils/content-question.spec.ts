import type { Step } from '@/common/types';
import { compileContent } from '../api/content-representation/representation.compile';
import type { CompileResolvers } from '../api/content-representation/rules.compile';
import {
  extractBindToAttribute,
  extractQuestionData,
  extractStepBindToAttribute,
  extractStepQuestion,
} from './content-question';

/**
 * Survey capture logic — the helpers the runtime uses when a question is answered
 * (web-socket-v2 answerQuestion → event-tracking handleQuestionAnswered): find the
 * answered question by cvid and resolve which user attribute its answer binds to.
 * These were verified end-to-end by hand in the survey eval but had zero tests.
 */

// ── Layer 1: the pure helpers, on a hand-built internal step shape ──────────────
const internalStep = (element: Record<string, unknown>): Step =>
  ({ data: [{ element, children: [] }] }) as unknown as Step;

describe('content-question: bind resolution (pure)', () => {
  it('resolves a bound question to its selectedAttribute by cvid', () => {
    const step = internalStep({
      type: 'nps',
      data: { cvid: 'q1', bindToAttribute: true, selectedAttribute: 'nps_score' },
    });
    expect(extractStepBindToAttribute([step], 'q1')).toBe('nps_score');
    expect(extractBindToAttribute(step)).toBe('nps_score');
  });

  it('returns null when the question is not bound (unbound answers only record a response)', () => {
    const step = internalStep({
      type: 'multi-line-text',
      data: { cvid: 'q2', bindToAttribute: false },
    });
    expect(extractStepBindToAttribute([step], 'q2')).toBeNull();
    expect(extractBindToAttribute(step)).toBeNull();
  });

  it('returns null for an unknown cvid', () => {
    const step = internalStep({
      type: 'nps',
      data: { cvid: 'q1', bindToAttribute: true, selectedAttribute: 'nps_score' },
    });
    expect(extractStepBindToAttribute([step], 'nope')).toBeNull();
  });

  it('ignores non-question elements', () => {
    const step = internalStep({ type: 'text', data: {} });
    expect(extractQuestionData(step.data as never)).toHaveLength(0);
    expect(extractStepQuestion(step)).toBeNull();
  });
});

// ── Layer 2: authored representation → compile → bind resolves (the real chain) ──
const ids: CompileResolvers = { attributeId: (c) => c, eventId: (c) => c };
const compiledStep = (question: Record<string, unknown>): Step =>
  ({
    data: compileContent([{ type: 'question', question } as never], undefined, ids),
  }) as unknown as Step;
const cvidOf = (step: Step): string =>
  (extractQuestionData(step.data as never)[0]?.data as { cvid?: string })?.cvid ?? '';

describe('content-question: authored question → compiled → bind resolves', () => {
  // one per kind, matching the survey render+capture eval (number/number/string/list)
  it.each([
    ['nps', { kind: 'nps', name: 'q', bindAttribute: 'nps_score' }, 'nps_score'],
    [
      'rating',
      {
        kind: 'rating',
        name: 'q',
        style: 'scale',
        range: { low: 1, high: 5 },
        bindAttribute: 'onboarding_csat',
      },
      'onboarding_csat',
    ],
    [
      'single-choice',
      {
        kind: 'choice',
        name: 'q',
        allowMultiple: false,
        options: [{ label: 'A', value: 'a' }],
        bindAttribute: 'primary_goal',
      },
      'primary_goal',
    ],
    [
      'multi-choice',
      {
        kind: 'choice',
        name: 'q',
        allowMultiple: true,
        options: [{ label: 'A', value: 'a' }],
        bindAttribute: 'role',
      },
      'role',
    ],
  ])(
    'compiles a %s question whose cvid resolves to its bound attribute',
    (_kind, question, bind) => {
      const step = compiledStep(question);
      const cvid = cvidOf(step);
      expect(cvid).toBeTruthy();
      expect(extractStepBindToAttribute([step], cvid)).toBe(bind);
    },
  );

  it('an unbound (no bindAttribute) text question compiles and resolves to null', () => {
    const step = compiledStep({ kind: 'text', name: 'q', multiline: true });
    expect(extractStepBindToAttribute([step], cvidOf(step))).toBeNull();
  });
});
