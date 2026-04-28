import { TimeIcon } from '@usertour-packages/icons';
import type { RulesCondition, TimeConditionData } from '@usertour/types';
import { format, parseISO } from 'date-fns';
import { useConditionsT } from '../../conditions-context';
import type { ConditionTypeSchema } from '../../schema-types';
import { ConditionInput } from '../../ui/condition-input';
import { validateTime } from '../../validators';

// We persist in the V2 ISO 8601 format. Reads tolerate the legacy MM/dd/yyyy
// shape so existing data is upgraded transparently on first edit.

interface ParsedTime {
  date: string; // yyyy-MM-dd or ''
  hour: string; // 00-23
  minute: string; // 00-59
}

const EMPTY_PARSED: ParsedTime = { date: '', hour: '00', minute: '00' };

const parseISOToParts = (iso: string | undefined): ParsedTime => {
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

const parseLegacyToParts = (
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

const readParts = (data: TimeConditionData | undefined): { start: ParsedTime; end: ParsedTime } => {
  if (!data) return { start: EMPTY_PARSED, end: EMPTY_PARSED };
  // V2 — startTime/endTime as ISO strings.
  if ('startTime' in data || 'endTime' in data) {
    return {
      start: parseISOToParts((data as { startTime?: string }).startTime),
      end: parseISOToParts((data as { endTime?: string }).endTime),
    };
  }
  // Legacy.
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

const partsToISO = (parts: ParsedTime): string | undefined => {
  if (!parts.date) return undefined;
  const date = new Date(parts.date);
  date.setHours(Number.parseInt(parts.hour || '0'), Number.parseInt(parts.minute || '0'), 0, 0);
  return date.toISOString();
};

const writeData = (start: ParsedTime, end: ParsedTime): TimeConditionData => {
  const out: TimeConditionData = {} as TimeConditionData;
  const startISO = partsToISO(start);
  const endISO = partsToISO(end);
  if (startISO) (out as { startTime?: string }).startTime = startISO;
  if (endISO) (out as { endTime?: string }).endTime = endISO;
  return out;
};

const formatPretty = (parts: ParsedTime): string => {
  if (!parts.date) return '';
  try {
    return `${format(parseISO(parts.date), 'PP')}, ${parts.hour}:${parts.minute}`;
  } catch {
    return `${parts.date}, ${parts.hour}:${parts.minute}`;
  }
};

// ---------- Summary ----------

function TimeSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const { start, end } = readParts(condition.data as TimeConditionData | undefined);

  if (!start.date && !end.date) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <TimeIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.time.placeholder')}</span>
      </span>
    );
  }

  const between = Boolean(end.date);
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <TimeIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        <span className="text-muted-foreground">
          {between ? t('conditions.types.time.between') : t('conditions.types.time.after')}
        </span>{' '}
        <span className="font-semibold">{formatPretty(start)}</span>
        {between && (
          <>
            {' '}
            <span className="text-muted-foreground">{t('conditions.operators.and')}</span>{' '}
            <span className="font-semibold">{formatPretty(end)}</span>
          </>
        )}
      </span>
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function TimeEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { start, end } = readParts(condition.data as TimeConditionData | undefined);

  const commit = (next: { start?: ParsedTime; end?: ParsedTime }) => {
    const nextStart = next.start ?? start;
    const nextEnd = next.end ?? end;
    onChange({ ...condition, data: writeData(nextStart, nextEnd) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.time.startLabel')}
        </div>
        <div className="flex items-center gap-1.5">
          <ConditionInput
            type="date"
            value={start.date}
            onChange={(e) => commit({ start: { ...start, date: e.target.value } })}
            className="flex-1"
          />
          <ConditionInput
            type="time"
            value={`${start.hour}:${start.minute}`}
            onChange={(e) => {
              const [h = '00', m = '00'] = e.target.value.split(':');
              commit({ start: { ...start, hour: h, minute: m } });
            }}
            className="w-[110px]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.time.endLabel')}
        </div>
        <div className="flex items-center gap-1.5">
          <ConditionInput
            type="date"
            value={end.date}
            onChange={(e) => commit({ end: { ...end, date: e.target.value } })}
            className="flex-1"
          />
          <ConditionInput
            type="time"
            value={`${end.hour}:${end.minute}`}
            onChange={(e) => {
              const [h = '00', m = '00'] = e.target.value.split(':');
              commit({ end: { ...end, hour: h, minute: m } });
            }}
            className="w-[110px]"
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Schema ----------

export const timeSchema: ConditionTypeSchema<TimeConditionData> = {
  type: 'time',
  labelKey: 'conditions.types.time.label',
  Icon: TimeIcon,
  defaultData: () => ({}) as TimeConditionData,
  Summary: TimeSummary,
  Editor: TimeEditor,
  validate: (condition) => validateTime(condition.data as TimeConditionData | undefined),
};
