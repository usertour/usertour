'use client';

import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as React from 'react';

import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { ThemeDetailSelectorType } from '@usertour/types';
import { themeDetailSelectorTypes } from '@/utils/theme';

interface ThemePreviewSelectorProps {
  selectedType?: ThemeDetailSelectorType;
  onTypeChange?: (type: ThemeDetailSelectorType) => void;
}

export function ThemePreviewSelector({ selectedType, onTypeChange }: ThemePreviewSelectorProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label="Select a type..."
          aria-expanded={open}
          className="flex-1 justify-between md:max-w-48 lg:max-w-60"
        >
          {selectedType ? selectedType.name : 'Select a type...'}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput placeholder="Search types..." />
          <CommandEmpty>No types found.</CommandEmpty>
          <CommandGroup>
            {themeDetailSelectorTypes.map((type, index) => (
              <CommandItem
                key={index}
                className="cursor-pointer"
                onSelect={() => {
                  onTypeChange?.(type);
                  setOpen(false);
                }}
              >
                {type.name}
                <CheckIcon
                  className={cn(
                    'ml-auto h-4 w-4',
                    selectedType?.type === type.type ? 'opacity-100' : 'opacity-0',
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
