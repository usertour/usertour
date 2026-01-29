import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import React from 'react';
import { useRulesZIndex } from './rules-context';

const RulesPopover = Popover;

interface RulesPopoverTriggerProps extends React.ComponentPropsWithoutRef<typeof PopoverTrigger> {
  icon?: React.ReactNode;
}

const RulesPopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  RulesPopoverTriggerProps
>(({ className, children, icon, ...props }, ref) => (
  <PopoverTrigger ref={ref} asChild {...props}>
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
  </PopoverTrigger>
));

const RulesPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  React.ComponentPropsWithoutRef<typeof PopoverContent>
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
      <PopoverContent
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        alignOffset={alignOffset}
        className={cn('rounded w-96 drop-shadow-popover', className)}
        style={{ zIndex }}
        {...props}
      >
        {children}
        <PopoverArrow className="fill-background" width={20} height={10} />
      </PopoverContent>
    );
  },
);

RulesPopoverContent.displayName = 'RulesPopoverContent';

export { RulesPopover, RulesPopoverContent, RulesPopoverTrigger };
