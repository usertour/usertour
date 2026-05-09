import { CalendarIcon } from '@radix-ui/react-icons';
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
  // Conditions render this picker inside a Radix popover whose z-index is
  // way above the default `z-50`; without this prop the calendar Portal
  // gets stuck below the parent (e.g., builder chrome at z=11003 pins the
  // calendar at z=50, hidden behind the conditions popover). Callers
  // inside Conditions should pass `useConditionsZIndex().popover`.
  zIndex?: number;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

// Comma-separated convention (Linear / Stripe / Github) — reads cleanly
// both standalone ("May 15, 2026, 4:19 PM") and inside operator phrases
// like "between X and Y" where the `at` form would clash with `and`.
// 12h with AM/PM matches the US-default scheduling convention. Popover
// columns stay 24h because converting them to 12h + AM/PM is a bigger
// refactor.
const TRIGGER_FORMAT: Record<DateTimePickerMode, string> = {
  date: 'MMM d, yyyy',
  datetime: 'MMM d, yyyy, h:mm a',
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
  zIndex,
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
        <button
          type="button"
          disabled={disabled}
          // Match the conditions-popover trigger family (ConditionCombobox /
          // OperatorSelect): light `hover:bg-muted/40`, not the shadcn
          // outline-button default that flips bg + text to `accent`. Same
          // popover, same hover language.
          className={cn(
            'flex h-7.5 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-normal text-foreground shadow-sm outline-none transition-colors hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50',
            !value && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{triggerLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="flex w-auto p-0"
        align="start"
        sideOffset={4}
        style={zIndex ? { zIndex } : undefined}
        // Stay inside the parent's stacking context — Radix Portal lifts to
        // body and gets pinned by every elevated popover/modal in builder
        // chrome. Mirrors v1 RulesAttributeDatePicker.
        withoutPortal
      >
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleDateSelect}
          defaultMonth={draft}
          initialFocus
        />
        {mode === 'datetime' && (
          // Time pane — `HH:MM` summary spans both columns at the top so
          // users see the current selection at a glance, then two scroll
          // columns underneath. Replaces the per-column "HOUR" / "MIN"
          // labels because the colon-formatted summary already implies the
          // layout. Fixed column height matches a typical 6-row Calendar
          // so the columns don't end mid-month.
          <div className="flex flex-col border-l">
            <div className="border-b px-3 py-2 text-center text-sm font-medium tabular-nums">
              {String(draft.getHours()).padStart(2, '0')}
              <span className="px-1 text-muted-foreground">:</span>
              {String(draft.getMinutes()).padStart(2, '0')}
            </div>
            <div className="flex">
              <TimeColumn
                value={draft.getHours()}
                onChange={handleHourChange}
                range={HOURS}
                className="h-64 w-12 border-r px-1 py-1"
              />
              <TimeColumn
                value={draft.getMinutes()}
                onChange={handleMinuteChange}
                range={MINUTES}
                className="h-64 w-12 px-1 py-1"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
