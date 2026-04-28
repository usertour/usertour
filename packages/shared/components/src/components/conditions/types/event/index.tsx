import { EventTrackerIcon } from '@usertour-packages/icons';
import {
  type Event,
  EventCountLogic,
  EventScope,
  EventTimeLogic,
  EventTimeUnit,
  type RulesCondition,
} from '@usertour/types';
import { useMemo } from 'react';
import { ConditionList } from '../../condition-list';
import { useConditionsContext, useConditionsT } from '../../conditions-context';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateEvent } from '../../validators';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';
import { ConditionInput } from '../../ui/condition-input';

export interface EventData {
  eventId?: string;
  countLogic?: EventCountLogic;
  count?: number;
  count2?: number;
  timeLogic?: EventTimeLogic;
  windowValue?: number;
  windowValue2?: number;
  timeUnit?: EventTimeUnit;
  scope?: EventScope;
  whereConditions?: RulesCondition[];
}

const DEFAULTS: EventData = {
  countLogic: EventCountLogic.AT_LEAST,
  count: 1,
  timeLogic: EventTimeLogic.AT_ANY_POINT_IN_TIME,
  timeUnit: EventTimeUnit.DAYS,
  scope: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY,
};

const COUNT_LOGIC_KEYS = [
  { value: EventCountLogic.AT_LEAST, labelKey: 'conditions.types.event.countLogic.atLeast' },
  { value: EventCountLogic.AT_MOST, labelKey: 'conditions.types.event.countLogic.atMost' },
  { value: EventCountLogic.EXACTLY, labelKey: 'conditions.types.event.countLogic.exactly' },
  { value: EventCountLogic.BETWEEN, labelKey: 'conditions.types.event.countLogic.between' },
];

const TIME_LOGIC_KEYS = [
  { value: EventTimeLogic.IN_THE_LAST, labelKey: 'conditions.types.event.timeLogic.inTheLast' },
  { value: EventTimeLogic.MORE_THAN, labelKey: 'conditions.types.event.timeLogic.moreThan' },
  { value: EventTimeLogic.BETWEEN, labelKey: 'conditions.types.event.timeLogic.between' },
  {
    value: EventTimeLogic.AT_ANY_POINT_IN_TIME,
    labelKey: 'conditions.types.event.timeLogic.atAnyPoint',
  },
];

const TIME_UNIT_KEYS = [
  { value: EventTimeUnit.SECONDS, labelKey: 'conditions.types.event.timeUnit.seconds' },
  { value: EventTimeUnit.MINUTES, labelKey: 'conditions.types.event.timeUnit.minutes' },
  { value: EventTimeUnit.HOURS, labelKey: 'conditions.types.event.timeUnit.hours' },
  { value: EventTimeUnit.DAYS, labelKey: 'conditions.types.event.timeUnit.days' },
];

const SCOPE_KEYS = [
  {
    value: EventScope.BY_CURRENT_USER_IN_ANY_COMPANY,
    labelKey: 'conditions.types.event.scope.currentUserAnyCompany',
  },
  {
    value: EventScope.BY_CURRENT_USER_IN_CURRENT_COMPANY,
    labelKey: 'conditions.types.event.scope.currentUserCurrentCompany',
  },
  {
    value: EventScope.BY_ANY_USER_IN_CURRENT_COMPANY,
    labelKey: 'conditions.types.event.scope.anyUserCurrentCompany',
  },
];

const readData = (condition: RulesCondition): EventData => ({
  ...DEFAULTS,
  ...((condition.data as EventData | undefined) ?? {}),
});

