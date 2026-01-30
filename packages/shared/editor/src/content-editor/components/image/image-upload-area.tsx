// Image upload area component with placeholder

import { ImageIcon } from '@usertour-packages/icons';
import Upload from 'rc-upload';
import { memo, useCallback } from 'react';

import type { ContentEditorUploadRequestOption } from '../../../types/editor';
import { DEFAULT_IMAGE_SIZE } from '../../constants/styles';
import { LoadingSpinner } from '../../shared';

export interface ImageUploadAreaProps {
  isLoading: boolean;
  onUpload: (option: ContentEditorUploadRequestOption) => Promise<void>;
}

export const ImageUploadArea = memo(({ isLoading, onUpload }: ImageUploadAreaProps) => {
  const handleCustomRequest = useCallback(
    (option: unknown) => {
      (async () => {
        await onUpload(option as ContentEditorUploadRequestOption);
      })();
    },
    [onUpload],
  );

  return (
    <Upload accept="image/*" disabled={isLoading} customRequest={handleCustomRequest}>
      {isLoading ? (
        <LoadingSpinner size={DEFAULT_IMAGE_SIZE} />
      ) : (
        <ImageIcon
          className="fill-slate-300"
          style={{ width: DEFAULT_IMAGE_SIZE, height: DEFAULT_IMAGE_SIZE }}
        />
      )}
    </Upload>
  );
});

ImageUploadArea.displayName = 'ImageUploadArea';
