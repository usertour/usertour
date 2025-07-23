import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { PopoverProps } from '@radix-ui/react-popover';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { useState } from 'react';

import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { locates } from '@usertour-packages/constants';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/utils';

export type LocateItem = (typeof locates)[0];

interface LocateSelectProps extends PopoverProps {
  defaultValue?: string;
  onSelect?: (item: LocateItem) => void;
  popperContentClass?: string;
}

export const LocateSelect = ({
  defaultValue,
  onSelect,
  popperContentClass,
  ...props
}: LocateSelectProps) => {
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
    <PopoverPrimitive.Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverPrimitive.Trigger asChild>
        <Button
          variant="outline"
          aria-label="Load a locate..."
          aria-expanded={open}
          className="w-full justify-between "
        >
          {selectedItem ? selectedItem.language.name : 'Load a locate...'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align={'start'}
        className={cn(
          'z-50 p-0 rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
          popperContentClass,
        )}
      >
        <Command>
          <CommandInput placeholder="Search locate..." />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup heading="Locate">
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
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Popover>
  );
};

LocateSelect.displayName = 'LocateSelect';
