import React from 'react';
import { Button, Input } from '@usertour/ui';
import { ArrowRightIcon } from '@usertour/icons';
import { useIconUrl } from '@/pages/contents/components/builder/components/icon-picker/hooks/use-icon-url';
import type { UrlIconTabProps } from '@/pages/contents/components/builder/components/icon-picker/types';
import { useTranslation } from 'react-i18next';

export const UrlIconTab = React.memo<UrlIconTabProps>(
  ({ iconUrl, iconSource, onUrlSubmit, isUploading }) => {
    const { t } = useTranslation();
    const { urlInput, setUrlInput, handleUrlSubmit, isValid } = useIconUrl({
      iconUrl,
      iconSource,
      onUrlSubmit,
    });

    return (
      <div className="py-4 flex flex-col gap-2">
        <div className="flex gap-x-2">
          <Input
            id="icon-url"
            placeholder={t('contentBuilder.iconPicker.urlPlaceholder')}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="bg-background dark:bg-muted flex-1"
            disabled={isUploading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleUrlSubmit();
              }
            }}
          />
          <Button
            className="flex-none w-20 h-9"
            variant="ghost"
            size="default"
            onClick={handleUrlSubmit}
            disabled={isUploading || !isValid}
          >
            <ArrowRightIcon className="mr-1" />
            {t('contentBuilder.iconPicker.load')}
          </Button>
        </div>
      </div>
    );
  },
);
UrlIconTab.displayName = 'UrlIconTab';
