import { Popover, PopoverContent, PopoverTrigger } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useConditionsZIndex } from '../conditions-context';

// Re-export the trigger as-is; only the Content needs the z-index injection.
export const ConditionPopover = Popover;
export const ConditionPopoverTrigger = PopoverTrigger;

type ContentProps = Omit<ComponentPropsWithoutRef<typeof PopoverContent>, 'style'> & {
  children: ReactNode;
};

// Wraps shadcn PopoverContent with the conditions z-index from context so
// nested popovers stack above sibling popovers / dropdowns predictably.
export const ConditionPopoverContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, sideOffset = 6, align = 'start', ...props }, ref) => {
    const { popover } = useConditionsZIndex();
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
ConditionPopoverContent.displayName = 'ConditionPopoverContent';
