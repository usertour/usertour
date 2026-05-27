import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@usertour/select';

export interface CompactSelectOption {
  value: string;
  label: string;
}

export interface CompactSelectProps {
  value: string | undefined;
  onChange: (value: string) => void;
  options: CompactSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

// All-in-one compact select — a value/onChange/options shape for the common
// "small enum picker in an inspector row" case. Wraps the atomic primitives
// with the compact-muted variants applied; callers needing more
// composition (custom items, groups, separators) should reach for the
// underlying Select / SelectTrigger / SelectContent directly.
export const CompactSelect = (props: CompactSelectProps) => {
  const { value, onChange, options, placeholder = 'Select…', disabled, className, id } = props;
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger id={id} variant="compact-muted" className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-sm">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
