import { Button, useToast } from '@usertour/ui';
import { RiDeleteBinFill, RiImageLine, RiUpload2Fill, SpinnerIcon } from '@usertour/icons';
import Upload from 'rc-upload';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useImageUpload } from './use-image-upload';

const ACCEPT_IMAGE_TYPES = 'image/svg+xml,image/png,image/jpeg';

type UploadOption = {
  file: File | Blob | string;
  onError?: (error: Error, body?: unknown) => void;
  onSuccess?: (body: { url: string }) => void;
};

export interface ImageUploadWidgetProps {
  value: string | undefined;
  onChange: (url: string) => void;
  description?: string;
  maxSizeBytes?: number;
  previewAspect?: 'square' | 'wide';
  /**
   * `dropzone` (default) is the large dashed drop area for builder image
   * fields where the image is the primary content. `inline` is a compact
   * thumbnail + buttons row, sized for a secondary settings field (a logo).
   */
  layout?: 'dropzone' | 'inline';
  disabled?: boolean;
}

export const ImageUploadWidget = (props: ImageUploadWidgetProps) => {
  const {
    value,
    onChange,
    description,
    maxSizeBytes,
    previewAspect = 'square',
    layout = 'dropzone',
    disabled = false,
  } = props;
  const { toast } = useToast();
  const { t } = useTranslation();
  const { handleUpload, isUploading } = useImageUpload({
    onUploadSuccess: (url) => onChange(url),
  });

  const handleFile = useCallback(
    (option: UploadOption) => {
      const file = option.file;
      if (!(file instanceof File)) {
        toast({ variant: 'destructive', title: t('components.upload.invalidImageFile') });
        option.onError?.(new Error('Invalid file type'));
        return;
      }
      if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
        toast({ variant: 'destructive', title: t('components.upload.unsupportedImageType') });
        option.onError?.(new Error('Unsupported file type'));
        return;
      }
      if (maxSizeBytes && file.size > maxSizeBytes) {
        const mb = Math.round(maxSizeBytes / 1024 / 1024);
        toast({
          variant: 'destructive',
          title: t('components.upload.maxFileSizeExceeded', { mb }),
        });
        option.onError?.(new Error('File too large'));
        return;
      }
      handleUpload(option);
    },
    [handleUpload, maxSizeBytes, toast],
  );

  const previewSizeClass = previewAspect === 'wide' ? 'h-12 w-24' : 'h-12 w-12';

  if (layout === 'inline') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <RiImageLine className="h-6 w-6 text-muted-foreground/70" />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Upload
              accept={ACCEPT_IMAGE_TYPES}
              customRequest={handleFile}
              disabled={disabled || isUploading}
              className="inline-block"
            >
              <Button type="button" variant="outline" size="sm" disabled={disabled || isUploading}>
                {isUploading ? (
                  <span className="inline-flex items-center">
                    <SpinnerIcon className="mr-2 animate-spin" />
                    {t('components.upload.uploading')}
                  </span>
                ) : value ? (
                  t('components.upload.change')
                ) : (
                  t('components.upload.upload')
                )}
              </Button>
            </Upload>
            {value && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange('')}
                disabled={disabled || isUploading}
              >
                {t('components.upload.remove')}
              </Button>
            )}
          </div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      {description && <p className="mb-3 text-sm text-muted-foreground">{description}</p>}
      <Upload
        accept={ACCEPT_IMAGE_TYPES}
        customRequest={handleFile}
        disabled={disabled || isUploading}
        className="block min-w-0"
      >
        <div
          className={`flex min-w-0 cursor-pointer flex-col items-center gap-3 rounded-md border-2 p-4 transition-colors ${
            disabled || isUploading
              ? 'cursor-not-allowed border-muted/50 bg-muted/30'
              : 'border-dashed border-muted bg-transparent'
          }`}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-muted">
            <RiUpload2Fill className="text-muted-foreground/70" size={20} />
          </div>
          <Button
            variant="outline"
            className="whitespace-nowrap"
            disabled={disabled || isUploading}
          >
            {isUploading ? (
              <span className="inline-flex items-center">
                <SpinnerIcon className="mr-2 animate-spin" />
                {t('components.upload.uploading')}
              </span>
            ) : (
              t('components.upload.chooseFile')
            )}
          </Button>
        </div>
      </Upload>
      {value && (
        <div className="mt-4 flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className={`flex flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted/70 ${previewSizeClass}`}
            >
              <img
                src={value}
                alt="Uploaded"
                className={
                  previewAspect === 'wide'
                    ? 'h-full w-full object-contain'
                    : 'h-full w-full object-cover'
                }
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {t('components.upload.uploadedImage')}
              </div>
              <div className="truncate break-all text-sm text-muted-foreground">{value}</div>
            </div>
          </div>
          <Button
            className="flex-none hover:bg-destructive/10"
            variant="ghost"
            size="icon"
            onClick={() => onChange('')}
            disabled={disabled}
          >
            <RiDeleteBinFill className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </div>
  );
};
