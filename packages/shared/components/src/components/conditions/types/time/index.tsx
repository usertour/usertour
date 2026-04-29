import { TimeIcon } from '@usertour-packages/icons';
import type { RulesCondition, TimeConditionData } from '@usertour/types';
import { useConditionsT } from '../../conditions-context';
import type { ConditionTypeSchema } from '../../schema-types';
import { ConditionInput } from '../../ui/condition-input';
import { validateTime } from '../../validators';
import { type ParsedTime, formatPretty, readParts, writeData } from './utils';

// We persist in the V2 ISO 8601 format. Reads tolerate the legacy MM/dd/yyyy
// shape so existing data is upgraded transparently on first edit. The pure
// (de)serialization helpers live in ./utils so tests can exercise them
// without pulling React.

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
