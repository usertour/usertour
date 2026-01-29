// Group drag handle component for dragging groups

import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import { memo } from 'react';
import type { HTMLAttributes } from 'react';

export interface GroupDragHandleProps {
  isVisible: boolean;
  isOverlay?: boolean;
  setActivatorNodeRef?: (node: HTMLElement | null) => void;
  attributes?: HTMLAttributes<HTMLElement>;
  listeners?: Record<string, unknown>;
}

/**
 * Drag handle component displayed on the left side of groups
 * Used for reordering groups via drag and drop
 */
export const GroupDragHandle = memo(
  ({
    isVisible,
    isOverlay = false,
    setActivatorNodeRef,
    attributes,
    listeners,
  }: GroupDragHandleProps) => {
    if (!isVisible) return null;

    return (
      <Button
        size="icon"
        ref={setActivatorNodeRef}
        className={cn(
          'rounded-none absolute w-4 h-full rounded-l -left-4 cursor-move',
          isOverlay && 'bg-sdk-primary',
        )}
        {...attributes}
        {...(listeners as Record<string, unknown>)}
      >
        <DragHandleDots2Icon className="h-4" />
      </Button>
    );
  },
);

GroupDragHandle.displayName = 'GroupDragHandle';
