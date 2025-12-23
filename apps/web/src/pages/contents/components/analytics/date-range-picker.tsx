'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { useCallback, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { useAnalyticsContext } from '@/contexts/analytics-context';
import { DATE_PRESET_OPTIONS, type DatePresetOption } from '@/utils/date-presets';
import { Button } from '@usertour-packages/button';
import { Calendar } from '@usertour-packages/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour/helpers';

export function CalendarDateRangePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const {
    dateRange: date,
    setDateRange: setDate,
    selectedPreset,
    setSelectedPreset,
  } = useAnalyticsContext();
  const [open, setOpen] = useState(false);

  // Handle popover close: auto-complete date range if only 'from' is selected
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        // When closing, if only 'from' is selected, set 'to' to the same day
        setDate((prev) => {
          if (prev?.from && !prev?.to) {
            return { from: prev.from, to: prev.from };
          }
          return prev;
        });
      }
    },
    [setDate],
  );

  const handleSelect = useCallback(
    (newDate: DateRange | undefined) => {
      setDate(newDate);
      // Clear preset when user manually selects a date range
      setSelectedPreset(null);
      // Auto-close popover when a complete range is selected
      if (newDate?.from && newDate?.to) {
        setOpen(false);
      }
    },
    [setDate, setSelectedPreset],
  );

  const handlePresetClick = useCallback(
    (preset: DatePresetOption) => {
      const range = preset.getRange();
      setDate(range);
      setSelectedPreset(preset.key);
      setOpen(false);
    },
    [setDate, setSelectedPreset],
  );

  // Get display text for button
  const displayText = useMemo(() => {
    if (selectedPreset) {
      const preset = DATE_PRESET_OPTIONS.find((p) => p.key === selectedPreset);
      return preset?.label ?? 'Pick a date';
    }
    if (date?.from) {
      if (date.to) {
        return `${format(date.from, 'LLL dd, y')} - ${format(date.to, 'LLL dd, y')}`;
      }
      return format(date.from, 'LLL dd, y');
    }
    return 'Pick a date';
  }, [selectedPreset, date]);

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-[260px] justify-start text-left font-normal',
              !date && 'text-muted-foreground',
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
              {DATE_PRESET_OPTIONS.map((preset) => (
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
                defaultMonth={date?.from}
                selected={date}
                onSelect={handleSelect}
                numberOfMonths={2}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
