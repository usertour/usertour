import { TimeIcon } from '@usertour-packages/icons';
import type { RulesCondition, TimeConditionData } from '@usertour/types';
import { format } from 'date-fns';
import { DateTimePicker } from '../../../date-time-picker';
import { useConditionsT, useSummaryTextClass } from '../../conditions-context';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateTime } from '../../validators';
import { EMPTY_PARSED, type ParsedTime, formatPretty, readParts, writeData } from './utils';

// We persist in the V2 ISO 8601 format. Reads tolerate the legacy MM/dd/yyyy
// shape so existing data is upgraded transparently on first edit. The pure
// (de)serialization helpers live in ./utils so tests can exercise them
// without pulling React.

// ---------- Summary ----------

function TimeSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
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
      <span className={summaryTextClass}>
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

// ParsedTime <-> Date conversion. ParsedTime stores yyyy-MM-dd / HH / mm
// as strings so the persisted data shape is stable across the picker
// rewrite; DateTimePicker speaks Date objects, so we translate at the
// editor seam.
const partsToDate = (p: ParsedTime): Date | undefined => {
  if (!p.date) return undefined;
  const [y, m, d] = p.date.split('-').map(Number);
  if (!y || !m || !d) return undefined;
  return new Date(y, m - 1, d, Number(p.hour) || 0, Number(p.minute) || 0, 0, 0);
};

const dateToParts = (d: Date | undefined): ParsedTime => {
  if (!d) return EMPTY_PARSED;
  return {
    date: format(d, 'yyyy-MM-dd'),
    hour: format(d, 'HH'),
    minute: format(d, 'mm'),
  };
};

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
        <DateTimePicker
          value={partsToDate(start)}
          onChange={(d) => commit({ start: dateToParts(d) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.time.endLabel')}
        </div>
        <DateTimePicker
          value={partsToDate(end)}
          onChange={(d) => commit({ end: dateToParts(d) })}
        />
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
