import { useId, useState } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderInput } from '../ui';
import { FieldRow } from './field-row';

interface Props {
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
}

export function NumberField({
  path,
  label,
  min,
  max,
  step = 1,
  suffix,
  optional,
  placeholder,
  validate,
}: Props) {
  const id = useId();
  const { getField, setField } = useBuilderContext();
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
    <FieldRow label={label} htmlFor={id}>
      <BuilderInput
        id={id}
        type="number"
        value={stored ?? ''}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        onChange={(e) => handleChange(e.target.value)}
        className={suffix ? 'pr-8' : undefined}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </FieldRow>
  );
}
