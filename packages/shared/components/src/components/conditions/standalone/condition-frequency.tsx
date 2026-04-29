import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import {
  ContentDataType,
  Frequency,
  FrequencyUnits,
  type RulesFrequencyValue,
  type RulesFrequencyValueAtLeast,
  type RulesFrequencyValueEvery,
} from '@usertour/types';
import { type ChangeEvent, useEffect, useMemo, useState } from 'react';
import type { ConditionsTranslator } from '../conditions-context';
import { ConditionInput } from '../ui/condition-input';
import { ConditionInlineSelect } from '../ui/condition-inline-select';
import { resolveTranslator } from './translator';
import { ErrorTooltip, ErrorTooltipAnchor, ErrorTooltipContent } from '../../error-tooltip';

const FREQUENCY_KEYS = [
  { value: Frequency.ONCE, labelKey: 'conditions.standalone.frequency.units.once' },
  { value: Frequency.MULTIPLE, labelKey: 'conditions.standalone.frequency.units.multiple' },
  { value: Frequency.UNLIMITED, labelKey: 'conditions.standalone.frequency.units.unlimited' },
];

const UNIT_KEYS = [
  { value: FrequencyUnits.DAYES, labelKey: 'conditions.standalone.frequency.unit.days' },
  { value: FrequencyUnits.HOURS, labelKey: 'conditions.standalone.frequency.unit.hours' },
  { value: FrequencyUnits.MINUTES, labelKey: 'conditions.standalone.frequency.unit.minutes' },
  { value: FrequencyUnits.SECONDS, labelKey: 'conditions.standalone.frequency.unit.seconds' },
];

const INITIAL_VALUE: RulesFrequencyValue = {
  frequency: Frequency.ONCE,
  every: { times: 2, duration: 1, unit: FrequencyUnits.DAYES },
  atLeast: { duration: 0, unit: FrequencyUnits.MINUTES },
};

interface Props {
  defaultValue?: RulesFrequencyValue;
  onChange: (value: RulesFrequencyValue) => void;
  showAtLeast?: boolean;
  contentType?: ContentDataType;
  disabled?: boolean;
  t?: ConditionsTranslator;
}

