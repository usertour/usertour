import { useId } from 'react';
import { fieldControlColClass, fieldRowClass, labelClass } from '../ui/tokens';
import { BuilderInput } from '../ui';

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function TextField({ value, onChange, label, placeholder }: Props) {
  const id = useId();
  return (
    <div className={fieldRowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={fieldControlColClass}>
        <BuilderInput
          id={id}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </div>
  );
}
