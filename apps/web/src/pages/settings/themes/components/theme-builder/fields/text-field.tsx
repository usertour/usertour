import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { CompactInput } from '@usertour-packages/ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  placeholder?: string;
}

export function TextField({ path, label, placeholder }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <FieldRow label={label} htmlFor={id}>
      <CompactInput
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={isReadOnly}
        onChange={(e) => setField(path, e.target.value)}
      />
    </FieldRow>
  );
}
