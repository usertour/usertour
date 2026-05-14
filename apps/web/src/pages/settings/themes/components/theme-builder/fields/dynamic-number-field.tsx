import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Input } from '@usertour/input';
import { FieldRow } from './field-row';

interface Props {
  // Both `label` and `path` are pre-resolved by FieldRenderer (which knows the
  // active settings + i18n function). The leaf component just renders.
  label: string;
  path: string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}

export function DynamicNumberField({ label, path, min, max, step = 1, suffix, tooltip }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<number>(path);

  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip}>
      <Input
        variant="compact-muted"
        id={id}
        type="number"
        value={value ?? ''}
        min={min}
        max={max}
        step={step}
        disabled={isReadOnly}
        onChange={(e) => {
          const next = Number.parseFloat(e.target.value);
          if (!Number.isNaN(next)) setField(path, next);
        }}
        className={suffix ? 'pr-8' : undefined}
      />
      {suffix && (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-muted-foreground">
          {suffix}
        </span>
      )}
    </FieldRow>
  );
}
