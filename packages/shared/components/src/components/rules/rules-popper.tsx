import * as PopoverPrimitive from '@radix-ui/react-popover';
import { EXTENSION_CONTENT_RULES } from '@usertour-ui/constants';

import { cn } from '@usertour-ui/ui-utils';
import React from 'react';

const RulesPopover = PopoverPrimitive.Root;

const RulesPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
    <div className={cn('grow pr-6 text-sm  py-2 text-wrap	 break-all', className)}>{children}</div>
  </PopoverPrimitive.Trigger>
));

const RulesPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(
  (
    {
      className,
      align = 'start',
      sideOffset = 5,
      alignOffset = -32,
      side = 'bottom',
      children,
      ...props
    },
    ref,
  ) => (
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      side={side}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      className={cn('z-50 border bg-popover rounded p-4  w-96', className)}
      style={{
        zIndex: EXTENSION_CONTENT_RULES,
        filter:
          'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
      }}
      {...props}
    >
      {children}
      <PopoverPrimitive.Arrow className="fill-background" width={20} height={10} />
    </PopoverPrimitive.Content>
  ),
);

RulesPopoverContent.displayName = 'RulesPopoverContent';

export { RulesPopover, RulesPopoverContent, RulesPopoverTrigger };
