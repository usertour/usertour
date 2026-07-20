import { canCompleteChecklistItem, priorityCompare } from './content-utils';

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
