import { Slider } from '@usertour-packages/slider';
import { useId } from 'react';
import { labelClass } from '../ui/tokens';

interface Props {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}

export function SliderField({ value, onChange, label, min, max, step = 1, suffix }: Props) {
  const id = useId();
  const safe = typeof value === 'number' ? value : min;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className={labelClass}>
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
        onValueChange={([next]) => onChange(next)}
      />
    </div>
  );
}
