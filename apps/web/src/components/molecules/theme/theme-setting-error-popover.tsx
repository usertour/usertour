import { memo } from 'react';
import type { ReactNode } from 'react';

import { Popover, PopoverAnchor, PopoverArrow, PopoverContent } from '@usertour-packages/popover';

type ThemeSettingErrorPopoverProps = {
  children: ReactNode;
  error?: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
};

/**
 * Error popover component for theme settings
 * Displays a destructive popover when there's an error
 * Always renders Popover to keep DOM structure stable and prevent focus issues
 */
export const ThemeSettingErrorPopover = memo<ThemeSettingErrorPopoverProps>(
  ({ children, error, side = 'right', align }) => {
    return (
      <Popover open={!!error}>
        <PopoverAnchor asChild>{children}</PopoverAnchor>
        {error && (
          <PopoverContent
            side={side}
            align={align}
            sideOffset={5}
            className="bg-destructive text-destructive-foreground rounded-lg p-2 w-auto max-w-xs text-sm border-0"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            {error}
            <PopoverArrow className="fill-destructive" width={10} height={5} />
          </PopoverContent>
        )}
      </Popover>
    );
  },
);

ThemeSettingErrorPopover.displayName = 'ThemeSettingErrorPopover';
