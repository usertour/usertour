// Tooltip-based error components (no extra wrapper div)
// Use these components when you need error tooltip without extra DOM elements

import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import React from 'react';

interface EditorErrorTooltipProps {
  open?: boolean;
  children: React.ReactNode;
}

const EditorErrorTooltip = ({ open, children }: EditorErrorTooltipProps) => (
  <TooltipProvider delayDuration={0}>
    <Tooltip open={open}>{children}</Tooltip>
  </TooltipProvider>
);

EditorErrorTooltip.displayName = 'EditorErrorTooltip';

const EditorErrorTooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipTrigger>,
  React.ComponentPropsWithoutRef<typeof TooltipTrigger>
>(({ children, ...props }, ref) => (
  <TooltipTrigger ref={ref} asChild {...props}>
    {children}
  </TooltipTrigger>
));

EditorErrorTooltipTrigger.displayName = 'EditorErrorTooltipTrigger';

const EditorErrorTooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipContent>,
  React.ComponentPropsWithoutRef<typeof TooltipContent>
>(({ className, side = 'right', sideOffset = 5, children, ...props }, ref) => (
  <TooltipContent
    ref={ref}
    side={side}
    sideOffset={sideOffset}
    usePortal
    className={cn(
      'border-none bg-destructive text-destructive-foreground rounded-lg p-2 w-48 text-sm',
      className,
    )}
    {...props}
  >
    {children}
    <TooltipArrow className="fill-destructive" width={10} height={5} />
  </TooltipContent>
));

EditorErrorTooltipContent.displayName = 'EditorErrorTooltipContent';

export { EditorErrorTooltip, EditorErrorTooltipTrigger, EditorErrorTooltipContent };