const writeData = (condition: RulesCondition, patch: Partial<EventData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const findEvent = (events: Event[] | undefined, id: string | undefined): Event | undefined =>
  events?.find((e) => e.id === id);

// ---------- Summary ----------

function EventSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const { events } = useConditionsContext();
  const data = readData(condition);
  const event = findEvent(events, data.eventId);

  if (!event || !data.eventId) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <EventTrackerIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.event.placeholder')}</span>
      </span>
    );
  }

  const eventName = event.displayName || event.codeName;
  const countLogicLabel = t(
    COUNT_LOGIC_KEYS.find((o) => o.value === data.countLogic)?.labelKey ?? '',
  );
  const count = data.count ?? 0;
  const timesLabel = t(
    count === 1 ? 'conditions.types.event.time' : 'conditions.types.event.times',
  );

  let timePart = '';
  if (data.timeLogic === EventTimeLogic.AT_ANY_POINT_IN_TIME) {
    timePart = t('conditions.types.event.timeLogic.atAnyPoint');
  } else {
    const tl = t(TIME_LOGIC_KEYS.find((o) => o.value === data.timeLogic)?.labelKey ?? '');
    const tu = t(TIME_UNIT_KEYS.find((o) => o.value === data.timeUnit)?.labelKey ?? '');
    if (data.timeLogic === EventTimeLogic.BETWEEN) {
      timePart = `${tl} ${data.windowValue ?? 0} ${t('conditions.operators.and')} ${data.windowValue2 ?? 0} ${tu}`;
    } else if (data.timeLogic === EventTimeLogic.MORE_THAN) {
      timePart = `${tl} ${data.windowValue ?? 0} ${tu} ${t('conditions.types.event.ago')}`;
    } else {
      timePart = `${tl} ${data.windowValue ?? 0} ${tu}`;
    }
  }

  const whereCount = data.whereConditions?.length ?? 0;
  const wherePart =
    whereCount > 0
      ? ` ${t('conditions.types.event.where')} ${t('conditions.types.event.conditionCount', { count: whereCount })}`
      : '';

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <EventTrackerIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 truncate">
        <span className="font-semibold">{eventName}</span>{' '}
        <span className="text-muted-foreground">{countLogicLabel}</span>{' '}
        <span className="font-semibold">{count}</span>
        {data.countLogic === EventCountLogic.BETWEEN && (
          <>
            {' '}
            <span className="text-muted-foreground">{t('conditions.operators.and')}</span>{' '}
            <span className="font-semibold">{data.count2 ?? 0}</span>
          </>
        )}{' '}
        <span className="text-muted-foreground">{timesLabel},</span>{' '}
        <span className="text-muted-foreground">{timePart}</span>
        {wherePart && <span className="text-muted-foreground">{wherePart}</span>}
      </span>
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function EventEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { events } = useConditionsContext();
  const data = readData(condition);

  const eventItems = useMemo<ConditionComboboxItem[]>(
    () =>
      (events ?? []).map((e) => ({
        value: e.id,
        label: e.displayName || e.codeName,
        hint: e.codeName,
      })),
    [events],
  );

  const countLogicOptions = useMemo(
    () => COUNT_LOGIC_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const timeLogicOptions = useMemo(
    () => TIME_LOGIC_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const timeUnitOptions = useMemo(
    () => TIME_UNIT_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );
  const scopeOptions = useMemo(
    () => SCOPE_KEYS.map((o) => ({ value: o.value, label: t(o.labelKey) })),
    [t],
  );

  const showTimeInputs = data.timeLogic !== EventTimeLogic.AT_ANY_POINT_IN_TIME;

  return (
    <div className="flex w-[360px] flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground">
          {t('conditions.types.event.eventLabel')}
        </div>
        <ConditionCombobox
          value={data.eventId}
          onChange={(eventId) => onChange(writeData(condition, { eventId }))}
          items={eventItems}
          placeholder={t('conditions.types.event.selectPlaceholder')}
          searchPlaceholder={t('conditions.types.event.searchPlaceholder')}
          emptyText={t('conditions.types.event.empty')}
        />
      </div>

      {data.eventId && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <OperatorSelect
              value={data.countLogic}
              onChange={(v) => onChange(writeData(condition, { countLogic: v as EventCountLogic }))}
              options={countLogicOptions}
              className="w-[120px]"
            />
            <ConditionInput
              type="number"
              min={0}
              value={data.count ?? ''}
              onChange={(e) =>
                onChange(
                  writeData(condition, {
                    count: e.target.value ? Number(e.target.value) : undefined,
                  }),
                )
              }
              className="w-16"
            />
            {data.countLogic === EventCountLogic.BETWEEN && (
              <>
                <span className="text-[11px] text-muted-foreground">
                  {t('conditions.operators.and')}
                </span>
                <ConditionInput
                  type="number"
                  min={0}
                  value={data.count2 ?? ''}
                  onChange={(e) =>
                    onChange(
                      writeData(condition, {
                        count2: e.target.value ? Number(e.target.value) : undefined,
                      }),
                    )
                  }
                  className="w-16"
                />
              </>
            )}
            <span className="text-[11px] text-muted-foreground">
              {(data.count ?? 0) === 1
                ? t('conditions.types.event.time')
                : t('conditions.types.event.times')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <OperatorSelect
              value={data.timeLogic}
              onChange={(v) => onChange(writeData(condition, { timeLogic: v as EventTimeLogic }))}
              options={timeLogicOptions}
              className="w-[140px]"
            />
            {showTimeInputs && (
              <>
                <ConditionInput
                  type="number"
                  min={0}
                  value={data.windowValue ?? ''}
                  onChange={(e) =>
                    onChange(
                      writeData(condition, {
                        windowValue: e.target.value ? Number(e.target.value) : undefined,
                      }),
                    )
                  }
                  className="w-16"
                />
                {data.timeLogic === EventTimeLogic.BETWEEN && (
                  <>
                    <span className="text-[11px] text-muted-foreground">
                      {t('conditions.operators.and')}
                    </span>
                    <ConditionInput
                      type="number"
                      min={0}
                      value={data.windowValue2 ?? ''}
                      onChange={(e) =>
                        onChange(
                          writeData(condition, {
                            windowValue2: e.target.value ? Number(e.target.value) : undefined,
                          }),
                        )
                      }
                      className="w-16"
                    />
                  </>
                )}
                <OperatorSelect
                  value={data.timeUnit}
                  onChange={(v) => onChange(writeData(condition, { timeUnit: v as EventTimeUnit }))}
                  options={timeUnitOptions}
                  className="w-[100px]"
                />
                {data.timeLogic === EventTimeLogic.MORE_THAN && (
                  <span className="text-[11px] text-muted-foreground">
                    {t('conditions.types.event.ago')}
                  </span>
                )}
              </>
            )}
          </div>

          <OperatorSelect
            value={data.scope}
            onChange={(v) => onChange(writeData(condition, { scope: v as EventScope }))}
            options={scopeOptions}
          />

          <EventWhereSection condition={condition} onChange={onChange} data={data} />
        </>
      )}
    </div>
  );
}

interface WhereProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
  data: EventData;
}

