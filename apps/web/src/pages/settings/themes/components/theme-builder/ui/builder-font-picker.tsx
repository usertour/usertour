import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
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

interface Props {
  value: string;
  onChange: (name: string) => void;
  disabled?: boolean;
  id?: string;
}

const SYSTEM_ITEMS: { id: string; name: string }[] = [
  { id: 'system-font', name: 'System font' },
  { id: 'custom-font', name: 'Custom font' },
];

export function BuilderFontPicker({ value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
  };

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
          <span className="truncate">{value || 'Load a font family…'}</span>
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 text-xs [&_*]:text-xs">
        <Command>
          <CommandInput placeholder="Search font family…" />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup heading="Font family">
            <ScrollArea className="h-72">
              {SYSTEM_ITEMS.map((item) => (
                <CommandItem key={item.id} onSelect={() => handleSelect(item.name)}>
                  {item.name}
                  <CheckIcon
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
                  <CheckIcon
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
