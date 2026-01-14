import { memo } from 'react';

import { Button } from '@usertour-packages/button';
import { Input } from '@usertour-packages/input';
import { ArrowRightIcon } from '@usertour-packages/icons';

import { useAvatarUrl } from './hooks/use-avatar-url';
import type { UrlAvatarTabProps } from './types';

export const UrlAvatarTab = memo<UrlAvatarTabProps>(
  ({ avatarUrl, isCurrentUrl, onUrlSubmit, disabled }) => {
    const { urlInput, setUrlInput, handleUrlSubmit, isValid } = useAvatarUrl({
      avatarUrl,
      isCurrentUrl,
      onUrlSubmit,
    });

    return (
      <div className="py-4 flex flex-col gap-2">
        <div className="flex gap-x-2">
          <Input
            id="avatar-url"
            placeholder="Enter avatar URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="bg-background flex-1"
            disabled={disabled}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !disabled) {
                handleUrlSubmit();
              }
            }}
          />
          <Button
            className="flex-none w-20 h-9"
            variant="ghost"
            size="default"
            onClick={handleUrlSubmit}
            disabled={disabled || !isValid}
          >
            <ArrowRightIcon className="mr-1" />
            Load
          </Button>
        </div>
      </div>
    );
  },
);
UrlAvatarTab.displayName = 'UrlAvatarTab';
