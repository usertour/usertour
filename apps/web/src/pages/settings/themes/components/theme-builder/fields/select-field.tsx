import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderSelect, type BuilderSelectOption } from '../ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  options: BuilderSelectOption[];
  vertical?: boolean;
  // When true, the underlying setting is stored as a number; the field
  // converts string ↔ number on read/write. Used for font-weight selects.
  valueAsNumber?: boolean;
}

export function SelectField({ path, label, options, vertical, valueAsNumber }: Props) {
  const id = useId();
  const { getField, setField } = useBuilderContext();
  const raw = valueAsNumber ? getField<number>(path) : getField<string>(path);
  const value = raw == null ? undefined : String(raw);
  const handleChange = (next: string) => {
    setField(path, valueAsNumber ? Number(next) : next);
  };

  return (
    <FieldRow label={label} htmlFor={id} forceVertical={vertical}>
      <BuilderSelect id={id} value={value} onChange={handleChange} options={options} />
    </FieldRow>
  );
}