// Nested list of event-attribute filters scoped to the chosen event. Renders
// a recursive ConditionList limited to event-attr + group types so users can
// build (A AND B) OR (C AND D) — matching v1 RulesEventWhereGroup behavior.
// New event-attr conditions get the parent eventId injected into their data
// so the attribute picker scopes to the chosen event.
function EventWhereSection({ condition, onChange, data }: WhereProps) {
  const t = useConditionsT();
  const where = data.whereConditions ?? [];

  const handleWhereChange = (next: RulesCondition[]) => {
    // ConditionList writes back the full list — when a fresh event-attr lands
    // without an eventId (defaultData() returns empty), inject it so the
    // child editor can fetch attributes-on-event for the right event.
    const stamped = next.map((c) =>
      c.type === 'event-attr' && !(c.data as { eventId?: string })?.eventId
        ? { ...c, data: { ...(c.data as Record<string, unknown>), eventId: data.eventId } }
        : c,
    );
    onChange(writeData(condition, { whereConditions: stamped.length > 0 ? stamped : undefined }));
  };

  return (
    <div className="flex flex-col gap-2 border-t border-border/50 pt-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        {t('conditions.types.event.whereLabel')}
      </div>
      <ConditionList
        conditions={where}
        onChange={handleWhereChange}
        filterItems={['event-attr', 'group']}
      />
    </div>
  );
}

// ---------- Schema ----------

export const eventSchema: ConditionTypeSchema<EventData> = {
  type: 'event',
  labelKey: 'conditions.types.event.label',
  Icon: EventTrackerIcon,
  defaultData: () => ({ ...DEFAULTS }),
  Summary: EventSummary,
  Editor: EventEditor,
  validate: (condition) => validateEvent(readData(condition)),
};
