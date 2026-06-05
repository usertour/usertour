import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { Button } from '../primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { cn } from '@usertour/tailwind';
import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';

export interface SelectPopoverOption {
  value: string;
  name: string;
  display?: string;
}

export interface SelectPopoverProps {
  options: SelectPopoverOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  disabled?: boolean;
  /**
   * Render the popover content inline (no portal). Required when this
   * lives inside a Radix Dialog — react-remove-scroll locks wheel
   * events on body while a Dialog is open, and a body-portaled
   * Popover gets caught in the lock (keyboard navigation still
   * works, mouse wheel is dead silent). Defaults to portaled because
   * most consumers render in non-Dialog contexts where the higher
   * stacking context of a portal is desired.
   */
  withoutPortal?: boolean;
}

export const SelectPopover = (props: SelectPopoverProps) => {
  const {
    options,
    value,
    onValueChange,
    placeholder = 'Select option',
    emptyText = 'No items found.',
    className,
    contentClassName,
    contentStyle,
    disabled = false,
    withoutPortal = false,
  } = props;
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (option: SelectPopoverOption) => {
      onValueChange(option.value);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'h-7.5 flex-1 justify-between rounded-lg px-3 text-sm font-normal',
            className,
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedOption?.display || selectedOption?.name || placeholder}
          </span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('w-[var(--radix-popover-trigger-width)] p-0', contentClassName)}
        style={contentStyle}
        withoutPortal={withoutPortal}
      >
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  // cmdk's built-in filter does substring match against the
                  // `value` string only — it never looks at the rendered
                  // children. Passing the raw `option.value` (typically an
                  // opaque id / UUID at call sites like events) means
                  // typing the display name finds nothing. Pack the
                  // matchable strings into `value` so search hits any of
                  // id / name / display. The display string still drives
                  // what the user sees below.
                  value={
                    option.display
                      ? `${option.value} ${option.name} ${option.display}`
                      : `${option.value} ${option.name}`
                  }
                  className="cursor-pointer"
                  onSelect={() => {
                    handleSelect(option);
                  }}
                >
                  {option.display || option.name}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

SelectPopover.displayName = 'SelectPopover';
