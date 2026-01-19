import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import React from 'react';

const ContentActionsError = Popover;
const ContentActionsErrorAnchor = PopoverAnchor;

const ContentActionsErrorTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>(({ className, children, ...props }, ref) => (
  <PopoverTrigger ref={ref} className={className} asChild {...props}>
    {children}
  </PopoverTrigger>
));

ContentActionsErrorTrigger.displayName = 'ContentActionsErrorTrigger';

const ContentActionsErrorContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, align = 'center', side = 'right', sideOffset = 5, children, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    align={align}
    side={side}
    sideOffset={sideOffset}
    className={cn(
      'z-50 border-none bg-destructive text-destructive-foreground rounded-lg p-2 w-48 text-sm',
      className,
    )}
    {...props}
  >
    {children}
    <PopoverArrow className="fill-destructive" width={10} height={5} />
  </PopoverContent>
));

ContentActionsErrorContent.displayName = 'ContentActionsErrorContent';

export {
  ContentActionsError,
  ContentActionsErrorContent,
  ContentActionsErrorTrigger,
  ContentActionsErrorAnchor,
};
