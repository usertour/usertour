import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';

import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { Popover, PopoverContent, PopoverProps, PopoverTrigger } from '@usertour-ui/popover';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { Separator } from '@usertour-ui/separator';
import { cn } from '@usertour-ui/ui-utils';

export interface ThemeSelectFontType {
  id: string;
  name: string;
}

interface ThemeSelectFontProps extends PopoverProps {
  items: ThemeSelectFontType[];
  defaultValue: string;
  onSelect?: (item: ThemeSelectFontType) => void;
}

const systemItems = [
  { id: 'system-font', name: 'System font' },
  { id: 'custom-font', name: 'Custom font' },
];
export const ThemeSelectFont = ({
  items,
  defaultValue,
  onSelect,
  ...props
}: ThemeSelectFontProps) => {
  const [open, setOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<ThemeSelectFontType>();

  useEffect(() => {
    if (items && items.length > 0) {
      let item = items.find((item) => item.name === defaultValue);
      if (!item) {
        item = systemItems.find((item) => item.name === defaultValue);
      }
      if (item) {
        setSelectedPreset(item);
      }
    }
  }, []);

  const handleOnSelected = (item: ThemeSelectFontType) => {
    setSelectedPreset(item);
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
          aria-label="Load a font family..."
          aria-expanded={open}
          className="flex-1 justify-between"
        >
          {selectedPreset ? selectedPreset.name : 'Load a font family...'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[310px] p-0">
        <Command>
          <CommandInput placeholder="Search font family..." />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup heading="Font family">
            <ScrollArea className="h-72">
              {systemItems.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    handleOnSelected(item);
                  }}
                >
                  {item.name}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
              <Separator />
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => {
                    handleOnSelected(item);
                  }}
                >
                  {item.name}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      selectedPreset?.id === item.id ? 'opacity-100' : 'opacity-0',
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

ThemeSelectFont.displayName = 'ThemeSelectFont';
