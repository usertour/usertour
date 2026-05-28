import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Input } from '@usertour/ui';
import { FieldRow } from './field-row';

export interface TextFieldProps {
  path: string;
  label: string;
  placeholder?: string;
  tooltip?: string;
}

export const TextField = (props: TextFieldProps) => {
  const { path, label, placeholder, tooltip } = props;
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
};
