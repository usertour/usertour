import { memo } from 'react';
import { useTranslation } from 'react-i18next';

import Upload from 'rc-upload';
import { Button } from '@usertour/ui';
import { RiDeleteBinFill, RiUpload2Fill, SpinnerIcon } from '@usertour/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour/ui';

import { ACCEPT_FILE_TYPES } from './constants';
import { useAvatarUpload } from './hooks/use-avatar-upload';
import type { UploadAvatarTabProps } from './types';

export const UploadAvatarTab = memo<UploadAvatarTabProps>((props) => {
  const { avatarUrl, isCurrentUpload, onUploadSuccess, onRemove, disabled } = props;
  const { t } = useTranslation();
  const { handleUpload, isUploading } = useAvatarUpload({
    onUploadSuccess,
  });
  const showPreview = isCurrentUpload && avatarUrl;
  const isDisabledOrUploading = disabled || isUploading;
  const uploadedAvatarLabel = t('themeBuilder.actions.uploadedAvatar');

  return (
    <div className="w-full min-w-0 bg-background rounded-lg p-4">
      <div className="mb-3">
        <h4 className="text-sm font-medium text-foreground">
          {t('themeBuilder.actions.uploadAvatarTitle')}
        </h4>
        <p className="text-sm text-muted-foreground">
          {t('themeBuilder.actions.uploadAvatarHint')}
        </p>
      </div>

      <Upload
        accept={ACCEPT_FILE_TYPES}
        customRequest={handleUpload}
        disabled={isDisabledOrUploading}
        className="block min-w-0"
      >
        <div
          className={`w-full min-w-0 rounded-md border-2 ${
            isDisabledOrUploading
              ? 'border-muted/50 bg-muted/30 cursor-not-allowed'
              : 'border-dashed border-muted bg-transparent cursor-pointer'
          } p-4 flex flex-col items-center gap-3 transition-colors`}
          aria-hidden={isUploading}
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-md bg-muted">
            <RiUpload2Fill className="text-muted-foreground/70" size={20} />
          </div>

          <Button variant="outline" className="whitespace-nowrap" disabled={isDisabledOrUploading}>
            {isUploading ? (
              <span className="inline-flex items-center">
                <SpinnerIcon className="mr-2 animate-spin" />
                {t('themeBuilder.actions.uploading')}
              </span>
            ) : (
              t('themeBuilder.actions.chooseFile')
            )}
          </Button>
        </div>
      </Upload>

      {showPreview && (
        <div className="mt-4 flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-muted/70 flex items-center justify-center">
              <img
                src={avatarUrl}
                alt={uploadedAvatarLabel}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground truncate">
                {uploadedAvatarLabel}
              </div>
              <div className="text-sm text-muted-foreground truncate break-all">
                {avatarUrl?.slice(0, 40)}...
              </div>
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
                  disabled={disabled}
                >
                  <RiDeleteBinFill className="text-destructive w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                {t('themeBuilder.actions.removeAvatar')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  );
});
UploadAvatarTab.displayName = 'UploadAvatarTab';
