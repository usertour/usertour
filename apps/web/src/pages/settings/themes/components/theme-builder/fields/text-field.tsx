import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Input } from '@usertour/input';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
  placeholder?: string;
  tooltip?: string;
}

export function TextField({ path, label, placeholder, tooltip }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<string>(path) ?? '';
  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip}>
      <Input
        variant="compact-muted"
        id={id}
        value={value}
        placeholder={placeholder}
        disabled={isReadOnly}
        onChange={(e) => setField(path, e.target.value)}
      />
    </FieldRow>
  );
}
