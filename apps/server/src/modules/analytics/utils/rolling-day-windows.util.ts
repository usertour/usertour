import { tz } from '@date-fns/tz';
import { Prisma } from '@prisma/client';
import { addDays, eachDayOfInterval, format, isBefore, startOfDay, subDays } from 'date-fns';

export interface DayWindow {
  /** Calendar day label in the requested timezone, yyyy-MM-dd. */
  day: string;
  /** First instant of `day` in the requested timezone. */
  dayStart: Date;
  /** Start of the trailing rolling window that ends with `day`. */
  windowStart: Date;
  /** Last instant of `day` in the requested timezone. */
  windowEnd: Date;
}

/**
 * The last instant of the calendar day containing `day` in `timezone`: the next
 * day's first instant minus 1ms. date-fns `endOfDay` sets the wall clock to
 * 23:59:59.999, which is ambiguous on a day that turns its clock back at
 * midnight (America/Santiago 2026-04-04 is 25h) and resolves to the first
 * occurrence, dropping the day's last hour.
 */
export function endOfDayInZone(day: Date | number, timezone: string): Date {
  const inZone = { in: tz(timezone) };
  return new Date(startOfDay(addDays(day, 1, inZone), inZone).getTime() - 1);
}

/**
 * One entry per calendar day (in `timezone`) covered by [rangeStart, rangeEnd],
 * each carrying the trailing rolling window of `rollingWindow` days that ends
 * with that day.
 *
 * Timezone-pure: every edge is resolved by date-fns in the REQUESTED timezone
 * (the `in` option), so the machine's own timezone participates nowhere and
 * results are identical on any deployment. That also places a day's first
 * instant correctly where a DST switch removes midnight itself (the day then
 * begins at 01:00, as in America/Santiago or America/Havana); a wall-clock
 * "00:00" built by hand resolves an hour early, into the previous day.
 *
 * The instants come back as plain Dates: a TZDate serialises with its zone
 * offset, and the callers put these on the wire and into SQL as UTC.
 */
export function rollingDayWindows(
  rangeStart: string | Date,
  rangeEnd: string | Date,
  timezone: string,
  rollingWindow: number,
): DayWindow[] {
  const start = new Date(rangeStart);
  const end = new Date(rangeEnd);
  if (isBefore(end, start)) {
    return [];
  }
  const inZone = { in: tz(timezone) };
  return eachDayOfInterval({ start, end }, inZone).map((day) => ({
    day: format(day, 'yyyy-MM-dd', inZone),
    dayStart: new Date(startOfDay(day, inZone)),
    windowStart: new Date(startOfDay(subDays(day, rollingWindow - 1), inZone)),
    windowEnd: endOfDayInZone(day, timezone),
  }));
}

/**
 * SQL labelling `column` (a timestamptz) with the day of `days` it falls in,
 * for a per-day GROUP BY. The days carry the zone already resolved into
 * instants, so the database compares instants only and never reads a zone
 * name: a name its own zone data lacks (an older alias a browser still
 * reports) cannot fail the query, and every bucket is labelled exactly as the
 * caller's day rows are. An instant before the first day yields NULL; the
 * last bucket is open-ended, so the caller bounds the column by the range
 * end itself (every per-day query here filters `createdAt <= endDate`).
 */
export const dayLabelSql = (column: Prisma.Sql, days: readonly DayWindow[]): Prisma.Sql => {
  const labels = days.map((window) => window.day);
  const starts = days.map((window) => window.dayStart.toISOString());
  return Prisma.sql`(${labels}::text[])[width_bucket(${column}, ${starts}::timestamptz[])]`;
};
