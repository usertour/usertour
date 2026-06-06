import React from 'react';
import { RiExpandUpDownLine } from '@usertour/icons';
import { Button } from '@usertour/ui';
import { LauncherIconSource } from '@usertour/types';
import { getActiveIcon } from '@/pages/contents/components/builder/components/icon-picker/utils';
import { IconPreview } from '@/pages/contents/components/builder/components/icon-picker/icon-preview';
import type { IconTriggerButtonProps } from '@/pages/contents/components/builder/components/icon-picker/types';
import { useTranslation } from 'react-i18next';

export const IconTriggerButton = React.forwardRef<HTMLButtonElement, IconTriggerButtonProps>(
  ({ iconSource, iconUrl, iconType, activeText, ...props }, ref) => {
    const { t } = useTranslation();
    const ActiveIcon = getActiveIcon(iconType);

    const renderIcon = () => {
      if (iconSource === LauncherIconSource.NONE) {
        return null;
      }
      if (iconSource === LauncherIconSource.UPLOAD || iconSource === LauncherIconSource.URL) {
        if (iconUrl) {
          return (
            <IconPreview
              iconUrl={iconUrl}
              alt={t('contentBuilder.iconPicker.customIcon')}
              size="small"
            />
          );
        }
        return ActiveIcon ? <ActiveIcon size={16} /> : null;
      }
      return ActiveIcon ? <ActiveIcon size={16} /> : null;
    };

    return (
      <Button
        ref={ref}
        variant="outline"
        className="flex h-7.5 w-full items-center justify-start rounded-lg bg-slate-50 px-3 text-sm font-normal shadow-none hover:bg-slate-100"
        type="button"
        {...props}
      >
        {renderIcon()}
        <div className="grow text-left ml-2">
          <span className="capitalize">{activeText}</span>
        </div>
        <RiExpandUpDownLine className="h-4 w-4 opacity-50 ml-auto shrink-0" />
      </Button>
    );
  },
);
IconTriggerButton.displayName = 'IconTriggerButton';
