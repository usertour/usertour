import React from 'react';
import { CaretSortIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { LauncherIconSource } from '@usertour/types';
import { getActiveIcon } from './utils';
import { IconPreview } from './icon-preview';
import type { IconTriggerButtonProps } from './types';

export const IconTriggerButton = React.forwardRef<HTMLButtonElement, IconTriggerButtonProps>(
  ({ iconSource, iconUrl, iconType, activeText, ...props }, ref) => {
    const ActiveIcon = getActiveIcon(iconType);

    const renderIcon = () => {
      if (iconSource === LauncherIconSource.UPLOAD || iconSource === LauncherIconSource.URL) {
        if (iconUrl) {
          return <IconPreview iconUrl={iconUrl} alt="Custom icon" size="small" />;
        }
        return ActiveIcon ? <ActiveIcon size={16} /> : null;
      }
      return ActiveIcon ? <ActiveIcon size={16} /> : null;
    };

    return (
      <Button
        ref={ref}
        variant="outline"
        className="justify-start flex h-8 w-full px-3 py-2"
        type="button"
        {...props}
      >
        {renderIcon()}
        <div className="grow text-left ml-2">
          <span className="capitalize">{activeText}</span>
        </div>
        <CaretSortIcon className="h-4 w-4 opacity-50 ml-auto shrink-0" />
      </Button>
    );
  },
);
IconTriggerButton.displayName = 'IconTriggerButton';
