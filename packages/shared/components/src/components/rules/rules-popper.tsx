import * as PopoverPrimitive from '@radix-ui/react-popover';

import { cn } from '@usertour/helpers';
import React from 'react';
import { useRulesZIndex } from './rules-context';

const RulesPopover = PopoverPrimitive.Root;

interface RulesPopoverTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger> {
  icon?: React.ReactNode;
}

const RulesPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  RulesPopoverTriggerProps
>(({ className, children, icon, ...props }, ref) => (
  <PopoverPrimitive.Trigger ref={ref} asChild {...props}>
    <button
      type="button"
      className={cn(
        'grow pr-6 text-sm py-2 text-wrap break-all text-left flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className,
      )}
    >
      {icon && (
        <span className="flex-none px-2 inline-flex items-center justify-center">{icon}</span>
      )}
      <span className="flex-1">{children}</span>
    </button>
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
      alignOffset = 0,
      side = 'bottom',
      children,
      ...props
    },
    ref,
  ) => {
    const { popover: zIndex } = useRulesZIndex();

    return (
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn('border bg-popover rounded p-4 w-96', className)}
        style={{
          zIndex,
          filter:
            'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
        }}
        {...props}
      >
        {children}
        <PopoverPrimitive.Arrow className="fill-background" width={20} height={10} />
      </PopoverPrimitive.Content>
    );
  },
);

RulesPopoverContent.displayName = 'RulesPopoverContent';

export { RulesPopover, RulesPopoverContent, RulesPopoverTrigger };
