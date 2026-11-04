import { Prisma } from '@prisma/client';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';

const DAY_MS = 86_400_000;

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
 * One entry per calendar day (in `timezone`) covered by [rangeStart, rangeEnd],
 * each carrying the trailing rolling window of `rollingWindow` days that ends
 * with that day.
 *
 * Timezone-pure: instants only ever become wall-clock strings via
 * formatInTimeZone (display), and wall-clock strings only ever become instants
 * via fromZonedTime (construction) — both anchored to the REQUESTED timezone.
 * The machine's own timezone participates nowhere, so results are identical on
 * any deployment. (The previous inline logic cut days with server-local
 * startOfDay/endOfDay over toZonedTime-shifted values, which is only correct
 * when the requested timezone equals the server's.)
 *
 * Building each edge from its own wall-clock string also keeps DST-transition
 * days (23h/25h) correct.
 */
export function rollingDayWindows(
  rangeStart: string | Date,
  rangeEnd: string | Date,
  timezone: string,
  rollingWindow: number,
): DayWindow[] {
  const firstDay = formatInTimeZone(new Date(rangeStart), timezone, 'yyyy-MM-dd');
  const lastDay = formatInTimeZone(new Date(rangeEnd), timezone, 'yyyy-MM-dd');

  const windows: DayWindow[] = [];
  // Day labels are plain calendar dates — walk them in UTC space, where every
  // day is exactly 24h (no DST), and compare lexicographically.
  for (let d = new Date(`${firstDay}T00:00:00Z`); ; d = new Date(d.getTime() + DAY_MS)) {
    const day = d.toISOString().slice(0, 10);
    if (day > lastDay) {
      break;
    }
    const windowStartDay = new Date(d.getTime() - (rollingWindow - 1) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    windows.push({
      day,
      dayStart: fromZonedTime(`${day} 00:00:00.000`, timezone),
      windowStart: fromZonedTime(`${windowStartDay} 00:00:00.000`, timezone),
      windowEnd: fromZonedTime(`${day} 23:59:59.999`, timezone),
    });
  }
  return windows;
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
