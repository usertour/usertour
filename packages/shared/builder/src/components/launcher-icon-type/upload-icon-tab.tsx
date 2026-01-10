import React from 'react';
import Upload from 'rc-upload';
import { Button } from '@usertour-packages/button';
import { RiDeleteBinFill, RiUpload2Fill, SpinnerIcon } from '@usertour-packages/icons';
import { LauncherIconSource } from '@usertour/types';
import { ACCEPT_FILE_TYPES } from './constants';
import { IconPreview } from './icon-preview';
import { useIconUpload } from './hooks/use-icon-upload';
import type { UploadIconTabProps } from './types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';

export const UploadIconTab = React.memo<UploadIconTabProps>(
  ({ iconUrl, iconSource, onUploadSuccess, onRemove }) => {
    const { handleUpload, isUploading } = useIconUpload({
      onUploadSuccess,
    });
    const showPreview = iconSource === LauncherIconSource.UPLOAD && iconUrl;

    return (
      <div className="w-full min-w-0 bg-background rounded-lg shadow-sm p-4">
        <div className="mb-3">
          <h4 className="text-sm font-medium text-foreground">Upload an icon</h4>
          <p className="text-xs text-muted-foreground">
            SVG preferred. Max 1MB. Drag & drop or click to choose a file.
          </p>
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
            } p-4 flex flex-col md:flex-row items-center gap-4 cursor-pointer transition-colors`}
            aria-hidden={isUploading}
          >
            <div className="flex-1 min-w-0 flex items-center justify-center gap-4 min-h-[88px] w-full md:w-auto">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted">
                  <RiUpload2Fill className="text-muted-foreground/70" size={20} />
                </div>
              </div>

              <div className="hidden md:block flex-shrink-0">
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
            </div>

            <div className="md:hidden w-full flex-shrink-0">
              <Button variant="outline" className="w-full" disabled={isUploading}>
                {isUploading ? (
                  <span className="inline-flex items-center justify-center w-full">
                    <SpinnerIcon className="mr-2 animate-spin" />
                    Uploading
                  </span>
                ) : (
                  'Choose file'
                )}
              </Button>
            </div>
          </div>
        </Upload>

        {showPreview && (
          <div className="mt-4 flex items-center justify-between gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-muted/70 flex items-center justify-center">
                <IconPreview iconUrl={iconUrl} alt="Uploaded icon" size="small" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground truncate">Uploaded icon</div>
                <div className="text-xs text-muted-foreground truncate break-all">{iconUrl}</div>
              </div>
            </div>

            <TooltipProvider>
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
                <TooltipContent className="max-w-xs">Remove icon</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    );
  },
);
UploadIconTab.displayName = 'UploadIconTab';