// Composite frequency picker. Layout:
//  [frequency dropdown]
//  [N times, every N days|hours|minutes|seconds]   (only when MULTIPLE/UNLIMITED)
//  [At least N units after any <contentType>]      (only when showAtLeast)
export function ConditionFrequency({
  defaultValue,
  onChange,
  showAtLeast = true,
  contentType = ContentDataType.FLOW,
  disabled,
  t: tProp,
}: Props) {
  const t = resolveTranslator(tProp);
  const initial: RulesFrequencyValue = {
    ...(defaultValue ?? INITIAL_VALUE),
    atLeast: showAtLeast ? (defaultValue ?? INITIAL_VALUE).atLeast : undefined,
  };
  const [data, setData] = useState<RulesFrequencyValue>(initial);

  useEffect(() => {
    if (!defaultValue) onChange(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<RulesFrequencyValue>) => {
    setData((prev) => {
      const next = { ...prev, ...patch };
      onChange(next);
      return next;
    });
  };

  const frequencyOptions = useMemo(
    () => FREQUENCY_KEYS.map((f) => ({ value: f.value, label: t(f.labelKey) })),
    [t],
  );
  const unitOptions = useMemo(
    () => UNIT_KEYS.map((u) => ({ value: u.value, label: t(u.labelKey) })),
    [t],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <ConditionInlineSelect
          value={data.frequency}
          onChange={(v) => update({ frequency: v as Frequency })}
          options={frequencyOptions}
          disabled={disabled}
        />
        <QuestionTooltip>
          {t('conditions.standalone.frequency.unitsTooltip', { contentType })}
        </QuestionTooltip>
      </div>

      {data.frequency === Frequency.MULTIPLE && (
        <FrequencyEvery
          value={data.every}
          onChange={(every) => update({ every })}
          unitOptions={unitOptions}
          frequency={Frequency.MULTIPLE}
          contentType={contentType}
          disabled={disabled}
          t={t}
        />
      )}
      {data.frequency === Frequency.UNLIMITED && (
        <FrequencyEvery
          value={data.every}
          onChange={(every) => update({ every })}
          unitOptions={unitOptions}
          frequency={Frequency.UNLIMITED}
          contentType={contentType}
          disabled={disabled}
          t={t}
        />
      )}

      {showAtLeast && data.atLeast && (
        <FrequencyAtLeast
          value={data.atLeast}
          onChange={(atLeast) => update({ atLeast })}
          unitOptions={unitOptions}
          contentType={contentType}
          disabled={disabled}
          t={t}
        />
      )}
    </div>
  );
}

interface EveryProps {
  value: RulesFrequencyValueEvery;
  onChange: (next: RulesFrequencyValueEvery) => void;
  unitOptions: { value: string; label: string }[];
  frequency: Frequency;
  contentType: ContentDataType;
  disabled?: boolean;
  t: ConditionsTranslator;
}

function FrequencyEvery({
  value,
  onChange,
  unitOptions,
  frequency,
  contentType,
  disabled,
  t,
}: EveryProps) {
  const [openError, setOpenError] = useState(false);
  // Local override for `times` while the user is mid-typing an invalid
  // (< 2) value in MULTIPLE mode. We mirror v1 RulesFrequencyEvery here:
  // show the in-flight number in the input so typing feels natural, but do
  // NOT call onChange — the parent should never see times: 0 / 1 land in
  // its persisted state.
  const [localTimes, setLocalTimes] = useState<number | null>(null);
  const errorZIndex = WebZIndex.RULES + RulesZIndexOffset.ERROR;

  // Drop the local override whenever the controlled value changes from the
  // outside (parent reloaded data, sibling switched modes) so the input
  // re-syncs to props.
  useEffect(() => {
    setLocalTimes(null);
  }, [value.times]);

  const displayTimes = localTimes ?? value.times;

  const update = (patch: Partial<RulesFrequencyValueEvery>) => {
    onChange({ ...value, ...patch });
  };

  const handleTimesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = Number.parseInt(e.target.value) || 0;
    if (frequency === Frequency.MULTIPLE && v < 2) {
      setLocalTimes(v);
      setOpenError(true);
      return;
    }
    setLocalTimes(null);
    setOpenError(false);
    update({ times: v });
  };

  if (frequency === Frequency.MULTIPLE) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <ErrorTooltip open={openError}>
          <ErrorTooltipAnchor asChild>
            <ConditionInput
              type="text"
              value={displayTimes}
              onChange={handleTimesChange}
              disabled={disabled}
              className="w-16"
            />
          </ErrorTooltipAnchor>
          <ErrorTooltipContent zIndex={errorZIndex}>
            {t('conditions.standalone.frequency.atLeastTwo')}
          </ErrorTooltipContent>
        </ErrorTooltip>
        <span className="text-xs">{t('conditions.standalone.frequency.timesComma')}</span>
        <ConditionInput
          type="text"
          value={value.duration}
          onChange={(e) => update({ duration: Number.parseInt(e.target.value) || 0 })}
          disabled={disabled}
          className="w-16"
        />
        <ConditionInlineSelect
          value={value.unit}
          onChange={(v) => update({ unit: v as FrequencyUnits })}
          options={unitOptions}
          disabled={disabled}
        />
        <span className="text-xs">{t('conditions.standalone.frequency.apart')}</span>
        <QuestionTooltip>
          {t('conditions.standalone.frequency.multipleTooltip', {
            contentType,
            times: value.times,
            duration: value.duration,
            unit: value.unit,
          })}
        </QuestionTooltip>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs">{t('conditions.standalone.frequency.every')}</span>
      <ConditionInput
        type="text"
        value={value.duration}
        onChange={(e) => update({ duration: Number.parseInt(e.target.value) || 0 })}
        disabled={disabled}
        className="w-16"
      />
      <ConditionInlineSelect
        value={value.unit}
        onChange={(v) => update({ unit: v as FrequencyUnits })}
        options={unitOptions}
        disabled={disabled}
      />
      <QuestionTooltip>
        {t('conditions.standalone.frequency.unlimitedTooltip', {
          contentType,
          duration: value.duration,
          unit: value.unit,
        })}
      </QuestionTooltip>
    </div>
  );
}

interface AtLeastProps {
  value: RulesFrequencyValueAtLeast;
  onChange: (next: RulesFrequencyValueAtLeast) => void;
  unitOptions: { value: string; label: string }[];
  contentType: ContentDataType;
  disabled?: boolean;
  t: ConditionsTranslator;
}

function FrequencyAtLeast({
  value,
  onChange,
  unitOptions,
  contentType,
  disabled,
  t,
}: AtLeastProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs">{t('conditions.standalone.frequency.atLeast')}</span>
      <ConditionInput
        type="text"
        value={value.duration}
        onChange={(e) => onChange({ ...value, duration: Number.parseInt(e.target.value) || 0 })}
        disabled={disabled}
        className="w-16"
      />
      <ConditionInlineSelect
        value={value.unit}
        onChange={(v) => onChange({ ...value, unit: v as FrequencyUnits })}
        options={unitOptions}
        disabled={disabled}
      />
      <span className="text-xs">
        {t('conditions.standalone.frequency.afterAny', { contentType })}
      </span>
      <QuestionTooltip>
        {t('conditions.standalone.frequency.atLeastTooltip', { contentType })}
      </QuestionTooltip>
    </div>
  );
}
