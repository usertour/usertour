import { priorityCompare } from './content-utils';

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
