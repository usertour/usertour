import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@usertour/ui';
import { RiCheckLine, RiExpandUpDownLine } from '@usertour/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import { CompactPopoverTrigger } from '@usertour/ui';
import { type ReactNode, useState } from 'react';
import { useConditionsZIndex } from '../conditions-context';

export interface ConditionComboboxItem {
  value: string;
  label: string;
  // Optional decoration (e.g., an icon for attribute datatype)
  leading?: ReactNode;
  // Optional secondary line (e.g., attribute description)
  hint?: string;
  // Disable the item without removing it from the list
  disabled?: boolean;
}

interface Props {
  value: string | undefined;
  onChange: (value: string) => void;
  items: ConditionComboboxItem[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  triggerLabel?: string;
  disabled?: boolean;
  className?: string;
  // Optional grouping: renders a heading above each set
  groups?: { heading: string; items: ConditionComboboxItem[] }[];
}

// Searchable picker. Used wherever the user picks from a long list (attributes,
// events, contents, segments). Visually matches the rest of the conditions
// chrome (h-7.5 trigger, text-sm, rounded-lg).
export function ConditionCombobox({
  value,
  onChange,
  items,
  placeholder,
  searchPlaceholder,
  emptyText = '',
  triggerLabel,
  disabled,
  className,
  groups,
}: Props) {
  const [open, setOpen] = useState(false);
  const { popover } = useConditionsZIndex();

  // The label shown on the trigger: explicit override > selected item label > placeholder.
  const selected = items.find((i) => i.value === value);
  const display = triggerLabel ?? selected?.label ?? placeholder ?? '';

  const renderItems = (entries: ConditionComboboxItem[]) =>
    entries.map((item) => (
      <CommandItem
        key={item.value}
        // cmdk filters against this string by substring. Include the hint
        // (e.g., an attribute's codeName) so callers can search by it the
        // way v1 RulesUserAttribute / RulesEvent did with their custom
        // filter — searching "user_email" matches an attribute whose
        // displayName is "Email" but codeName is "user_email_addr".
        value={`${item.value} ${item.label}${item.hint ? ` ${item.hint}` : ''}`}
        disabled={item.disabled}
        onSelect={() => {
          onChange(item.value);
          setOpen(false);
        }}
        className="text-sm"
      >
        {item.leading ? (
          <span className="mr-2 inline-flex items-center">{item.leading}</span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="truncate">{item.label}</div>
          {item.hint && (
            <div className="truncate text-[11px] text-muted-foreground">{item.hint}</div>
          )}
        </div>
        <RiCheckLine
          className={cn('ml-auto h-3.5 w-3.5', value === item.value ? 'opacity-100' : 'opacity-0')}
        />
      </CommandItem>
    ));

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <CompactPopoverTrigger
          disabled={disabled}
          aria-expanded={open}
          className={cn('justify-between', className)}
        >
          <span className="truncate text-left">{display}</span>
          <RiExpandUpDownLine className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </CompactPopoverTrigger>
      </PopoverTrigger>
      <PopoverContent
        // Match the trigger width via the Radix popper variable instead of a
        // fixed 260px — when the trigger lives in a wider editor popover
        // (e.g. event chip's 360px panel) a hard-coded 260px reads as a
        // visible width mismatch with the button right above it.
        className="w-[var(--radix-popper-anchor-width)] rounded-lg p-0 text-sm"
        align="start"
        sideOffset={6}
        style={{ zIndex: popover }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="h-8 text-sm" />
          {/*
           * Use cmdk's CommandList (native overflow-y: auto) rather than
           * Radix ScrollArea here. ScrollArea's viewport relies on h-full
           * percentage height — combined with a max-h-N parent it never gets
           * a definite height to resolve against, so the content stops
           * scrolling once it overflows. CommandList is also where cmdk's
           * keyboard-nav and CommandEmpty visibility expect to live.
           */}
          <CommandList>
            <CommandEmpty className="py-3 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            {groups
              ? groups.map((g) => (
                  <CommandGroup key={g.heading} heading={g.heading}>
                    {renderItems(g.items)}
                  </CommandGroup>
                ))
              : renderItems(items)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
