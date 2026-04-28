import type { ThemeTypesSetting } from '@usertour/types';
import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderInput } from '../ui';
import { FieldRow } from './field-row';

interface Props {
  getLabel: (settings: ThemeTypesSetting) => string;
  getPath: (settings: ThemeTypesSetting) => string;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

export function DynamicNumberField({ getLabel, getPath, min, max, step = 1, suffix }: Props) {
  const id = useId();
  const { activeSettings, getField, setField, isReadOnly } = useBuilderContext();
  const path = getPath(activeSettings);
  const label = getLabel(activeSettings);
  const value = getField<number>(path);

  return (
    <FieldRow label={label} htmlFor={id}>
      <BuilderInput
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
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-muted-foreground">
          {suffix}
        </span>
      )}
    </FieldRow>
  );
}
