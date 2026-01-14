import { memo } from 'react';

import Upload from 'rc-upload';
import { Button } from '@usertour-packages/button';
import { RiDeleteBinFill, RiUpload2Fill, SpinnerIcon } from '@usertour-packages/icons';
import { Tooltip, TooltipContent, TooltipTrigger } from '@usertour-packages/tooltip';

import { ACCEPT_FILE_TYPES } from './constants';
import { useAvatarUpload } from './hooks/use-avatar-upload';
import type { UploadAvatarTabProps } from './types';

export const UploadAvatarTab = memo<UploadAvatarTabProps>(
  ({ avatarUrl, isCurrentUpload, onUploadSuccess, onRemove }) => {
    const { handleUpload, isUploading } = useAvatarUpload({
      onUploadSuccess,
    });
    const showPreview = isCurrentUpload && avatarUrl;

    return (
      <div className="w-full min-w-0 bg-background rounded-lg p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground">Upload an avatar</h4>
          <p className="text-xs text-muted-foreground">PNG, JPG, GIF or SVG. Max 1MB.</p>
        </div>

        <Upload
          accept={ACCEPT_FILE_TYPES}
          customRequest={handleUpload}
          disabled={isUploading}
          className="block min-w-0"
        >
          <div
            className={`w-full min-w-0 rounded-md border-2 ${
              isUploading
                ? 'border-muted/50 bg-muted/30'
                : 'border-dashed border-muted bg-transparent'
            } p-4 flex flex-col items-center gap-3 cursor-pointer transition-colors`}
            aria-hidden={isUploading}
          >
            <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted">
              <RiUpload2Fill className="text-muted-foreground/70" size={20} />
            </div>

            <Button variant="outline" className="whitespace-nowrap" disabled={isUploading}>
              {isUploading ? (
                <span className="inline-flex items-center">
                  <SpinnerIcon className="mr-2 animate-spin" />
                  Uploading
                </span>
              ) : (
                'Choose file'
              )}
            </Button>
          </div>
        </Upload>

        {showPreview && (
          <div className="mt-4 flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-muted/70 flex items-center justify-center">
                <img src={avatarUrl} alt="Uploaded avatar" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">Uploaded avatar</div>
                <div className="text-xs text-muted-foreground truncate break-all">
                  {avatarUrl?.slice(0, 40)}...
                </div>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="flex-none hover:bg-destructive/10"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove?.()}
                >
                  <RiDeleteBinFill className="text-destructive w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">Remove avatar</TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>
    );
  },
);
UploadAvatarTab.displayName = 'UploadAvatarTab';
