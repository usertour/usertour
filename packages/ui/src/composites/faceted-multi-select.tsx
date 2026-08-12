'use client';

import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons';
import { cn } from '@usertour/tailwind';
import { Badge } from '../primitives/badge';
import { Button } from '../primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { Separator } from '../primitives/separator';

export interface FacetedMultiSelectOption {
  label: string;
  value: string;
}

export interface FacetedMultiSelectProps {
  /** Trigger label, shown before any selection (and beside the selected badges). */
  label: string;
  options: FacetedMultiSelectOption[];
  /** Selected values. */
  value: string[];
  onChange: (next: string[]) => void;
  /** Shown in the popover when there are no options. */
  emptyText?: string;
  /** Adds a "clear" row at the bottom while something is selected. */
  clearText?: string;
  /** Collapse the selected badges to a count once more than this many are picked. */
  maxBadges?: number;
  className?: string;
  /** Render the popup inline (not portaled to body) — needed inside a Radix Dialog, whose
   * scroll-lock makes a body-portaled popup unclickable. */
  withoutPortal?: boolean;
}

/**
 * Multi-select faceted-filter button (shadcn pattern): a dashed trigger showing the selected
 * options as badges, opening a checkable command list. Single source for "pick several from a
 * short list" — e.g. the environment scope on the API-key dialog and the OAuth consent.
 */
export const FacetedMultiSelect = ({
  label,
  options,
  value,
  onChange,
  emptyText,
  clearText,
  maxBadges = 3,
  className,
  withoutPortal,
}: FacetedMultiSelectProps) => {
  const selected = new Set(value);
  const selectedOptions = options.filter((o) => selected.has(o.value));
  const toggle = (v: string) =>
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('h-8 gap-2 border-dashed font-normal', className)}
        >
          <PlusCircledIcon className="h-4 w-4" />
          {label}
          {selectedOptions.length > 0 && (
            <>
              <Separator orientation="vertical" className="mx-1 h-4" />
              <div className="flex flex-wrap gap-1">
                {selectedOptions.length > maxBadges ? (
                  <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                    {selectedOptions.length}
                  </Badge>
                ) : (
                  selectedOptions.map((o) => (
                    <Badge
                      key={o.value}
                      variant="secondary"
                      className="rounded-sm px-1 font-normal"
                    >
                      {o.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[220px] p-0" withoutPortal={withoutPortal}>
        <Command>
          <CommandList>
            {emptyText && <CommandEmpty>{emptyText}</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggle(option.value)}
                    className="cursor-pointer"
                  >
                    <div
                      className={cn(
                        'mr-2 flex size-4 items-center justify-center rounded-[4px] border border-primary',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <CheckIcon className="size-3.5" />
                    </div>
                    <span className="whitespace-nowrap">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {clearText && value.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => onChange([])}
                    className="cursor-pointer justify-center text-center"
                  >
                    {clearText}
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

FacetedMultiSelect.displayName = 'FacetedMultiSelect';
