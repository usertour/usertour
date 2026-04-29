import { RulesZIndexOffset, WebZIndex } from '@usertour-packages/constants';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { type ChangeEvent, useState } from 'react';
import type { ConditionsTranslator } from '../conditions-context';
import { ConditionInput } from '../ui/condition-input';
import { resolveTranslator } from './translator';
import { ErrorTooltip, ErrorTooltipAnchor, ErrorTooltipContent } from '../../error-tooltip';

interface Props {
  defaultValue: number;
  onValueChange: (value: number) => void;
  maxSeconds?: number;
  disabled?: boolean;
  baseZIndex?: number;
  t?: ConditionsTranslator;
}

// "Wait N seconds before starting" input. Local error state when value
// exceeds maxSeconds — onValueChange only fires on valid input.
export function ConditionWait({
  defaultValue,
  onValueChange,
  maxSeconds = 300,
  disabled,
  baseZIndex,
  t: tProp,
}: Props) {
  const t = resolveTranslator(tProp);
  const [openError, setOpenError] = useState(false);
  const [inputValue, setInputValue] = useState<number>(defaultValue ?? 0);

  const errorZIndex = (baseZIndex ?? WebZIndex.RULES) + RulesZIndexOffset.ERROR;

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
    <ErrorTooltip open={openError}>
      <div className="flex items-center gap-2">
        <span className="text-xs">{t('conditions.standalone.wait.before')}</span>
        <ErrorTooltipAnchor asChild>
          <ConditionInput
            type="text"
            value={inputValue}
            onChange={handleChange}
            disabled={disabled}
            className="w-16"
          />
        </ErrorTooltipAnchor>
        <span className="text-xs text-muted-foreground">
          {t('conditions.standalone.wait.suffix')}
        </span>
        <QuestionTooltip>{t('conditions.standalone.wait.tooltip')}</QuestionTooltip>
        <ErrorTooltipContent className="w-60" zIndex={errorZIndex}>
          {t('conditions.standalone.wait.error', {
            max: maxSeconds,
            minutes: Math.floor(maxSeconds / 60),
          })}
        </ErrorTooltipContent>
      </div>
    </ErrorTooltip>
  );
}
