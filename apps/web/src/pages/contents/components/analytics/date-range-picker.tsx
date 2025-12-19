'use client';

import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { useCallback, useState } from 'react';
import type { DateRange } from 'react-day-picker';

import { useAnalyticsContext } from '@/contexts/analytics-context';
import { Button } from '@usertour-packages/button';
import { Calendar } from '@usertour-packages/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour/helpers';

export function CalendarDateRangePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const { dateRange: date, setDateRange: setDate } = useAnalyticsContext();
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
      // Auto-close popover when a complete range is selected
      if (newDate?.from && newDate?.to) {
        setOpen(false);
      }
    },
    [setDate],
  );

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
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
