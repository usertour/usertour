import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { useEffect, useState } from 'react';
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
  PopoverProps,
  PopoverTrigger,
  ScrollArea,
  Separator,
} from '@usertour/ui';
import { cn } from '@usertour/tailwind';

export interface ThemeSelectFontType {
  id: string;
  name: string;
}

interface ThemeSelectFontProps extends PopoverProps {
  items: ThemeSelectFontType[];
  defaultValue: string;
  onSelect?: (item: ThemeSelectFontType) => void;
  disabled?: boolean;
}

const systemItems = [
  { id: 'system-font', name: 'System font' },
  { id: 'custom-font', name: 'Custom font' },
];
export const ThemeSelectFont = ({
  items,
  defaultValue,
  onSelect,
  disabled = false,
  ...props
}: ThemeSelectFontProps) => {
  const { t } = useTranslation();
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
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen} {...props}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={t('themes.fontSelect.loadFontFamily')}
          aria-expanded={open}
          className="flex-1 justify-between disabled:opacity-100"
          disabled={disabled}
        >
          {selectedPreset ? selectedPreset.name : t('themes.fontSelect.loadFontFamily')}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[310px] p-0">
        <Command>
          <CommandInput placeholder={t('themes.fontSelect.searchFontFamily')} />
          <CommandEmpty>{t('themes.fontSelect.noItemsFound')}</CommandEmpty>
          <CommandGroup heading={t('themes.fontSelect.fontFamilyHeading')}>
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
