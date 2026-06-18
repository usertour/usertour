'use client';

import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import {
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import { ThemeDetailSelectorType } from '@usertour/types';
import { themeDetailSelectorTypes } from '@/utils/theme';

interface ThemePreviewSelectorProps {
  selectedType?: ThemeDetailSelectorType;
  onTypeChange?: (type: ThemeDetailSelectorType) => void;
}

export const ThemePreviewSelector = ({ selectedType, onTypeChange }: ThemePreviewSelectorProps) => {
  const [open, setOpen] = React.useState(false);
  const { t } = useTranslation();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={t('themeBuilder.preview.selectTypePlaceholder')}
          aria-expanded={open}
          className="flex-1 justify-between md:max-w-48 lg:max-w-60"
        >
          {selectedType ? selectedType.name : t('themeBuilder.preview.selectTypePlaceholder')}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-0">
        <Command>
          <CommandInput placeholder={t('themeBuilder.preview.searchTypesPlaceholder')} />
          <CommandEmpty>{t('themeBuilder.preview.noTypesFound')}</CommandEmpty>
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
};

ThemePreviewSelector.displayName = 'ThemePreviewSelector';
