import { isConditionsActived } from '../conditions/condition';
import type { RulesCondition } from '@usertour/types';

/**
 * Composition edge cases for the shared rule-tree scorer.
 *
 * `condition.test.ts` covers the happy shapes (AND all-active, OR any-active,
 * one level of nesting). What it does not pin is how the scorer behaves at the
 * seams — and the seams are where an authored rule quietly means something
 * other than it reads:
 *
 *   - the JOIN comes from `conditions[0].operators` for the WHOLE list, so a
 *     mixed list is not mixed at all;
 *   - an empty list scores FALSE, so an empty group poisons an AND branch
 *     rather than being ignored;
 *   - a group's own `actived` is never read.
 *
 * This is the scorer both the server and the SDK run (@usertour/helpers), so
 * these are the real semantics, not a model of them.
 */

const leaf = (actived: boolean, operators?: 'and' | 'or'): RulesCondition =>
  ({ type: 'user-attr', actived, ...(operators ? { operators } : {}) }) as RulesCondition;

const group = (
  conditions: RulesCondition[],
  operators?: 'and' | 'or',
  actived?: boolean,
): RulesCondition =>
  ({
    type: 'group',
    conditions,
    ...(operators ? { operators } : {}),
    ...(actived !== undefined ? { actived } : {}),
  }) as RulesCondition;

describe('the join is taken from conditions[0] — a list is never mixed', () => {
  it('a list led by `and` is ANDed even where later members say `or`', () => {
    // Reads like "A AND (B OR C)" to an author; scores as "A AND B AND C".
    expect(isConditionsActived([leaf(true, 'and'), leaf(false, 'or'), leaf(true, 'or')])).toBe(
      false,
    );
  });

  it('a list led by `or` is ORed even where later members say `and`', () => {
    // Reads like "A OR (B AND C)"; scores as "A OR B OR C".
    expect(isConditionsActived([leaf(false, 'or'), leaf(true, 'and'), leaf(false, 'and')])).toBe(
      true,
    );
  });

  it('reordering the SAME conditions flips the result', () => {
    const a = leaf(true, 'or');
    const b = leaf(false, 'and');
    expect(isConditionsActived([a, b])).toBe(true); // led by `or`
    expect(isConditionsActived([b, a])).toBe(false); // led by `and`
  });

  it('a missing operator on the leader falls through to OR semantics', () => {
    // Anything that is not exactly 'and' takes the else branch.
    expect(isConditionsActived([leaf(false), leaf(true)])).toBe(true);
    expect(isConditionsActived([leaf(false), leaf(false)])).toBe(false);
  });
});

describe('empty lists score FALSE, not vacuously true', () => {
  it('an empty top-level list is false', () => {
    expect(isConditionsActived([])).toBe(false);
  });

  it('an empty GROUP poisons an AND branch', () => {
    // The group recurses into an empty list → false → the AND cannot pass.
    expect(isConditionsActived([leaf(true, 'and'), group([], 'and')])).toBe(false);
  });

  it('an empty group is merely inert under OR', () => {
    expect(isConditionsActived([leaf(true, 'or'), group([], 'or')])).toBe(true);
    expect(isConditionsActived([leaf(false, 'or'), group([], 'or')])).toBe(false);
  });
});

describe("a group's own `actived` is never read", () => {
  it('an actived:true group whose children fail still fails', () => {
    expect(isConditionsActived([group([leaf(false, 'and')], 'and', true)])).toBe(false);
  });

  it('an actived:false group whose children pass still passes', () => {
    expect(isConditionsActived([group([leaf(true, 'and')], 'and', false)])).toBe(true);
  });
});

describe('nesting — the join is re-taken at every level', () => {
  it('an inner list uses ITS OWN leader, not the outer one', () => {
    // outer: AND. inner: led by `or`, so one active child is enough.
    const inner = group([leaf(false, 'or'), leaf(true, 'or')], 'and');
    expect(isConditionsActived([leaf(true, 'and'), inner])).toBe(true);
  });

  it('three levels compose', () => {
    const deepest = group([leaf(true, 'and'), leaf(true, 'and')], 'and');
    const middle = group([leaf(false, 'or'), deepest], 'and');
    expect(isConditionsActived([leaf(true, 'and'), middle])).toBe(true);
  });

  it('one false leaf at the bottom of an all-AND chain sinks the whole tree', () => {
    const deepest = group([leaf(true, 'and'), leaf(false, 'and')], 'and');
    const middle = group([deepest], 'and');
    expect(isConditionsActived([leaf(true, 'and'), middle])).toBe(false);
  });
});

describe('a leaf with no `actived` is treated as not active', () => {
  it('undefined actived fails an AND', () => {
    const bare = { type: 'user-attr', operators: 'and' } as unknown as RulesCondition;
    expect(isConditionsActived([bare, leaf(true, 'and')])).toBe(false);
  });

  it('undefined actived does not satisfy an OR on its own', () => {
    const bare = { type: 'user-attr', operators: 'or' } as unknown as RulesCondition;
    expect(isConditionsActived([bare])).toBe(false);
  });
});

describe('single-condition lists', () => {
  it('one active condition passes under either join', () => {
    expect(isConditionsActived([leaf(true, 'and')])).toBe(true);
    expect(isConditionsActived([leaf(true, 'or')])).toBe(true);
  });

  it('one inactive condition fails under either join', () => {
    expect(isConditionsActived([leaf(false, 'and')])).toBe(false);
    expect(isConditionsActived([leaf(false, 'or')])).toBe(false);
  });
});
