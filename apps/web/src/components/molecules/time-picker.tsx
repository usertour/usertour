import { cn } from '@usertour-packages/tailwind';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

const ITEM_HEIGHT = 32;

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

interface TimeColumnProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

const TimeColumn = memo(({ items, value, onChange }: TimeColumnProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isUserScrolling = useRef(false);
  const scrollTimer = useRef<ReturnType<typeof setTimeout>>();
  const [padCount, setPadCount] = useState(2);

  // Measure container height and compute padCount
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const height = wrapper.clientHeight;
    const count = Math.ceil((height / ITEM_HEIGHT - 1) / 2);
    setPadCount(Math.max(count, 0));
  }, []);

  // Scroll to the selected value
  const scrollToValue = useCallback(
    (val: string, smooth = false) => {
      const container = containerRef.current;
      if (!container) return;
      const index = items.indexOf(val);
      if (index === -1) return;
      container.scrollTo({
        top: index * ITEM_HEIGHT,
        behavior: smooth ? 'smooth' : 'instant',
      });
    },
    [items],
  );

  // Initial scroll to selected value (after padCount is computed)
  useEffect(() => {
    scrollToValue(value);
  }, [padCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync scroll when value changes externally (not from user scroll)
  useEffect(() => {
    if (!isUserScrolling.current) {
      scrollToValue(value);
    }
  }, [value, scrollToValue]);

  // Handle scroll end — detect which item is snapped to center
  const handleScroll = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    scrollTimer.current = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const scrollTop = container.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
      const newValue = items[clampedIndex];
      if (newValue !== value) {
        onChange(newValue);
      }
      // Snap to exact position
      container.scrollTo({
        top: clampedIndex * ITEM_HEIGHT,
        behavior: 'smooth',
      });
      isUserScrolling.current = false;
    }, 100);
  }, [items, value, onChange]);

  const handleClick = useCallback(
    (item: string) => {
      onChange(item);
      scrollToValue(item, true);
    },
    [onChange, scrollToValue],
  );

  return (
    <div ref={wrapperRef} className="relative h-full" style={{ width: 56 }}>
      {/* Center highlight */}
      <div
        className="absolute left-1 right-1 rounded-md bg-accent pointer-events-none"
        style={{
          top: padCount * ITEM_HEIGHT,
          height: ITEM_HEIGHT,
        }}
      />
      {/* Scrollable column */}
      <div
        ref={containerRef}
        className="h-full overflow-y-auto relative"
        onScroll={handleScroll}
        style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Top padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        {items.map((item) => (
          <div
            key={item}
            className={cn(
              'flex items-center justify-center cursor-pointer text-sm select-none transition-colors',
              item === value ? 'text-foreground font-semibold' : 'text-muted-foreground',
            )}
            style={{
              height: ITEM_HEIGHT,
              scrollSnapAlign: 'start',
            }}
            onClick={() => handleClick(item)}
          >
            {item}
          </div>
        ))}
        {/* Bottom padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-bottom-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
    </div>
  );
});

TimeColumn.displayName = 'TimeColumn';

interface TimePickerProps {
  value: Date | null;
  onChange: (date: Date) => void;
}

export const TimePicker = memo(({ value, onChange }: TimePickerProps) => {
  const hour = value ? value.getHours().toString().padStart(2, '0') : '00';
  const minute = value ? value.getMinutes().toString().padStart(2, '0') : '00';

  const handleHourChange = useCallback(
    (h: string) => {
      const date = value ? new Date(value) : new Date();
      date.setHours(Number(h));
      onChange(date);
    },
    [value, onChange],
  );

  const handleMinuteChange = useCallback(
    (m: string) => {
      const date = value ? new Date(value) : new Date();
      date.setMinutes(Number(m));
      onChange(date);
    },
    [value, onChange],
  );

  return (
    <div className="flex h-full relative">
      <TimeColumn items={HOURS} value={hour} onChange={handleHourChange} />
      <TimeColumn items={MINUTES} value={minute} onChange={handleMinuteChange} />
    </div>
  );
});

TimePicker.displayName = 'TimePicker';
