import { useId, useState } from 'react';
import { Input } from '../../primitives/input';
import { Label } from '../../primitives/label';
import { QuestionTooltip } from '../../primitives/tooltip';

export interface NumberFieldProps {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  // When true, an empty input clears the field (emits `undefined`). Used for
  // optional fields like z-index / button width.
  optional?: boolean;
  placeholder?: string;
  validate?: (value: number) => string | undefined;
  tooltip?: string;
  disabled?: boolean;
}

// A number row: label (+ optional `?` tooltip) above a compact numeric input
// with an optional unit suffix and inline validation error. Controlled
// (value/onChange) and i18n-agnostic — the caller passes an already-translated
// label/tooltip. Mirrors SelectField's label-above-control shape.
export const NumberField = (props: NumberFieldProps) => {
  const {
    label,
    value,
    onChange,
    min,
    max,
    step = 1,
    suffix,
    optional,
    placeholder,
    validate,
    tooltip,
    disabled,
  } = props;
  const id = useId();
  const [error, setError] = useState<string | undefined>();

  const handleChange = (raw: string) => {
    if (raw === '') {
      if (optional) {
        onChange(undefined);
        setError(undefined);
      }
      return;
    }
    const next = Number.parseFloat(raw);
    if (Number.isNaN(next)) {
      return;
    }
    setError(validate?.(next));
    onChange(next);
  };

  return (
    <div className="flex flex-col space-y-2">
      <div className="flex items-center space-x-1">
        <Label htmlFor={id}>{label}</Label>
        {tooltip && <QuestionTooltip>{tooltip}</QuestionTooltip>}
      </div>
      <div className="relative">
        <Input
          variant="compact-surface"
          id={id}
          type="number"
          value={value ?? ''}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => handleChange(event.target.value)}
          className={suffix ? 'pr-8' : undefined}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </div>
  );
};
NumberField.displayName = 'NumberField';
