import { Slider } from '@usertour-packages/slider';
import { useId } from 'react';
import { useBuilderContext } from '../builder-context';

interface Props {
  path: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function SliderField({ path, label, min, max, step = 1, suffix }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<number>(path);
  const safe = typeof value === 'number' ? value : min;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium">
          {label}
        </label>
        <span className="text-xs text-muted-foreground">
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
