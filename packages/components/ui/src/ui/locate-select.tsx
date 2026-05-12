import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
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
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import type { PopoverProps } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/tailwind';

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
    <Popover open={open} onOpenChange={setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Load a locate..."
          aria-expanded={open}
          className="w-full justify-between "
        >
          {selectedItem ? selectedItem.language.name : 'Load a locate...'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={'start'} className={cn('p-0', popperContentClass)}>
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
      </PopoverContent>
    </Popover>
  );
};

LocateSelect.displayName = 'LocateSelect';
