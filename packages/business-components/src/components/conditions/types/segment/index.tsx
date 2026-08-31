import { catalogEntryForSource } from '@usertour/constants';
import { Archive2LineIcon, Filter2LineIcon, GroupLineIcon, SegmentIcon } from '@usertour/icons';
import type { RulesCondition, Segment } from '@usertour/types';
import { type ReactNode, useMemo } from 'react';
import {
  useConditionsContext,
  useConditionsT,
  useSummaryTextClass,
} from '../../conditions-context';
import { OperatorSelect } from '../../primitives/operator-select';
import type { ConditionTypeSchema } from '../../schema-types';
import { validateSegment } from '../../validators';
import { ConditionCombobox, type ConditionComboboxItem } from '../../ui/condition-combobox';

export interface SegmentData {
  logic?: string;
  segmentId?: string;
}

const readData = (condition: RulesCondition): SegmentData =>
  (condition.data as SegmentData | undefined) ?? {};

const writeData = (condition: RulesCondition, patch: Partial<SegmentData>): RulesCondition => ({
  ...condition,
  data: { ...readData(condition), ...patch },
});

const findSegment = (
  segments: Segment[] | undefined,
  segmentId: string | undefined,
): Segment | undefined => segments?.find((s) => s.id === segmentId);

const labelForBizType = (segment: Segment | undefined, t: ReturnType<typeof useConditionsT>) => {
  if (!segment || segment.bizType === 'USER') return t('conditions.types.segment.user');
  if (segment.bizType === 'COMPANY') return t('conditions.types.segment.company');
  return t('conditions.types.segment.user');
};

/**
 * The synced-provider mark for a segment fed by inbound cohort sync
 * (`source` names the provider), or undefined for ordinary segments.
 */
const syncedMark = (
  segment: Segment,
  t: ReturnType<typeof useConditionsT>,
): ReactNode | undefined => {
  const entry = catalogEntryForSource(segment.source);
  if (!entry) {
    return undefined;
  }
  const label = t('conditions.types.segment.syncedFrom', { provider: entry.name });
  return (
    <img
      src={entry.imagePath}
      alt={label}
      title={label}
      className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
    />
  );
};

// Every row carries a leading mark so the column stays aligned: the sidebar's
// per-dataType icon vocabulary, with the provider logo taking over for synced
// segments.
const leadingFor = (segment: Segment, t: ReturnType<typeof useConditionsT>): ReactNode => {
  const synced = syncedMark(segment, t);
  if (synced) {
    return synced;
  }
  const className = 'h-3.5 w-3.5 shrink-0 text-muted-foreground';
  if (segment.dataType === 'ALL') {
    return <GroupLineIcon className={className} />;
  }
  if (segment.dataType === 'CONDITION') {
    return <Filter2LineIcon className={className} />;
  }
  return <Archive2LineIcon className={className} />;
};

// ---------- Summary ----------

function SegmentSummary({ condition }: { condition: RulesCondition }) {
  const t = useConditionsT();
  const summaryTextClass = useSummaryTextClass();
  const { segments } = useConditionsContext();
  const data = readData(condition);
  const segment = findSegment(segments, data.segmentId);
  const operatorLabel =
    data.logic === 'not' ? t('conditions.operators.isNotIn') : t('conditions.operators.isIn');

  if (!segment) {
    return (
      <span className="inline-flex items-center gap-2 text-muted-foreground">
        <SegmentIcon className="h-3.5 w-3.5 shrink-0" />
        <span>{t('conditions.types.segment.placeholder')}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <SegmentIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className={summaryTextClass}>
        <span>{labelForBizType(segment, t)}</span>{' '}
        <span className="text-muted-foreground">{operatorLabel}</span>{' '}
        <span className="font-medium">{segment.name}</span>
      </span>
      {syncedMark(segment, t)}
    </span>
  );
}

// ---------- Editor ----------

interface EditorProps {
  condition: RulesCondition;
  onChange: (next: RulesCondition) => void;
}

function SegmentEditor({ condition, onChange }: EditorProps) {
  const t = useConditionsT();
  const { segments } = useConditionsContext();
  const data = readData(condition);

  const operatorOptions = useMemo(
    () => [
      { value: 'is', label: t('conditions.operators.isIn') },
      { value: 'not', label: t('conditions.operators.isNotIn') },
    ],
    [t],
  );

  const toItem = useMemo(
    () =>
      (segment: Segment): ConditionComboboxItem => ({
        value: segment.id,
        label: segment.name,
        leading: leadingFor(segment, t),
      }),
    [t],
  );

  const groups = useMemo(() => {
    if (!segments) return undefined;
    const userItems = segments.filter((s) => s.bizType === 'USER').map(toItem);
    const companyItems = segments.filter((s) => s.bizType === 'COMPANY').map(toItem);
    const formatted = [
      { heading: t('conditions.types.segment.userHeading'), items: userItems },
      { heading: t('conditions.types.segment.companyHeading'), items: companyItems },
    ].filter((g) => g.items.length > 0);
    return formatted.length > 0 ? formatted : undefined;
  }, [segments, t, toItem]);

  const allItems = useMemo<ConditionComboboxItem[]>(
    () => (segments ?? []).map(toItem),
    [segments, toItem],
  );

  return (
    <div className="flex flex-col gap-2">
      <OperatorSelect
        value={data.logic ?? 'is'}
        onChange={(logic) => onChange(writeData(condition, { logic }))}
        options={operatorOptions}
        placeholder={t('conditions.types.segment.operatorPlaceholder')}
      />
      <ConditionCombobox
        value={data.segmentId}
        onChange={(segmentId) => onChange(writeData(condition, { segmentId }))}
        items={allItems}
        groups={groups}
        placeholder={t('conditions.types.segment.selectPlaceholder')}
        searchPlaceholder={t('conditions.types.segment.searchPlaceholder')}
        emptyText={t('conditions.types.segment.empty')}
      />
    </div>
  );
}

// ---------- Schema ----------

export const segmentSchema: ConditionTypeSchema<SegmentData> = {
  type: 'segment',
  labelKey: 'conditions.types.segment.label',
  Icon: SegmentIcon,
  defaultData: () => ({ logic: 'is' }),
  Summary: SegmentSummary,
  Editor: SegmentEditor,
  validate: (condition, ctx) => validateSegment(readData(condition), ctx.segments),
};
