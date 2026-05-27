import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@usertour/popover';
import { cn } from '@usertour/tailwind';
import React from 'react';

const ErrorTooltip = Popover;
const ErrorTooltipAnchor = PopoverAnchor;

export interface ErrorTooltipTriggerProps
  extends React.ComponentPropsWithoutRef<typeof PopoverTrigger> {}

const ErrorTooltipTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverTrigger>,
  ErrorTooltipTriggerProps
>((props, ref) => {
  const { className, children, ...rest } = props;
  return (
    <PopoverTrigger ref={ref} className={className} asChild {...rest}>
      {children}
    </PopoverTrigger>
  );
});

ErrorTooltipTrigger.displayName = 'ErrorTooltipTrigger';

export interface ErrorTooltipContentProps
  extends React.ComponentPropsWithoutRef<typeof PopoverContent> {
  zIndex?: number;
}

const ErrorTooltipContent = React.forwardRef<
  React.ElementRef<typeof PopoverContent>,
  ErrorTooltipContentProps
>((props, ref) => {
  const {
    className,
    align = 'center',
    side = 'right',
    sideOffset = 5,
    children,
    zIndex,
    ...rest
  } = props;
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
      {...rest}
    >
      {children}
      <PopoverArrow className="fill-destructive" width={10} height={5} />
    </PopoverContent>
  );
});

ErrorTooltipContent.displayName = 'ErrorTooltipContent';

export { ErrorTooltip, ErrorTooltipContent, ErrorTooltipTrigger, ErrorTooltipAnchor };
