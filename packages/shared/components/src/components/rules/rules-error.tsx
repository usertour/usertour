import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import React from 'react';

const RulesError = Popover;
const RulesErrorAnchor = PopoverAnchor;

const RulesErrorTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>(({ className, children, ...props }, ref) => (
  <PopoverTrigger ref={ref} className={className} asChild {...props}>
    {children}
  </PopoverTrigger>
));

interface RulesErrorContentProps extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  zIndex: number;
}

const RulesErrorContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  RulesErrorContentProps
>(
  (
    { className, align = 'center', side = 'right', sideOffset = 5, children, zIndex, ...props },
    ref,
  ) => {
    return (
      <PopoverContent
        ref={ref}
        align={align}
        side={side}
        sideOffset={sideOffset}
        style={{ zIndex }}
        className={cn(
          'border-none bg-destructive text-destructive-foreground rounded-lg p-2 w-48 text-sm',
          className,
        )}
        {...props}
      >
        {children}
        <PopoverArrow className="fill-destructive" width={10} height={5} />
      </PopoverContent>
    );
  },
);

RulesErrorContent.displayName = 'RulesErrorContent';

export { RulesError, RulesErrorContent, RulesErrorTrigger, RulesErrorAnchor };
