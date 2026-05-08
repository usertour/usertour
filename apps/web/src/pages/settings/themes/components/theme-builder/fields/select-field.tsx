import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { CompactSelect, type CompactSelectOption } from '@usertour-packages/ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  options: CompactSelectOption[];
  vertical?: boolean;
  // When true, the underlying setting is stored as a number; the field
  // converts string ↔ number on read/write. Used for font-weight selects.
  valueAsNumber?: boolean;
  tooltip?: string;
}

export function SelectField({ path, label, options, vertical, valueAsNumber, tooltip }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const raw = valueAsNumber ? getField<number>(path) : getField<string>(path);
  const value = raw == null ? undefined : String(raw);
  const handleChange = (next: string) => {
    setField(path, valueAsNumber ? Number(next) : next);
  };

  return (
    <FieldRow label={label} htmlFor={id} forceVertical={vertical} tooltip={tooltip}>
      <CompactSelect
        id={id}
        value={value}
        disabled={isReadOnly}
        onChange={handleChange}
        options={options}
      />
    </FieldRow>
  );
}
