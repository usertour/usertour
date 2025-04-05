'use client';

import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as React from 'react';

import { useThemeDetailContext } from '@/contexts/theme-detail-context';
import { Button } from '@usertour-ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-ui/popover';
import { cn } from '@usertour-ui/ui-utils';

export interface ThemeDetailSelectorType {
  id: string;
  type: string;
  name: string;
}

export const themeDetailSelectorTypes: ThemeDetailSelectorType[] = [
  {
    id: '1',
    name: 'Tooltip',
    type: 'tooltip',
  },
  {
    id: '2',
    name: 'Modal',
    type: 'modal',
  },
  {
    id: '3',
    name: 'Launcher Icon',
    type: 'launcher-icon',
  },
  {
    id: '4',
    name: 'Launcher Beacon',
    type: 'launcher-beacon',
  },
  {
    id: '5',
    name: 'Checklist',
    type: 'checklist',
  },
  {
    id: '6',
    name: 'Checklist Launcher',
    type: 'checklist-launcher',
  },
  {
    id: '7',
    name: 'NPS question',
    type: 'nps',
  },
];

export function ThemePreviewSelector() {
  const [open, setOpen] = React.useState(false);

  const { selectedType, setSelectedType } = useThemeDetailContext();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Select a type..."
          aria-expanded={open}
          className="flex-1 justify-between md:max-w-[200px] lg:max-w-[300px]"
        >
          {selectedType ? selectedType.name : 'Select a type...'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search types..." />
          <CommandEmpty>No types found.</CommandEmpty>
          <CommandGroup>
            {themeDetailSelectorTypes.map((type, index) => (
              <CommandItem
                key={index}
                onSelect={() => {
                  setSelectedType(type);
                  setOpen(false);
                }}
              >
                {type.name}
                <CheckIcon
                  className={cn(
                    'ml-auto h-4 w-4',
                    selectedType?.id === type.id ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

ThemePreviewSelector.displayName = 'ThemePreviewSelector';
