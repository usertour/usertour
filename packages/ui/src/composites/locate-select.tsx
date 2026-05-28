import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useState } from 'react';

import { Button } from '../primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '../primitives/command';
import { locates } from '@usertour/constants';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import type { PopoverProps } from '../primitives/popover';
import { ScrollArea } from '../primitives/scroll-area';
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
    <Popover open={open} onOpenChange={setOpen} {...rest}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={triggerPlaceholder}
          aria-expanded={open}
          className="w-full justify-between "
        >
          {selectedItem ? selectedItem.language.name : triggerPlaceholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={'start'} className={cn('p-0', popperContentClass)}>
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandEmpty>{emptyMessage}</CommandEmpty>
          <CommandGroup heading={groupHeading}>
            <ScrollArea className="h-72">
              {locates.map((item) => (
                <CommandItem
                  key={item.locale}
                  onSelect={() => {
                    handleOnSelected(item);
                  }}
                >
                  {item.language.name}({item.country.name})
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedItem?.locale === item.locale ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

LocateSelect.displayName = 'LocateSelect';
