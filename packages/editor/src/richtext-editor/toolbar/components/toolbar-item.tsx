'use client';

import { ToggleItem as ToolbarToggleItem } from '@radix-ui/react-toolbar';
import { EDITOR_RICH_TOOLBAR_MORE } from '@usertour/constants';
import { cn } from '@usertour/tailwind';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { usePopperEditorContext } from '../../editor';
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
  ({ isActive, onToggle, tooltip, ariaLabel, value, children, disabled }: ToolbarItemProps) => {
    const { zIndex } = usePopperEditorContext();
    const { t } = useTranslation();

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarToggleItem
            className={cn(
              TOOLBAR_BUTTON_BASE,
              disabled
                ? 'opacity-20 cursor-not-allowed'
                : isActive
                  ? TOOLBAR_BUTTON_ACTIVE
                  : TOOLBAR_BUTTON_INACTIVE,
            )}
            value={value}
            aria-label={t(ariaLabel)}
            disabled={disabled}
            onMouseDown={disabled ? undefined : onToggle}
          >
            {children}
          </ToolbarToggleItem>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-xs"
          usePortal
          style={{ zIndex: zIndex + EDITOR_RICH_TOOLBAR_MORE }}
        >
          <p>{t(tooltip)}</p>
        </TooltipContent>
      </Tooltip>
    );
  },
);

ToolbarItem.displayName = 'ToolbarItem';
