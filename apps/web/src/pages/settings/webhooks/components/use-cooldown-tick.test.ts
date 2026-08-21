import { nextFutureDeadline } from './use-cooldown-tick';

describe('nextFutureDeadline', () => {
  const now = new Date('2026-08-21T10:00:00.000Z').getTime();
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();

  it('picks the soonest FUTURE deadline, skipping past ones', () => {
    // The one-shot-alarm regression: after A (already past) fires, the next
    // arm must land on B — not on nothing.
    expect(nextFutureDeadline([at(-60_000), at(30 * 60_000)], now)).toBe(now + 30 * 60_000);
    expect(nextFutureDeadline([at(60_000), at(30 * 60_000)], now)).toBe(now + 60_000);
  });

  it('returns null when nothing lies ahead', () => {
    expect(nextFutureDeadline([], now)).toBeNull();
    expect(nextFutureDeadline([null, undefined, ''], now)).toBeNull();
    expect(nextFutureDeadline([at(-1000)], now)).toBeNull();
  });
});
