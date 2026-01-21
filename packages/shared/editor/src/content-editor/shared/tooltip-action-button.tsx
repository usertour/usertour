// Shared TooltipActionButton component for content editor

import { Button } from '@usertour-packages/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { cn } from '@usertour-packages/tailwind';
import { memo, forwardRef } from 'react';
import type { ReactNode, MouseEventHandler, ComponentPropsWithoutRef } from 'react';

export interface TooltipActionButtonProps extends ComponentPropsWithoutRef<typeof Button> {
  tooltip: string;
  icon: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  destructive?: boolean;
}

export const TooltipActionButton = memo(
  forwardRef<HTMLButtonElement, TooltipActionButtonProps>(
    (
      { tooltip, icon, onClick, disabled, variant = 'ghost', destructive, className, ...props },
      ref,
    ) => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              className={cn('flex-none', destructive && 'hover:bg-destructive/20', className)}
              variant={variant}
              size="icon"
              onClick={onClick}
              disabled={disabled}
              {...props}
            >
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  ),
);

TooltipActionButton.displayName = 'TooltipActionButton';
