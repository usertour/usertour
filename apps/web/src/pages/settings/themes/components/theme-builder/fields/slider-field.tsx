import { Slider } from '@usertour-packages/slider';
import { QuestionTooltip } from '@usertour-packages/tooltip';
import { useId } from 'react';
import { useBuilderContext } from '../builder-context';

interface Props {
  path: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}

export function SliderField({ path, label, min, max, step = 1, suffix, tooltip }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<number>(path);
  const safe = typeof value === 'number' ? value : min;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
        </span>
        <span className="text-sm text-muted-foreground">
          {safe}
          {suffix}
        </span>
      </div>
      <Slider
        id={id}
        value={[safe]}
        min={min}
        max={max}
        step={step}
        disabled={isReadOnly}
        onValueChange={([next]) => setField(path, next)}
      />
    </div>
  );
}
