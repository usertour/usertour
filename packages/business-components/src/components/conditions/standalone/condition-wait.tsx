import { QuestionTooltip, Input } from '@usertour/ui';
import { type ChangeEvent, useEffect, useState } from 'react';
import type { ConditionsTranslator } from '../conditions-context';
import {
  ConditionErrorTooltip,
  ConditionErrorTooltipAnchor,
  ConditionErrorTooltipContent,
} from '../ui/condition-error-tooltip';
import { resolveTranslator } from './translator';

interface Props {
  defaultValue: number;
  onValueChange: (value: number) => void;
  maxSeconds?: number;
  disabled?: boolean;
  t?: ConditionsTranslator;
}

// "Wait N seconds before starting" input. Local error state when value
// exceeds maxSeconds — onValueChange only fires on valid input.
export function ConditionWait({
  defaultValue,
  onValueChange,
  maxSeconds = 300,
  disabled,
  t: tProp,
}: Props) {
  const t = resolveTranslator(tProp);
  const [openError, setOpenError] = useState(false);
  const [inputValue, setInputValue] = useState<number>(defaultValue ?? 0);

  // Keep the displayed value in sync with the prop after the initial
  // mount — without this, content/version switches, restores, or any
  // other parent-driven reset would leave the input showing the old
  // content's wait while the parent already moved on. Also drop any
  // stale "value > maxSeconds" tooltip so a reset doesn't carry over an
  // error that belonged to the prior content's input.
  useEffect(() => {
    setInputValue(defaultValue ?? 0);
    setOpenError(false);
  }, [defaultValue]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value) || 0;
    setInputValue(value);
    if (value > maxSeconds) {
      setOpenError(true);
    } else {
      onValueChange(value);
      setOpenError(false);
    }
  };

  return (
    <ConditionErrorTooltip open={openError}>
      <div className="flex items-center gap-2">
        <span className="text-sm">{t('conditions.standalone.wait.before')}</span>
        <ConditionErrorTooltipAnchor asChild>
          <Input
            variant="compact-surface"
            type="text"
            value={inputValue}
            onChange={handleChange}
            disabled={disabled}
            className="w-16"
          />
        </ConditionErrorTooltipAnchor>
        <span className="text-sm text-muted-foreground">
          {t('conditions.standalone.wait.suffix')}
        </span>
        <QuestionTooltip>{t('conditions.standalone.wait.tooltip')}</QuestionTooltip>
        <ConditionErrorTooltipContent className="w-60">
          {t('conditions.standalone.wait.error', {
            max: maxSeconds,
            minutes: Math.floor(maxSeconds / 60),
          })}
        </ConditionErrorTooltipContent>
      </div>
    </ConditionErrorTooltip>
  );
}
