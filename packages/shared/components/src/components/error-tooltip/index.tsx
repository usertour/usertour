import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import React from 'react';

const ErrorTooltip = Popover;
const ErrorTooltipAnchor = PopoverAnchor;

const ErrorTooltipTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  React.ComponentPropsWithoutRef<typeof PopoverTrigger>
>(({ className, children, ...props }, ref) => (
  <PopoverTrigger ref={ref} className={className} asChild {...props}>
    {children}
  </PopoverTrigger>
));

ErrorTooltipTrigger.displayName = 'ErrorTooltipTrigger';

interface ErrorTooltipContentProps extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  zIndex?: number;
}

const ErrorTooltipContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  ErrorTooltipContentProps
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
        style={zIndex != null ? { zIndex } : undefined}
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

ErrorTooltipContent.displayName = 'ErrorTooltipContent';

export { ErrorTooltip, ErrorTooltipContent, ErrorTooltipTrigger, ErrorTooltipAnchor };
