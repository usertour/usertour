import React from 'react';
import type { IconPreviewProps } from './types';

const SIZE_CLASSES = {
  small: 'w-4 h-4',
  medium: 'w-16 h-16',
  large: 'w-24 h-24',
} as const;

export const IconPreview = React.memo<IconPreviewProps>(({ iconUrl, alt, size = 'medium' }) => {
  const sizeClass = SIZE_CLASSES[size];
  const containerClass = size === 'small' ? '' : 'w-full flex justify-center items-center';

  return (
    <div className={containerClass}>
      <img src={iconUrl} alt={alt} className={`${sizeClass} object-contain`} />
    </div>
  );
});
IconPreview.displayName = 'IconPreview';
