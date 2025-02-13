import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@usertour-ui/ui-utils';
import React from 'react';

const ContentActionsError = PopoverPrimitive.Root;
const ContentActionsErrorAnchor = PopoverPrimitive.Anchor;

const ContentActionsErrorTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} className={className} asChild {...props}>
    {children}
  </PopoverPrimitive.Trigger>
));

const ContentActionsErrorContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', side = 'right', sideOffset = 5, children, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      className={cn('z-50 bg-red-500 text-white rounded-lg p-2 w-48 text-sm', className)}
      {...props}
    >
      {children}
      <PopoverPrimitive.Arrow className="fill-red-500" width={10} height={5} />
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
));

ContentActionsErrorContent.displayName = 'ContentActionsErrorContent';

export {
  ContentActionsError,
  ContentActionsErrorContent,
  ContentActionsErrorTrigger,
  ContentActionsErrorAnchor,
};
