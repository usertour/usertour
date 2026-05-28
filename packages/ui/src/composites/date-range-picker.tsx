'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import type { DatePresetKey, DatePresetOption } from './date-presets';
import { Button } from '../primitives/button';
import { Calendar } from '../primitives/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../primitives/popover';
import { cn } from '@usertour/tailwind';

export interface DateRangePickerProps {
  className?: string;
  dateRange: DateRange | undefined;
  setDateRange: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
  selectedPreset: DatePresetKey | null;
  setSelectedPreset: React.Dispatch<React.SetStateAction<DatePresetKey | null>>;
  // i18n-extracted preset list. Consumer composes labels via t(...) and
  // pairs them with DATE_PRESET_RANGE_GETTERS from ./date-presets.
  presets: DatePresetOption[];
  // Localized fallback shown in the trigger when no range is selected.
  placeholder: string;
}

export const DateRangePicker = (props: DateRangePickerProps) => {
  const {
    className,
    dateRange,
    setDateRange,
    selectedPreset,
    setSelectedPreset,
    presets,
    placeholder,
  } = props;
  const [open, setOpen] = useState(false);

  // When the popover closes with only a `from` selected, commit it as a
  // single-day range. This is a deliberate UX choice — a one-click date pick
  // resolves to that day, not to an indeterminate half-range.
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setDateRange((prev: DateRange | undefined) => {
          if (prev?.from && !prev?.to) {
            return { from: prev.from, to: prev.from };
          }
          return prev;
        });
      }
    },
    [setDateRange],
  );

  const handleSelect = useCallback(
    (newDate: DateRange | undefined) => {
      setDateRange(newDate);
      // Clear preset when user manually selects a date range
      setSelectedPreset(null);
      // Auto-close popover when a complete range is selected
      if (newDate?.from && newDate?.to) {
        setOpen(false);
      }
    },
    [setDateRange, setSelectedPreset],
  );

  const handlePresetClick = useCallback(
    (preset: DatePresetOption) => {
      const range = preset.getRange();
      setDateRange(range);
      setSelectedPreset(preset.key);
      setOpen(false);
    },
    [setDateRange, setSelectedPreset],
  );

  // Get display text for button
  const displayText = useMemo(() => {
    if (selectedPreset) {
      const preset = presets.find((p) => p.key === selectedPreset);
      return preset?.label ?? placeholder;
    }
    if (dateRange?.from) {
      if (dateRange.to) {
        return `${format(dateRange.from, 'LLL dd, y')} - ${format(dateRange.to, 'LLL dd, y')}`;
      }
      return format(dateRange.from, 'LLL dd, y');
    }
    return placeholder;
  }, [selectedPreset, dateRange, presets, placeholder]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !dateRange && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayText}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <div className="flex">
            {/* Preset options */}
            <div className="flex flex-col gap-1 border-r p-2">
              {presets.map((preset) => (
                <Button
                  key={preset.key}
                  variant={selectedPreset === preset.key ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            {/* Calendar */}
            <div className="p-0">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={handleSelect}
                numberOfMonths={1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
