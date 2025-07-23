import { useState } from 'react';
import { Button } from '@usertour-packages/button';
import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { PlusIcon } from '@usertour-packages/icons';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@usertour-packages/command';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { cn } from '@usertour-packages/ui-utils';

interface ObjectMappingFieldSelectProps {
  items: Array<{ value: string; label: string; icon?: React.ReactNode }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  className?: string;
  showCreateAttribute?: boolean;
  onCreateAttribute?: () => void;
  disabled?: boolean;
}

interface ObjectMappingObjectSelectProps {
  items: Array<{ name: string; label: string; type?: string }>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  className?: string;
}

export function ObjectMappingFieldSelect({
  items,
  value,
  onValueChange,
  placeholder,
  className,
  showCreateAttribute = false,
  onCreateAttribute,
  disabled = false,
}: ObjectMappingFieldSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.value === value);

  const handleSelect = (selectedValue: string) => {
    if (disabled) return;
    onValueChange(selectedValue);
    setOpen(false);
  };

  const handleCreateAttribute = () => {
    if (disabled) return;
    onCreateAttribute?.();
    setOpen(false);
  };

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn('w-72 justify-between', className, disabled && 'disabled:opacity-70')}
          disabled={disabled}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              {selectedItem.icon}
              <span>{selectedItem.label}</span>
            </div>
          ) : (
            placeholder
          )}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" withoutPortal>
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-64">
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.value}
                  onSelect={() => handleSelect(item.value)}
                >
                  <div className="flex items-center gap-2">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === item.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
              {showCreateAttribute && (
                <CommandItem onSelect={handleCreateAttribute}>
                  <div className="flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" />
                    <span>Create new attribute</span>
                  </div>
                </CommandItem>
              )}
            </ScrollArea>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function ObjectMappingObjectSelect({
  items,
  value,
  onValueChange,
  placeholder,
  className,
}: ObjectMappingObjectSelectProps) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.name === value);

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn('w-72 justify-between', className)}
        >
          {selectedItem ? (
            <div className="flex items-center gap-2">
              <span>{selectedItem.label}</span>
              {selectedItem.type && (
                <div className="text-xs text-muted-foreground">{selectedItem.type}</div>
              )}
            </div>
          ) : (
            placeholder
          )}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0 z-50" withoutPortal>
        <Command>
          <CommandInput placeholder={`Search ${placeholder.toLowerCase()}...`} />
          <CommandEmpty>No items found.</CommandEmpty>
          <CommandGroup>
            <ScrollArea className="h-64">
              {items.map((item) => (
                <CommandItem
                  key={item.name}
                  value={item.name}
                  onSelect={() => handleSelect(item.name)}
                >
                  <div className="flex items-center gap-2">
                    <span>{item.label}</span>
                    {item.type && <div className="text-xs text-muted-foreground">{item.type}</div>}
                  </div>
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
