import { ChevronDownIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour-packages/tailwind';
import {
  ConditionDropdownMenu,
  ConditionDropdownMenuContent,
  ConditionDropdownMenuItem,
  ConditionDropdownMenuTrigger,
} from './condition-dropdown-menu';

export interface ConditionInlineSelectOption {
  value: string;
  label: string;
}

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  options: ConditionInlineSelectOption[];
  disabled?: boolean;
  className?: string;
  id?: string;
}

// Link-style picker for inline-sentence rows like "Unlimited times per user",
// "Medium priority", or the count / time / scope tokens inside the event
// editor. Renders as primary-color text + chevron with no border or fill, so
// the control reads as a clickable token in a sentence rather than a form
// field. Mirrors v1's RulesFrequency / RulesPriority / RulesEvent selectors.
//
// Use ConditionSelect (white surface + border) instead when the control sits
// in a vertical form column inside a chip editor — those are real form
// fields and benefit from the stronger affordance.
export function ConditionInlineSelect({
  value,
  onChange,
  options,
  disabled,
  className,
  id,
}: Props) {
  const selected = options.find((o) => o.value === value);
  return (
    <ConditionDropdownMenu>
      <ConditionDropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex items-center gap-1 rounded text-xs font-medium text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-1 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span>{selected?.label ?? ''}</span>
          <ChevronDownIcon className="h-3.5 w-3.5 opacity-70" />
        </button>
      </ConditionDropdownMenuTrigger>
      <ConditionDropdownMenuContent align="start" sideOffset={4}>
        {options.map((opt) => (
          <ConditionDropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className="cursor-pointer"
          >
            {opt.label}
          </ConditionDropdownMenuItem>
        ))}
      </ConditionDropdownMenuContent>
    </ConditionDropdownMenu>
  );
}
