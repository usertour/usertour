import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Switch } from '@usertour/switch';
import { FieldRow } from './field-row';

export interface BooleanFieldProps {
  path: string;
  label: string;
  tooltip?: string;
}

export function BooleanField(props: BooleanFieldProps) {
  const { path, label, tooltip } = props;
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<boolean>(path);
  return (
    <FieldRow label={label} htmlFor={id} tooltip={tooltip}>
      <Switch
        variant="muted"
        id={id}
        checked={value}
        disabled={isReadOnly}
        onCheckedChange={(next) => setField(path, next)}
      />
    </FieldRow>
  );
}
