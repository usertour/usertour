import { representationCondition } from './representation.schema';

// An event condition's count guards against `at_least: 0` / `between` n:0, which
// compile to a "match every user regardless of the event" condition (runtime is
// `eventCount >= 0`). `at_most`/`exactly` with 0 are legitimate ("never happened")
// and must stay allowed. Counts must also be non-negative integers.
describe('event condition count', () => {
  const ev = (count: unknown) =>
    representationCondition.safeParse({ type: 'event', event: 'signup', count });

  it('rejects at_least: 0 (would match everyone)', () => {
    expect(ev({ op: 'at_least', n: 0 }).success).toBe(false);
  });

  it('rejects between with n: 0', () => {
    expect(ev({ op: 'between', n: 0, n2: 5 }).success).toBe(false);
  });

  it('allows at_most: 0 and exactly: 0 (event has never happened)', () => {
    expect(ev({ op: 'at_most', n: 0 }).success).toBe(true);
    expect(ev({ op: 'exactly', n: 0 }).success).toBe(true);
  });

  it('allows the normal thresholds', () => {
    expect(ev({ op: 'at_least', n: 1 }).success).toBe(true);
    expect(ev({ op: 'between', n: 2, n2: 5 }).success).toBe(true);
  });

  it('rejects negative and non-integer counts', () => {
    expect(ev({ op: 'at_least', n: -1 }).success).toBe(false);
    expect(ev({ op: 'exactly', n: 1.5 }).success).toBe(false);
  });

  it('still allows an omitted count (treated as at_least 1)', () => {
    expect(representationCondition.safeParse({ type: 'event', event: 'signup' }).success).toBe(
      true,
    );
  });
});
