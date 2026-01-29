// Shared DragHandle component for content editor elements

import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour-packages/tailwind';
import { memo } from 'react';
import type { HTMLAttributes } from 'react';

export interface DragHandleProps {
  isVisible: boolean;
  isOverlay?: boolean;
  setActivatorNodeRef?: (node: HTMLElement | null) => void;
  attributes?: HTMLAttributes<HTMLElement>;
  listeners?: Record<string, unknown>;
  className?: string;
  variant?: 'group' | 'column';
}

/**
 * Shared drag handle component for group and column elements
 * Provides consistent drag interaction across different element types
 */
export const DragHandle = memo(
  ({
    isVisible,
    isOverlay = false,
    setActivatorNodeRef,
    attributes,
    listeners,
    className,
    variant = 'group',
  }: DragHandleProps) => {
    if (!isVisible) return null;

    if (variant === 'column') {
      return (
        <div
          className={cn('items-center justify-center cursor-move', className)}
          {...attributes}
          {...(listeners as Record<string, unknown>)}
          ref={setActivatorNodeRef}
        >
          <DragHandleDots2Icon className="h-3" />
        </div>
      );
    }

    // Group variant (default)
    return (
      <Button
        size="icon"
        ref={setActivatorNodeRef}
        className={cn(
          'rounded-none absolute w-4 h-full rounded-l -left-4 cursor-move',
          isOverlay && 'bg-sdk-primary',
          className,
        )}
        {...attributes}
        {...(listeners as Record<string, unknown>)}
      >
        <DragHandleDots2Icon className="h-4" />
      </Button>
    );
  },
);

DragHandle.displayName = 'DragHandle';
