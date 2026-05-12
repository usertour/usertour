// Image preview component with CSS background loading effect

import { cn } from '@usertour-packages/tailwind';
import { forwardRef, memo } from 'react';
import type { CSSProperties, ImgHTMLAttributes } from 'react';

export interface ImagePreviewProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  url: string;
  style?: CSSProperties;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
}

export const ImagePreview = memo(
  forwardRef<HTMLImageElement, ImagePreviewProps>(
    ({ url, style, isLoaded, onLoad, onError, className, ...props }, ref) => (
      <img
        ref={ref}
        src={url}
        style={style}
        className={cn('cursor-pointer', !isLoaded && 'min-h-40 animate-pulse bg-muted', className)}
        alt="Editable content"
        onLoad={onLoad}
        onError={onError}
        {...props}
      />
    ),
  ),
);

ImagePreview.displayName = 'ImagePreview';
