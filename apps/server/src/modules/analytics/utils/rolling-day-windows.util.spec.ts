import { Prisma } from '@prisma/client';
import { dayLabelSql, rollingDayWindows } from './rolling-day-windows.util';

/**
 * Timezone-purity regression. The old inline logic cut days with server-local
 * startOfDay/endOfDay over toZonedTime-shifted values, so it was only correct
 * when the requested timezone equaled the server's — live-verified as an NPS
 * of 0 with two promoter answers (the last rolling window ended at
 * 2026-07-04T15:59:59Z instead of 2026-07-05T23:59:59Z for a UTC request on a
 * +8 machine). These assertions are exact instants, valid on any machine.
 */
describe('rollingDayWindows', () => {
  const rangeStart = '2026-06-05T00:00:00.000Z';
  const rangeEnd = '2026-07-05T23:59:59.999Z';

  it('UTC: one entry per UTC calendar day, last window ends at the range end instant', () => {
    const days = rollingDayWindows(rangeStart, rangeEnd, 'UTC', 365);
    expect(days).toHaveLength(31);
    expect(days[0].day).toBe('2026-06-05');
    const last = days[days.length - 1];
    expect(last.day).toBe('2026-07-05');
    expect(last.dayStart.toISOString()).toBe('2026-07-05T00:00:00.000Z');
    expect(last.windowEnd.toISOString()).toBe('2026-07-05T23:59:59.999Z');
    // 365-day trailing window: matches the dashboard's "Jul 06, 2025 → Jul 05, 2026".
    expect(last.windowStart.toISOString()).toBe('2025-07-06T00:00:00.000Z');
  });

  it('Asia/Shanghai: boundaries are Shanghai wall-clock instants', () => {
    // The Shanghai day 2026-07-05 spans 07-04T16:00Z .. 07-05T15:59:59.999Z.
    const days = rollingDayWindows(
      '2026-06-04T16:00:00.000Z',
      '2026-07-05T15:59:59.999Z',
      'Asia/Shanghai',
      30,
    );
    const last = days[days.length - 1];
    expect(last.day).toBe('2026-07-05');
    expect(last.dayStart.toISOString()).toBe('2026-07-04T16:00:00.000Z');
    expect(last.windowEnd.toISOString()).toBe('2026-07-05T15:59:59.999Z');
    expect(last.windowStart.toISOString()).toBe('2026-06-05T16:00:00.000Z');
  });

  it('rollingWindow=1: the window is exactly the day itself', () => {
    const [only] = rollingDayWindows('2026-07-05T00:00:00Z', '2026-07-05T23:59:59.999Z', 'UTC', 1);
    expect(only.windowStart.toISOString()).toBe(only.dayStart.toISOString());
    expect(only.windowEnd.toISOString()).toBe('2026-07-05T23:59:59.999Z');
  });

  it('DST-transition day (America/New_York, 2026-03-08 is 23h): each edge from its own wall clock', () => {
    const days = rollingDayWindows(
      '2026-03-08T05:00:00.000Z',
      '2026-03-09T03:59:59.999Z',
      'America/New_York',
      2,
    );
    const [dst] = days;
    expect(dst.day).toBe('2026-03-08');
    // Midnight is still EST (-5); end of day is already EDT (-4).
    expect(dst.dayStart.toISOString()).toBe('2026-03-08T05:00:00.000Z');
    expect(dst.windowEnd.toISOString()).toBe('2026-03-09T03:59:59.999Z');
  });

  it('DST switch at midnight (America/Santiago, 2026-09-06 begins at 01:00): the day starts at its first real instant', () => {
    // 00:00-01:00 does not exist on 09-06. A wall-clock "00:00" resolves an
    // hour early, into 09-05 23:00, which would move that hour's events to
    // 09-06; the day must start where its clock actually starts.
    const days = rollingDayWindows(
      '2026-09-05T04:00:00.000Z',
      '2026-09-07T02:59:59.999Z',
      'America/Santiago',
      1,
    );
    expect(days.map((window) => window.day)).toEqual(['2026-09-05', '2026-09-06']);
    const [before, dst] = days;
    expect(before.windowEnd.toISOString()).toBe('2026-09-06T03:59:59.999Z');
    expect(dst.dayStart.toISOString()).toBe('2026-09-06T04:00:00.000Z');
    expect(dst.windowEnd.toISOString()).toBe('2026-09-07T02:59:59.999Z');
  });

  it('inverted range yields no days', () => {
    expect(rollingDayWindows('2026-07-05T00:00:00Z', '2026-07-01T00:00:00Z', 'UTC', 7)).toEqual([]);
  });
});

describe('dayLabelSql', () => {
  it('hands the database day labels and instants, never the zone name', () => {
    // An older alias a browser still reports; the database may not know it.
    const days = rollingDayWindows(
      '2026-11-02T22:00:00.000Z',
      '2026-11-04T21:59:59.999Z',
      'Europe/Kiev',
      1,
    );
    const sql = dayLabelSql(Prisma.sql`"createdAt"`, days);

    expect(sql.text).toBe('($1::text[])[width_bucket("createdAt", $2::timestamptz[])]');
    expect(sql.values).toEqual([
      ['2026-11-03', '2026-11-04'],
      ['2026-11-02T22:00:00.000Z', '2026-11-03T22:00:00.000Z'],
    ]);
  });
});
