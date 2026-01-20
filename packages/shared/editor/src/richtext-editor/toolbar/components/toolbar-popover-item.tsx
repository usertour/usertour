'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { cn } from '@usertour-packages/tailwind';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';
import { memo } from 'react';

import {
  TOOLBAR_BUTTON_ACTIVE,
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_INACTIVE,
} from '../toolbar.styles';
import type { ToolbarPopoverItemProps } from '../toolbar.types';

/**
 * Base toolbar popover item component with tooltip support
 * Used for toolbar buttons that open a popover (like color picker)
 * Provides consistent styling and accessibility features
 */
export const ToolbarPopoverItem = memo(
  ({
    tooltip,
    ariaLabel,
    open,
    onOpenChange,
    children,
    popoverContent,
    popoverZIndex,
  }: ToolbarPopoverItemProps) => {
    return (
      <Popover open={open} onOpenChange={onOpenChange}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger
              className={cn(
                TOOLBAR_BUTTON_BASE,
                open ? TOOLBAR_BUTTON_ACTIVE : TOOLBAR_BUTTON_INACTIVE,
              )}
              aria-label={ariaLabel}
            >
              {children}
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          sideOffset={5}
          className="w-auto border-none bg-transparent p-0 shadow-none drop-shadow-popover"
          style={popoverZIndex ? { zIndex: popoverZIndex } : undefined}
        >
          {popoverContent}
        </PopoverContent>
      </Popover>
    );
  },
);

ToolbarPopoverItem.displayName = 'ToolbarPopoverItem';
