import { RiCheckLine, RiExpandUpDownLine } from '@usertour-packages/icons';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { Separator } from '@usertour-packages/separator';
import { cn } from '@usertour-packages/tailwind';
import { fontItems } from '@/utils/webfonts';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  id?: string;
}

// Names are also the stored values in settings, so they stay as English
// constants. The visible label is translated separately at render time.
const SYSTEM_ITEMS: { id: string; name: string; labelKey: string }[] = [
  { id: 'system-font', name: 'System font', labelKey: 'themeBuilder.fontPicker.systemFont' },
  { id: 'custom-font', name: 'Custom font', labelKey: 'themeBuilder.fontPicker.customFont' },
];

export function BuilderFontPicker({ value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

  // For the trigger label, prefer the translated form when value matches a
  // known system name; otherwise show the raw font-family value as-is.
  const triggerLabel = (() => {
    if (!value) return t('themeBuilder.fontPicker.placeholder');
    const sys = SYSTEM_ITEMS.find((i) => i.name === value);
    return sys ? t(sys.labelKey) : value;
  })();

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className="flex h-7.5 w-full items-center justify-between rounded-lg bg-muted px-3 text-xs text-foreground shadow-sm transition-colors hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span className="truncate">{triggerLabel}</span>
          <RiExpandUpDownLine className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 text-xs [&_*]:text-xs">
        <Command>
          <CommandInput placeholder={t('themeBuilder.fontPicker.searchPlaceholder')} />
          <CommandEmpty>{t('themeBuilder.fontPicker.noItemsFound')}</CommandEmpty>
          <CommandGroup heading={t('themeBuilder.fontPicker.heading')}>
            <ScrollArea className="h-72">
              {SYSTEM_ITEMS.map((item) => (
                <CommandItem key={item.id} onSelect={() => handleSelect(item.name)}>
                  {t(item.labelKey)}
                  <RiCheckLine
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === item.name ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
              <Separator />
              {fontItems.map((item) => (
                <CommandItem key={item.id} onSelect={() => handleSelect(item.name)}>
                  {item.name}
                  <RiCheckLine
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === item.name ? 'opacity-100' : 'opacity-0',
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
}
