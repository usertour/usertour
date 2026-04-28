import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import { cn } from '@usertour-packages/tailwind';
import { useConditionsZIndex } from '../conditions-context';

export interface ConditionSelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  options: ConditionSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function ConditionSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  id,
}: Props) {
  const { popover } = useConditionsZIndex();
  return (
    <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        id={id}
        className={cn('h-7.5 rounded-lg bg-muted text-xs shadow-sm md:text-xs', className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent style={{ zIndex: popover }}>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
