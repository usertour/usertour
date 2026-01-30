'use client';

import { QuestionMarkCircledIcon } from '@radix-ui/react-icons';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import * as React from 'react';

import { cn } from '@usertour-packages/tailwind';

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipArrow = TooltipPrimitive.Arrow;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { usePortal?: boolean }
>(({ className, sideOffset = 4, usePortal = false, ...props }, ref) => {
  const content = (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  );

  if (!usePortal) {
    return content;
  }

  return <TooltipPrimitive.Portal>{content}</TooltipPrimitive.Portal>;
});
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

interface QuestionTooltipProps {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

const QuestionTooltip = ({ children, className, contentClassName }: QuestionTooltipProps) => (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <QuestionMarkCircledIcon className={cn('cursor-help w-4 h-4', className)} />
      </TooltipTrigger>
      <TooltipContent className={cn('max-w-xs', contentClassName)}>{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

QuestionTooltip.displayName = 'QuestionTooltip';

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipArrow, QuestionTooltip };
