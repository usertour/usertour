import type { TimeConditionData } from '@usertour/types';
import { format, parseISO } from 'date-fns';

// Pure data helpers for time-condition (de)serialization. Lives outside
// index.tsx so tests can exercise the round-trip without pulling React.

export interface ParsedTime {
  date: string; // yyyy-MM-dd or ''
  hour: string; // 00-23
  minute: string; // 00-59
}

export const EMPTY_PARSED: ParsedTime = { date: '', hour: '00', minute: '00' };

export const parseISOToParts = (iso: string | undefined): ParsedTime => {
  if (!iso) return EMPTY_PARSED;
  try {
    const d = parseISO(iso);
    return {
      date: format(d, 'yyyy-MM-dd'),
      hour: format(d, 'HH'),
      minute: format(d, 'mm'),
    };
  } catch {
    return EMPTY_PARSED;
  }
};

export const parseLegacyToParts = (
  date: string | undefined,
  hour: string | undefined,
  minute: string | undefined,
): ParsedTime => {
  if (!date) return { ...EMPTY_PARSED, hour: hour ?? '00', minute: minute ?? '00' };
  const parts = date.split('/');
  if (parts.length !== 3) return { ...EMPTY_PARSED, hour: hour ?? '00', minute: minute ?? '00' };
  const [m, d, y] = parts;
  const iso = `${y.padStart(4, '0')}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  return { date: iso, hour: hour ?? '00', minute: minute ?? '00' };
};

export const readParts = (
  data: TimeConditionData | undefined,
): { start: ParsedTime; end: ParsedTime } => {
  if (!data) return { start: EMPTY_PARSED, end: EMPTY_PARSED };
  if ('startTime' in data || 'endTime' in data) {
    return {
      start: parseISOToParts((data as { startTime?: string }).startTime),
      end: parseISOToParts((data as { endTime?: string }).endTime),
    };
  }
  const legacy = data as {
    startDate?: string;
    startDateHour?: string;
    startDateMinute?: string;
    endDate?: string;
    endDateHour?: string;
    endDateMinute?: string;
  };
  return {
    start: parseLegacyToParts(legacy.startDate, legacy.startDateHour, legacy.startDateMinute),
    end: parseLegacyToParts(legacy.endDate, legacy.endDateHour, legacy.endDateMinute),
  };
};

// Convert ParsedTime → ISO 8601 UTC. The string is in the user's local
// timezone (it came from <input type="date"> + <input type="time">), so we
// build the Date with the local-time constructor — `new Date('yyyy-MM-dd')`
// would parse as UTC per ECMA, then setHours would write local hours and
// shift the wall-clock day backward in negative timezones (e.g., a user in
// America/Los_Angeles entering "2026-04-28 09:30" would get
// "2026-04-27T16:30Z" — off by one day).
export const partsToISO = (parts: ParsedTime): string | undefined => {
  if (!parts.date) return undefined;
  const segments = parts.date.split('-').map((s) => Number.parseInt(s, 10));
  if (segments.length !== 3 || segments.some((n) => Number.isNaN(n))) return undefined;
  const [yyyy, mm, dd] = segments;
  const hours = Number.parseInt(parts.hour || '0', 10);
  const minutes = Number.parseInt(parts.minute || '0', 10);
  const date = new Date(yyyy, mm - 1, dd, hours, minutes, 0, 0);
  return date.toISOString();
};

export const writeData = (start: ParsedTime, end: ParsedTime): TimeConditionData => {
  const out: TimeConditionData = {} as TimeConditionData;
  const startISO = partsToISO(start);
  const endISO = partsToISO(end);
  if (startISO) (out as { startTime?: string }).startTime = startISO;
  if (endISO) (out as { endTime?: string }).endTime = endISO;
  return out;
};

// Display the parts as a human-readable line (e.g., "Apr 28, 2026, 09:30").
// Constructs the Date locally from y/m/d for the same timezone reasons as
// partsToISO; falls back to the raw string if parsing fails.
export const formatPretty = (parts: ParsedTime): string => {
  if (!parts.date) return '';
  const segments = parts.date.split('-').map((s) => Number.parseInt(s, 10));
  if (segments.length !== 3 || segments.some((n) => Number.isNaN(n))) {
    return `${parts.date}, ${parts.hour}:${parts.minute}`;
  }
  const [yyyy, mm, dd] = segments;
  const d = new Date(yyyy, mm - 1, dd);
  return `${format(d, 'PP')}, ${parts.hour}:${parts.minute}`;
};
