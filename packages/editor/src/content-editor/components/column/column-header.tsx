// Column header component with settings trigger and drag handle

import { DragHandleDots2Icon, GearIcon } from '@radix-ui/react-icons';
import { PopoverAnchor, PopoverTrigger } from '@usertour-packages/popover';
import { memo } from 'react';
import type { HTMLAttributes } from 'react';

export interface ColumnHeaderProps {
  attributes: HTMLAttributes<HTMLElement>;
  listeners: Record<string, unknown>;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  /**
   * Styles from FloatingUI positioning
   */
  floatingStyles?: React.CSSProperties;
  /**
   * Ref setter for FloatingUI floating element
   */
  setFloating?: (node: HTMLElement | null) => void;
}

/**
 * Column header component displayed at the top of active columns
 * Contains the column label, settings trigger, and drag handle
 * Uses FloatingUI for positioning to avoid overflow clipping issues
 */
export const ColumnHeader = memo(
  ({
    attributes,
    listeners,
    setActivatorNodeRef,
    floatingStyles,
    setFloating,
  }: ColumnHeaderProps) => {
    // Combine FloatingUI styles with base styles
    // Use fixed positioning from FloatingUI when provided, otherwise fallback to absolute
    // FloatingUI with 'top-start' placement and mainAxis: 0 positions the header's bottom edge
    // at the column's top edge, which matches the original absolute -top-4 behavior
    const headerStyle: React.CSSProperties = floatingStyles
      ? floatingStyles
      : {
          position: 'absolute',
          top: '-16px',
          left: '-1px',
        };

    return (
      <div
        ref={setFloating}
        style={headerStyle}
        className="h-4 px-1 rounded-none rounded-t bg-primary flex flex-row text-primary-foreground items-center justify-center"
      >
        <PopoverAnchor asChild>
          <PopoverTrigger className="flex flex-row !text-[10px] items-center justify-center">
            column
            <GearIcon className="ml-1 h-3 w-3" />
          </PopoverTrigger>
        </PopoverAnchor>
        <div
          className="items-center justify-center cursor-move"
          {...attributes}
          {...(listeners as Record<string, unknown>)}
          ref={setActivatorNodeRef}
        >
          <DragHandleDots2Icon className="h-3" />
        </div>
      </div>
    );
  },
);

ColumnHeader.displayName = 'ColumnHeader';

/**
 * Simplified header for overlay component (no interactive triggers)
 * Note: This component is used in drag overlay which is rendered via Portal,
 * so it may not have the same overflow clipping issue. However, we keep
 * the absolute positioning for consistency with the original design.
 * If overflow issues occur in overlay context, consider using FloatingUI here too.
 */
export const ColumnHeaderOverlay = memo(() => (
  <div className="absolute -top-4 -left-[1px] h-4 px-1 rounded-none rounded-t bg-primary flex flex-row text-primary-foreground items-center justify-center">
    <div className="flex flex-row !text-[10px] items-center justify-center">
      column
      <GearIcon className="ml-1 h-3 w-3" />
    </div>
    <div className="items-center justify-center cursor-move">
      <DragHandleDots2Icon className="h-3" />
    </div>
  </div>
));

ColumnHeaderOverlay.displayName = 'ColumnHeaderOverlay';
