import { QuestionTooltip } from '@usertour/ui';
import { ContentPriority } from '@usertour/types';
import { useMemo } from 'react';
import type { ConditionsTranslator } from '../conditions-context';
import { ConditionInlineSelect } from '../ui/condition-inline-select';
import { resolveTranslator } from './translator';

interface Props {
  defaultValue?: ContentPriority;
  onChange: (value: ContentPriority) => void;
  disabled?: boolean;
  t?: ConditionsTranslator;
}

const PRIORITY_KEYS = [
  { value: ContentPriority.HIGHEST, labelKey: 'conditions.standalone.priority.highest' },
  { value: ContentPriority.HIGH, labelKey: 'conditions.standalone.priority.high' },
  { value: ContentPriority.MEDIUM, labelKey: 'conditions.standalone.priority.medium' },
  { value: ContentPriority.LOW, labelKey: 'conditions.standalone.priority.low' },
  { value: ContentPriority.LOWEST, labelKey: 'conditions.standalone.priority.lowest' },
];

// Priority picker. Standalone — used in flow / checklist settings outside
// the conditions tree. State is controlled by the caller.
export function ConditionPriority({
  defaultValue = ContentPriority.MEDIUM,
  onChange,
  disabled,
  t: tProp,
}: Props) {
  const t = resolveTranslator(tProp);
  const options = useMemo(
    () => PRIORITY_KEYS.map((p) => ({ value: p.value, label: t(p.labelKey) })),
    [t],
  );

  return (
    <div className="flex items-center gap-2">
      <ConditionInlineSelect
        value={defaultValue}
        onChange={(v) => onChange(v as ContentPriority)}
        options={options}
        disabled={disabled}
      />
      <QuestionTooltip>{t('conditions.standalone.priority.tooltip')}</QuestionTooltip>
    </div>
  );
}
