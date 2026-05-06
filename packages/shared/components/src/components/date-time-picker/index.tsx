import { CalendarIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { Calendar } from '@usertour-packages/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { format } from 'date-fns';
import { useState } from 'react';
import { TimeColumn } from './time-column';

type DateTimePickerMode = 'date' | 'datetime';

interface Props {
  value: Date | undefined;
  onChange: (next: Date | undefined) => void;
  // 'datetime' (default) renders calendar + hour + minute columns and the
  // trigger label includes time. 'date' hides the time columns and the
  // trigger label is date-only — used for date-only condition types.
  mode?: DateTimePickerMode;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

const TRIGGER_FORMAT: Record<DateTimePickerMode, string> = {
  date: 'MMM d, yyyy',
  datetime: 'MMM d, yyyy · HH:mm',
};

const DEFAULT_PLACEHOLDER: Record<DateTimePickerMode, string> = {
  date: 'Pick a date',
  datetime: 'Pick a date and time',
};

// Combined date + time picker. Calendar on the left, hour and minute scroll
// columns on the right (24h, 1-minute step). When `mode="date"` the time
// columns are hidden and the trigger label is date-only — same component,
// same look, just narrower.
//
// When value is undefined, the popover shows the current month with the
// hour/minute columns scrolled to "now" as a visual hint, but onChange
// does not fire until the user actually picks something. Picking any of
// date / hour / minute commits a Date built from the current draft (date
// defaults to today, time defaults to "now" if either side is missing).
export function DateTimePicker({
  value,
  onChange,
  mode = 'datetime',
  disabled,
  placeholder,
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  // Visual draft — what the calendar / time columns reflect when the
  // popover is open. Falls back to the current moment so the picker isn't
  // staring at January 1970 when value is undefined.
  const draft = value ?? new Date();

  const buildAt = (date: Date, hour: number, minute: number): Date => {
    const next = new Date(date);
    if (mode === 'date') {
      next.setHours(0, 0, 0, 0);
    } else {
      next.setHours(hour, minute, 0, 0);
    }
    return next;
  };

  const handleDateSelect = (next: Date | undefined) => {
    if (!next) {
      onChange(undefined);
      return;
    }
    onChange(buildAt(next, draft.getHours(), draft.getMinutes()));
  };

  const handleHourChange = (hour: number) => {
    onChange(buildAt(draft, hour, draft.getMinutes()));
  };

  const handleMinuteChange = (minute: number) => {
    onChange(buildAt(draft, draft.getHours(), minute));
  };

  const triggerLabel = value
    ? format(value, TRIGGER_FORMAT[mode])
    : (placeholder ?? DEFAULT_PLACEHOLDER[mode]);

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            'h-7.5 w-full justify-start gap-2 rounded-lg px-3 text-xs font-normal',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          defaultMonth={draft}
          initialFocus
        />
        {mode === 'datetime' && (
          // Time columns — fixed height matches a typical 6-row Calendar so
          // the columns don't end mid-month, and the inner scroll keeps
          // its own bounds. Border separates them from the Calendar.
          <div className="flex border-l">
            <div className="flex flex-col items-stretch border-r">
              <div className="px-3 pt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Hour
              </div>
              <TimeColumn
                value={draft.getHours()}
                onChange={handleHourChange}
                range={HOURS}
                className="h-64 w-12 px-1 pb-1"
              />
            </div>
            <div className="flex flex-col items-stretch">
              <div className="px-3 pt-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Min
              </div>
              <TimeColumn
                value={draft.getMinutes()}
                onChange={handleMinuteChange}
                range={MINUTES}
                className="h-64 w-12 px-1 pb-1"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
