import { useId } from 'react';
import { fieldControlColClass, fieldRowClass, labelClass } from '../ui/tokens';
import { BuilderSwitch } from '../ui';

interface Props {
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  label: string;
}

export function BooleanField({ value, onChange, label }: Props) {
  const id = useId();
  return (
    <div className={fieldRowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={fieldControlColClass}>
        <BuilderSwitch id={id} checked={value} onCheckedChange={onChange} />
      </div>
    </div>
  );
}
