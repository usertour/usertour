import React from 'react';
import Upload from 'rc-upload';
import { Button } from '@usertour-packages/button';
import { SpinnerIcon } from '@usertour-packages/icons';
import { LauncherIconSource } from '@usertour/types';
import { ACCEPT_FILE_TYPES } from './constants';
import { IconPreview } from './icon-preview';
import { useIconUpload } from './hooks/use-icon-upload';
import type { UploadIconTabProps } from './types';

export const UploadIconTab = React.memo<UploadIconTabProps>(
  ({ iconUrl, iconSource, onUploadSuccess }) => {
    const { handleUpload, isUploading } = useIconUpload({
      onUploadSuccess,
    });
    const showPreview = iconSource === LauncherIconSource.UPLOAD && iconUrl;

    return (
      <div className="py-4 flex flex-col items-center gap-4">
        <Upload accept={ACCEPT_FILE_TYPES} customRequest={handleUpload} disabled={isUploading}>
          <Button variant="outline" className="w-full" disabled={isUploading}>
            {isUploading ? (
              <>
                <SpinnerIcon className="mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Choose SVG or Image File'
            )}
          </Button>
        </Upload>
        {showPreview && (
          <div className="w-full">
            <IconPreview iconUrl={iconUrl} alt="Uploaded icon" size="medium" />
          </div>
        )}
      </div>
    );
  },
);
UploadIconTab.displayName = 'UploadIconTab';
