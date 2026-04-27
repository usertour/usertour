import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderInput } from '../ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  placeholder?: string;
}

export function TextField({ path, label, placeholder }: Props) {
  const id = useId();
  const { getField, setField } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <FieldRow label={label} htmlFor={id}>
      <BuilderInput
        id={id}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setField(path, e.target.value)}
      />
    </FieldRow>
  );
}
