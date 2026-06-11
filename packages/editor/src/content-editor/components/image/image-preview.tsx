// Image preview component with CSS background loading effect

import { cn } from '@usertour/tailwind';
import { forwardRef, memo } from 'react';
import type { CSSProperties, ImgHTMLAttributes } from 'react';
import { useTranslation } from 'react-i18next';

export interface ImagePreviewProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  url: string;
  style?: CSSProperties;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
}

export const ImagePreview = memo(
  forwardRef<HTMLImageElement, ImagePreviewProps>(
    ({ url, style, isLoaded, onLoad, onError, className, ...props }, ref) => {
      const { t } = useTranslation();
      return (
        <img
          ref={ref}
          src={url}
          style={style}
          className={cn(
            'cursor-pointer',
            !isLoaded && 'min-h-40 animate-pulse bg-muted',
            className,
          )}
          alt={t('contentBuilder.editor.image.previewAlt')}
          onLoad={onLoad}
          onError={onError}
          {...props}
        />
      );
    },
  ),
);

ImagePreview.displayName = 'ImagePreview';
