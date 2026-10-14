import { Popover, PopoverContent, PopoverTrigger } from '@usertour/ui';
import { cn } from '@usertour/tailwind';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { forwardRef } from 'react';
import { useRulesZIndex } from './z-index';

// Re-export the trigger as-is; only the Content needs the z-index injection.
export const RulesPopover = Popover;
export const RulesPopoverTrigger = PopoverTrigger;

type ContentProps = Omit<ComponentPropsWithoutRef<typeof PopoverContent>, 'style'> & {
  children: ReactNode;
};

// Wraps shadcn PopoverContent with the rules z-index from context so
// nested popovers stack above sibling popovers / dropdowns predictably.
export const RulesPopoverContent = forwardRef<HTMLDivElement, ContentProps>(
  ({ className, children, sideOffset = 6, align = 'start', ...props }, ref) => {
    const { popover } = useRulesZIndex();
    return (
      <PopoverContent
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn('w-auto rounded-lg p-3 text-sm', className)}
        style={{ zIndex: popover }}
        {...props}
      >
        {children}
      </PopoverContent>
    );
  },
);
RulesPopoverContent.displayName = 'RulesPopoverContent';
