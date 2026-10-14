import { Checkbox, Label, QuestionTooltip } from '@usertour/ui';
import type { ContentDataType } from '@usertour/types';
import { useId } from 'react';
import type { ConditionsTranslator } from '../conditions-context';
import { resolveTranslator } from './translator';

interface Props {
  defaultValue: boolean;
  onCheckedChange: (checked: boolean) => void;
  contentType: ContentDataType;
  disabled?: boolean;
  t?: ConditionsTranslator;
}

// "Only start if not complete" toggle. Controlled.
export function ConditionIfCompleted({
  defaultValue,
  onCheckedChange,
  contentType,
  disabled,
  t: tProp,
}: Props) {
  const t = resolveTranslator(tProp);
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={defaultValue}
        disabled={disabled}
        onCheckedChange={(checked) => onCheckedChange(checked === true)}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm font-normal">
        {t('conditions.standalone.ifCompleted.label')}
      </Label>
      <QuestionTooltip>
        {t('conditions.standalone.ifCompleted.tooltip', { contentType })}
      </QuestionTooltip>
    </div>
  );
}
