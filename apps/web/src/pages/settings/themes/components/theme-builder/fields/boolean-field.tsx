import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { Switch } from '@usertour-packages/switch';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
}

export function BooleanField({ path, label }: Props) {
  const id = useId();
  const { getField, setField, isReadOnly } = useBuilderContext();
  const value = getField<boolean>(path);
  return (
    <FieldRow label={label} htmlFor={id}>
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
