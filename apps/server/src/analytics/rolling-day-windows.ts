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
