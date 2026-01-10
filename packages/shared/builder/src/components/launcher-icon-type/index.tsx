import { useCallback, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger, PopoverArrow } from '@usertour-packages/popover';
import {
  Tabs,
  UnderlineTabsList,
  UnderlineTabsTrigger,
  UnderlineTabsContent,
} from '@usertour-packages/tabs';
import { TooltipProvider } from '@usertour-packages/tooltip';
import { LauncherIconSource } from '@usertour/types';
import { getActiveText } from './utils';
import { useIconTab } from './hooks/use-icon-tab';
import { IconTriggerButton } from './icon-trigger-button';
import { BuiltinIconTab } from './builtin-icon-tab';
import { UploadIconTab } from './upload-icon-tab';
import { UrlIconTab } from './url-icon-tab';
import type { LauncherIconTypeProps } from './types';

export const LauncherIconType = ({
  type,
  iconSource = LauncherIconSource.BUILTIN,
  iconUrl,
  zIndex,
  onChange,
}: LauncherIconTypeProps) => {
  const [open, setOpen] = useState(false);

  const activeText = getActiveText(iconSource, type);

  const { activeTab, handleTabChange } = useIconTab({
    iconSource,
  });

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
            filter:
              'drop-shadow(0 3px 10px rgba(0, 0, 0, 0.15)) drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1))',
          }}
        >
          <div className="bg-background p-4 rounded space-y-3 w-80">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <UnderlineTabsList>
                <UnderlineTabsTrigger value="builtin">Built-in icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="upload">Upload icon</UnderlineTabsTrigger>
                <UnderlineTabsTrigger value="url">Enter URL</UnderlineTabsTrigger>
              </UnderlineTabsList>
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
          <PopoverArrow className="fill-background" width={20} height={10} />
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
LauncherIconType.displayName = 'LauncherIconType';
