import { cn } from '@usertour-packages/tailwind';
import { useEffect, useRef } from 'react';

interface Props {
  value: number;
  onChange: (next: number) => void;
  // The full range of values to display, e.g. [0..23] for hours.
  range: number[];
  className?: string;
}

const ROW_HEIGHT = 28;

// Single scrollable column of zero-padded numbers (00..NN). Used for hour and
// minute columns of DateTimePicker. Scrolls so the selected row is centered
// when value changes; keeps the scroll local to the column (never the page).
export function TimeColumn({ value, onChange, range, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Center the selected row when value changes. Use scrollTop math instead of
  // scrollIntoView so we don't accidentally scroll the surrounding page.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const idx = range.indexOf(value);
    if (idx < 0) return;
    el.scrollTop = idx * ROW_HEIGHT - el.clientHeight / 2 + ROW_HEIGHT / 2;
  }, [value, range]);

  return (
    <div ref={containerRef} className={cn('overflow-y-auto', className)}>
      {range.map((n) => {
        const selected = n === value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'flex w-full items-center justify-center rounded text-sm outline-none transition-colors',
              selected
                ? 'bg-primary font-medium text-primary-foreground'
                : 'text-foreground hover:bg-muted/50 focus-visible:bg-muted/50',
            )}
            style={{ height: ROW_HEIGHT }}
          >
            {String(n).padStart(2, '0')}
          </button>
        );
      })}
    </div>
  );
}
