import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';
import { cn } from '@usertour-packages/tailwind';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { LauncherIconSource } from '@usertour/types';
import { TAB_VALUES } from './constants';
import { getActiveText } from './utils';
import { useIconTab } from './hooks/use-icon-tab';
import { IconTriggerButton } from './icon-trigger-button';
import { BuiltinIconTab } from './builtin-icon-tab';
import { UploadIconTab } from './upload-icon-tab';
import { UrlIconTab } from './url-icon-tab';
import type { IconPickerProps } from './types';

export const IconPicker = ({
  type,
  iconSource = LauncherIconSource.BUILTIN,
  iconUrl,
  zIndex,
  showNoIcon = false,
  onChange,
}: IconPickerProps) => {
  const [open, setOpen] = useState(false);
  const hasNoIconTab = showNoIcon;
  const popoverWidthClassName = hasNoIconTab ? 'w-[360px]' : 'w-72';

  const activeText = getActiveText(iconSource, type);

  const { activeTab, handleTabChange } = useIconTab({
    iconSource,
  });

  const handleNoIcon = useCallback(() => {
    onChange({
      iconType: '',
      iconSource: LauncherIconSource.NONE,
      iconUrl: undefined,
    });
    setOpen(false);
  }, [onChange]);

  const handleIconSelect = useCallback(
    (selectedName: string) => {
      onChange({
        iconType: selectedName,
        iconSource: LauncherIconSource.BUILTIN,
        iconUrl: undefined,
      });
      setOpen(false);
    },
    [onChange],
  );

  const handleUploadSuccess = useCallback(
    (url: string) => {
      onChange({
        iconType: type,
        iconSource: LauncherIconSource.UPLOAD,
        iconUrl: url,
      });
      setOpen(false);
    },
    [onChange, type],
  );

  const handleUrlSubmit = useCallback(
    (url: string) => {
      onChange({
        iconType: type,
        iconSource: LauncherIconSource.URL,
        iconUrl: url,
      });
      setOpen(false);
    },
    [onChange, type],
  );

  const handleRemoveUploadedIcon = useCallback(() => {
    onChange({
      iconType: type,
      iconSource: LauncherIconSource.BUILTIN,
      iconUrl: undefined,
    });
  }, [onChange, type]);

  const handleTabValueChange = useCallback(
    (value: string) => {
      if (value === TAB_VALUES.NONE) {
        handleNoIcon();
        return;
      }

      handleTabChange(value);
    },
    [handleNoIcon, handleTabChange],
  );

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <IconTriggerButton
            iconSource={iconSource}
            iconUrl={iconUrl}
            iconType={type}
            activeText={activeText}
          />
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={5}
          className="z-50 w-full p-0"
          style={{
            zIndex: zIndex + 1,
          }}
        >
          <div className={cn('bg-background space-y-3 rounded p-4', popoverWidthClassName)}>
            <Tabs value={activeTab} onValueChange={handleTabValueChange}>
              <UnderlineTabsList>
                <UnderlineTabsTrigger value="builtin">Built-in icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="upload">Upload icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="url">Enter URL</UnderlineTabsTrigger>
                {showNoIcon && <UnderlineTabsTrigger value="none">No icon</UnderlineTabsTrigger>}
              </UnderlineTabsList>
              {showNoIcon && (
                <UnderlineTabsContent value="none">
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    No icon will be displayed for this item.
                  </div>
                </UnderlineTabsContent>
              )}
              <UnderlineTabsContent value="builtin">
                <BuiltinIconTab selectedType={type} onIconSelect={handleIconSelect} />
              </UnderlineTabsContent>
              <UnderlineTabsContent value="upload">
                <UploadIconTab
                  iconUrl={iconUrl}
                  iconSource={iconSource}
                  onUploadSuccess={handleUploadSuccess}
                  onRemove={handleRemoveUploadedIcon}
                />
              </UnderlineTabsContent>
              <UnderlineTabsContent value="url">
                <UrlIconTab
                  iconUrl={iconUrl}
                  iconSource={iconSource}
                  onUrlSubmit={handleUrlSubmit}
                  isUploading={false}
                />
              </UnderlineTabsContent>
            </Tabs>
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
IconPicker.displayName = 'IconPicker';
