import { ConditionSelect } from '../ui/condition-select';

export interface OperatorOption {
  value: string;
  // Already-translated label.
  label: string;
}

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  options: OperatorOption[];
  placeholder?: string;
  className?: string;
}

// Inline operator/logic picker (e.g., "is" / "is not" / "contains"). Wraps
// ConditionSelect with the consistent options shape used across the type
// editors.
export function OperatorSelect({ value, onChange, options, placeholder, className }: Props) {
  return (
    <ConditionSelect
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      className={className}
    />
  );
}
