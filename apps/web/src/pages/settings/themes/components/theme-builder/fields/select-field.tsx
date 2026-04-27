import { useId } from 'react';
import { fieldControlColClass, fieldRowClass, labelClass } from '../ui/tokens';
import { BuilderSelect, type BuilderSelectOption } from '../ui';

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
  options: BuilderSelectOption[];
}

export function SelectField({ value, onChange, label, options }: Props) {
  const id = useId();
  return (
    <div className={fieldRowClass}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className={fieldControlColClass}>
        <BuilderSelect id={id} value={value} onChange={onChange} options={options} />
      </div>
    </div>
  );
}
