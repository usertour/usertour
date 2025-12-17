import { CaretSortIcon, CheckIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@usertour-packages/command';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour/helpers';
import type { CSSProperties } from 'react';
import { useCallback, useState } from 'react';

export interface ComboBoxOption {
  value: string;
  name: string;
  display?: string;
}

export interface ComboBoxProps {
  options: ComboBoxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
}

export const ComboBox = ({
  options,
  value,
  onValueChange,
  placeholder = 'Select option',
  emptyText = 'No items found.',
  className,
  contentClassName,
  contentStyle,
}: ComboBoxProps) => {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = useCallback(
    (option: ComboBoxOption) => {
      onValueChange(option.value);
      setOpen(false);
    },
    [onValueChange],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn('flex-1 justify-between', className)}>
          {selectedOption?.display || selectedOption?.name || placeholder}
          <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn('w-[350px] p-0', contentClassName)} style={contentStyle}>
        <Command>
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  className="cursor-pointer"
                  onSelect={() => {
                    handleSelect(option);
                  }}
                >
                  {option.display || option.name}
                  <CheckIcon
                    className={cn(
                      'ml-auto h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

ComboBox.displayName = 'ComboBox';
