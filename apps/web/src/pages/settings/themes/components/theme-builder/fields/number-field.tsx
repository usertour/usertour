import { cn } from '@usertour-packages/tailwind';
import { useId } from 'react';
import { fieldControlColClass, fieldRowClass, labelClass } from '../ui/tokens';
import { BuilderInput } from '../ui';

interface Props {
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function NumberField({ value, onChange, label, min, max, step = 1, suffix }: Props) {
  const id = useId();
  return (
    <div className={fieldRowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={cn(fieldControlColClass, 'relative')}>
        <BuilderInput
          id={id}
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          onChange={(e) => {
            const next = Number.parseFloat(e.target.value);
            if (!Number.isNaN(next)) onChange(next);
          }}
          className={suffix ? 'pr-8' : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
