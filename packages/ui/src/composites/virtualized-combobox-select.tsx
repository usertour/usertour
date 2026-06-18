'use client';

import { Combobox as ComboboxPrimitive } from '@base-ui/react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type RefObject, useCallback, useImperativeHandle, useRef } from 'react';
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxItem } from './combobox';
import {
  type ComboboxSelectBaseProps,
  type ComboboxSelectOption,
  SearchHeader,
  SelectTrigger,
  itemToStringValue,
} from './combobox-select-shared';

export type { ComboboxSelectOption } from './combobox-select-shared';

export interface VirtualizedComboboxSelectProps extends ComboboxSelectBaseProps {
  /**
   * Flat option list, windowed so only the visible rows render. Tag options
   * with `group` to draw a section divider at each group boundary — there are
   * no group headings.
   */
  options: ComboboxSelectOption[];
}

// Row height of a compact combobox item (py-1.5 + text-sm line-height). The
// virtualizer needs a fixed estimate; items are forced to this height so the
// estimate stays exact and no per-row measurement is required.
const VIRTUAL_ITEM_HEIGHT = 32;

// The @tanstack virtualizer instance, handed up to the Root's highlight
// callback so it can scroll off-screen rows into view.
type ListVirtualizer = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;

// Searchable single-select for very large lists, mirroring Base UI's official
// virtualized combobox example. Base UI still owns filtering — the inner list
// reads the already-filtered set via `useFilteredItems` and only renders the
// rows @tanstack/react-virtual reports as visible, each tagged with its `index`
// so Base UI's keyboard navigation and ARIA stay correct. Shares the trigger /
// search chrome with ComboboxSelect; for small lists use that instead.
export const VirtualizedComboboxSelect = (props: VirtualizedComboboxSelectProps) => {
  const {
    options,
    value,
    onValueChange,
    id,
    placeholder,
    searchPlaceholder,
    emptyText,
    size = 'default',
    surface = 'muted',
    footerSlot,
    disabled = false,
    className,
    contentClassName,
    contentStyle,
    container,
  } = props;

  const selected = options.find((option) => option.value === value) ?? null;

  // The virtualizer lives in VirtualList (it mounts with the popup, the only
  // point its scroll container exists to be measured). The highlight callback
  // is a Root prop, so reach the virtualizer through this ref.
  const virtualizerRef = useRef<ListVirtualizer | null>(null);

  return (
    <Combobox
      items={options}
      value={selected}
      onValueChange={(option: ComboboxSelectOption | null) => {
        if (option) {
          onValueChange(option.value);
        }
      }}
      itemToStringValue={itemToStringValue}
      disabled={disabled}
      virtualized
      onItemHighlighted={(item, details) => {
        // Base UI scrolls highlighted rows that are already rendered; the
        // virtualizer only needs a nudge for the wrap-around (first/last) and
        // programmatic highlights, whose target row may be off-screen.
        const virtualizer = virtualizerRef.current;
        if (!item || !virtualizer) {
          return;
        }
        const isStart = details.index === 0;
        const isEnd = details.index === virtualizer.options.count - 1;
        const shouldScroll =
          details.reason === 'none' || (details.reason === 'keyboard' && (isStart || isEnd));
        if (shouldScroll) {
          queueMicrotask(() => {
            virtualizer.scrollToIndex(details.index, { align: isEnd ? 'start' : 'end' });
          });
        }
      }}
    >
      <SelectTrigger
        id={id}
        disabled={disabled}
        size={size}
        surface={surface}
        className={className}
        placeholder={placeholder}
      />
      <ComboboxContent
        className={contentClassName}
        container={container}
        positionerStyle={contentStyle}
      >
        <SearchHeader placeholder={searchPlaceholder} />
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxPrimitive.List data-slot="combobox-list" className="outline-none">
          <VirtualList virtualizerRef={virtualizerRef} />
        </ComboboxPrimitive.List>
        {footerSlot}
      </ComboboxContent>
    </Combobox>
  );
};

VirtualizedComboboxSelect.displayName = 'VirtualizedComboboxSelect';

interface VirtualListProps {
  virtualizerRef: RefObject<ListVirtualizer | null>;
}

// The scroll container itself, rendered inside the list so it mounts with the
// popup. A callback ref runs `virtualizer.measure()` the instant the element
// attaches — Base UI mounts popup content after positioning, so this is the
// reliable measure point; leaning on the virtualizer's own scroll-element
// detection instead leaves the window empty (a scrollable but blank list).
const VirtualList = (props: VirtualListProps) => {
  const { virtualizerRef } = props;
  const filteredItems = ComboboxPrimitive.useFilteredItems<ComboboxSelectOption>();
  const scrollElementRef = useRef<HTMLDivElement | null>(null);

  const virtualizer = useVirtualizer({
    count: filteredItems.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => VIRTUAL_ITEM_HEIGHT,
    overscan: 20,
    paddingStart: 4,
    paddingEnd: 4,
    scrollPaddingStart: 4,
    scrollPaddingEnd: 4,
  });

  useImperativeHandle(virtualizerRef, () => virtualizer);

  const handleScrollElementRef = useCallback(
    (element: HTMLDivElement | null) => {
      scrollElementRef.current = element;
      if (element) {
        virtualizer.measure();
      }
    },
    [virtualizer],
  );

  const totalSize = virtualizer.getTotalSize();

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={handleScrollElementRef}
      role="presentation"
      className="max-h-[min(calc(24rem-2.25rem),calc(var(--available-height)-2.25rem))] scroll-py-1 overflow-y-auto p-1"
    >
      <div
        role="presentation"
        style={{ position: 'relative', width: '100%', height: `${totalSize}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const option = filteredItems[virtualRow.index];
          if (!option) {
            return null;
          }
          // Section break at a group boundary. `border-t` sits inside the fixed
          // row height (border-box), so the estimate stays exact.
          const previous = virtualRow.index > 0 ? filteredItems[virtualRow.index - 1] : undefined;
          const dividerBefore = previous != null && previous.group !== option.group;
          return (
            <ComboboxItem
              key={option.value}
              index={virtualRow.index}
              value={option}
              disabled={option.disabled}
              aria-setsize={filteredItems.length}
              aria-posinset={virtualRow.index + 1}
              className={dividerBefore ? 'border-t border-border' : undefined}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {option.leading}
              <div className="min-w-0 flex-1">
                <div className="truncate">{option.label}</div>
                {option.hint && (
                  <div className="truncate text-[11px] text-muted-foreground">{option.hint}</div>
                )}
              </div>
            </ComboboxItem>
          );
        })}
      </div>
    </div>
  );
};
