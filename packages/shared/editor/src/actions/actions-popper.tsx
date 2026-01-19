import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import React from 'react';

const ContentActionsPopover = Popover;

const ContentActionsPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>(({ className, children, ...props }, ref) => (
  <PopoverTrigger ref={ref} asChild {...props}>
    <div className={cn('grow pr-6 text-sm  py-2 w-60 break-words', className)}>{children}</div>
  </PopoverTrigger>
));

ContentActionsPopoverTrigger.displayName = 'ContentActionsPopoverTrigger';

const ContentActionsPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
>(({ className, align = 'start', sideOffset = 5, children, style, ...props }, ref) => (
  <PopoverContent
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cn('rounded w-96 drop-shadow-popover', className)}
    style={style}
    {...props}
  >
    {children}
    <PopoverArrow className="fill-background" width={20} height={10} />
  </PopoverContent>
));

ContentActionsPopoverContent.displayName = 'ContentActionsPopoverContent';

export { ContentActionsPopover, ContentActionsPopoverContent, ContentActionsPopoverTrigger };
