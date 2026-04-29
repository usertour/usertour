import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour-packages/tailwind';
import {
  ConditionDropdownMenu,
  ConditionDropdownMenuContent,
  ConditionDropdownMenuItem,
  ConditionDropdownMenuTrigger,
} from './condition-dropdown-menu';

// Built on Radix DropdownMenu rather than Radix Select on purpose: when this
// trigger sits inside a chip-editor Popover, Radix Select's dismiss layer
// runs independent of the parent Popover's layer chain, so picking an option
// (or clicking elsewhere in the popover while the listbox is open) collapses
// the parent popover too. DropdownMenu shares Radix's DismissableLayer
// context with Popover and registers as a child layer, so closing the menu
// is correctly scoped to itself. v1 RulesEvent's scope picker took the same
// approach for the same reason.

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
  const selected = options.find((o) => o.value === value);
  return (
    <ConditionDropdownMenu>
      <ConditionDropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          disabled={disabled}
          className={cn(
            'inline-flex h-7.5 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-xs shadow-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected?.label ?? placeholder}
          </span>
          <CaretSortIcon className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </ConditionDropdownMenuTrigger>
      <ConditionDropdownMenuContent
        align="start"
        sideOffset={4}
        // Anchor the menu to at least the trigger's width via Radix Popper's
        // generic anchor-width variable. (`--radix-dropdown-menu-trigger-width`
        // looks plausible but isn't a real variable — only Radix Select
        // exposes a `*-trigger-width` token; popper-based primitives use
        // `--radix-popper-anchor-width` instead.)
        className="min-w-[var(--radix-popper-anchor-width)]"
      >
        {options.map((opt) => (
          <ConditionDropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className="cursor-pointer pr-8"
          >
            <span className="flex-1 truncate">{opt.label}</span>
            {value === opt.value && <CheckIcon className="ml-auto h-3.5 w-3.5" />}
          </ConditionDropdownMenuItem>
        ))}
      </ConditionDropdownMenuContent>
    </ConditionDropdownMenu>
  );
}
