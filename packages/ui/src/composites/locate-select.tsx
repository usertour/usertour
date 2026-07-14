import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

import { Button } from '../primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../primitives/command';
import { locates } from '@usertour/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import type { PopoverProps } from '../primitives/popover';
import { cn } from '@usertour/tailwind';

export type LocateItem = (typeof locates)[0];

export interface LocateSelectProps extends PopoverProps {
  defaultValue?: string;
  onSelect?: (item: LocateItem) => void;
  popperContentClass?: string;
  // i18n-extracted labels. All required — per
  // feedback_no_i18n_in_shared_ui_primitives this primitive does not carry
  // English literal defaults.
  triggerPlaceholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
  groupHeading?: string;
}

export const LocateSelect = (props: LocateSelectProps) => {
  const {
    defaultValue,
    onSelect,
    popperContentClass,
    triggerPlaceholder,
    searchPlaceholder,
    emptyMessage,
    groupHeading,
    ...rest
  } = props;
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LocateItem | undefined>(
    locates.find((item) => item.locale === defaultValue),
  );

  const handleOnSelected = (item: LocateItem) => {
    setSelectedItem(item);
    setOpen(false);
    if (onSelect) {
      onSelect(item);
    }
  };

  return (
    // modal: the picker lives inside modal dialogs, whose scroll lock
    // swallows wheel events on portaled popover content — a modal popover
    // takes the lock over and lets its own list scroll.
    <Popover open={open} onOpenChange={setOpen} modal {...rest}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={triggerPlaceholder}
          aria-expanded={open}
          className="w-full justify-between "
        >
          {selectedItem ? selectedItem.name : triggerPlaceholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={'start'} className={cn('p-0', popperContentClass)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          {/* CommandList owns scrolling and cmdk's keyboard navigation — a
              nested ScrollArea here breaks wheel scrolling inside the popover. */}
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup heading={groupHeading}>
              {locates.map((item) => (
                <CommandItem
                  key={item.locale}
                  value={`${item.name} ${item.locale}`}
                  onSelect={() => {
                    handleOnSelected(item);
                  }}
                >
                  {item.name}
                  <span className="ml-2 text-muted-foreground">{item.locale}</span>
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedItem?.locale === item.locale ? 'opacity-100' : 'opacity-0',
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

LocateSelect.displayName = 'LocateSelect';
