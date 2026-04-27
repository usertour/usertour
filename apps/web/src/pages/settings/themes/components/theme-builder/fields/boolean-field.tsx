import { useId } from 'react';
import { useBuilderContext } from '../builder-context';
import { BuilderSwitch } from '../ui';
import { FieldRow } from './field-row';

interface Props {
  path: string;
  label: string;
}

export function BooleanField({ path, label }: Props) {
  const id = useId();
  const { getField, setField } = useBuilderContext();
  const value = getField<boolean>(path);
  return (
    <FieldRow label={label} htmlFor={id}>
      <BuilderSwitch id={id} checked={value} onCheckedChange={(next) => setField(path, next)} />
    </FieldRow>
  );
}
