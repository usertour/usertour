import { useId, useState } from 'react';
import { useBuilderContext } from '../builder-context';
import { Input } from '@usertour/input';
import { FieldRow } from './field-row';

export interface NumberFieldProps {
  path: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  // When true, an empty input clears the field (writes `undefined`). Used for
  // optional fields like z-index / launcher button width.
  optional?: boolean;
  placeholder?: string;
  validate?: (value: number) => string | undefined;
  tooltip?: string;
}

export const NumberField = (props: NumberFieldProps) => {
  const {
    path,
    label,
    min,
    max,
    step = 1,
    suffix,
    optional,
    placeholder,
    validate,
    tooltip,
  } = props;
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const stored = getField<number>(path);
  const [error, setError] = useState<string | undefined>();

  const handleChange = (raw: string) => {
    if (raw === '') {
      if (optional) {
        setField(path, undefined);
        setError(undefined);
      }
      return;
    }
    const next = Number.parseFloat(raw);
    if (Number.isNaN(next)) return;
    setError(validate?.(next));
    setField(path, next);
  };

  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip}>
      <Input
        variant="compact-muted"
        id={id}
        type="number"
        value={stored ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        disabled={isReadOnly}
        onChange={(e) => handleChange(e.target.value)}
        className={suffix ? 'pr-8' : undefined}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}
    </FieldRow>
  );
};
