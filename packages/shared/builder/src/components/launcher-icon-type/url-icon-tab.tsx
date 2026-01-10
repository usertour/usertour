import React from 'react';
import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { ArrowRightIcon } from '@usertour-packages/icons';
import { LauncherIconSource } from '@usertour/types';
import { IconPreview } from './icon-preview';
import { useIconUrl } from './hooks/use-icon-url';
import type { UrlIconTabProps } from './types';

export const UrlIconTab = React.memo<UrlIconTabProps>(
  ({ iconUrl, iconSource, onUrlSubmit, isUploading }) => {
    const { urlInput, setUrlInput, handleUrlSubmit, isValid } = useIconUrl({
      iconUrl,
      iconSource,
      onUrlSubmit,
    });

    const showPreview = iconSource === LauncherIconSource.URL && iconUrl;

    return (
      <div className="py-4 flex flex-col gap-2">
        <div className="flex gap-x-2">
          <Input
            id="icon-url"
            placeholder="Enter icon URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="bg-background flex-1"
            disabled={isUploading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUrlSubmit();
              }
            }}
          />
          <Button
            className="flex-none w-20"
            variant="ghost"
            size="default"
            onClick={handleUrlSubmit}
            disabled={isUploading || !isValid}
          >
            <ArrowRightIcon className="mr-1" />
            Load
          </Button>
        </div>
        {showPreview && (
          <div className="w-full pt-2">
            <IconPreview iconUrl={iconUrl} alt="URL icon" size="medium" />
          </div>
        )}
      </div>
    );
  },
);
UrlIconTab.displayName = 'UrlIconTab';
