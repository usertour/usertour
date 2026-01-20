'use client';

import { ToggleItem as ToolbarToggleItem } from '@radix-ui/react-toolbar';
import { cn } from '@usertour-packages/tailwind';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';
import { memo } from 'react';

import {
  TOOLBAR_BUTTON_ACTIVE,
  TOOLBAR_BUTTON_BASE,
  TOOLBAR_BUTTON_INACTIVE,
} from '../toolbar.styles';
import type { ToolbarItemProps } from '../toolbar.types';

/**
 * Base toolbar item component with tooltip support
 * Provides consistent styling and accessibility features
 */
export const ToolbarItem = memo(
  ({ isActive, onToggle, tooltip, ariaLabel, value, children }: ToolbarItemProps) => {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarToggleItem
            className={cn(
              TOOLBAR_BUTTON_BASE,
              isActive ? TOOLBAR_BUTTON_ACTIVE : TOOLBAR_BUTTON_INACTIVE,
            )}
            value={value}
            aria-label={ariaLabel}
            onMouseDown={onToggle}
          >
            {children}
          </ToolbarToggleItem>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  },
);

ToolbarItem.displayName = 'ToolbarItem';
