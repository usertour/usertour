import { Popover, PopoverContent, PopoverTrigger } from '@usertour/popover';
import { cn } from '@usertour/tailwind';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useActionsZIndex } from '../actions-context';

// Mirrors conditions/ui/condition-popover.tsx. Only the Content needs a
// z-index injection from context; the shell and trigger pass through.
export const ActionPopover = Popover;
export const ActionPopoverTrigger = PopoverTrigger;

type ContentProps = Omit<ComponentPropsWithoutRef<typeof PopoverContent>, 'style'> & {
  children: ReactNode;
};

export const ActionPopoverContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, sideOffset = 6, align = 'start', ...props }, ref) => {
    const { popover } = useActionsZIndex();
    return (
      <PopoverContent
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn('w-auto rounded-lg p-3 text-sm shadow-lg', className)}
        style={{ zIndex: popover }}
        {...props}
      >
        {children}
      </PopoverContent>
    );
  },
);
ActionPopoverContent.displayName = 'ActionPopoverContent';
