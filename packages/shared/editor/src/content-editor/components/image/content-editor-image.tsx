// Main editable image component

/* eslint-disable @next/next/no-img-element */
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { useToast } from '@usertour-packages/use-toast';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import {
  ContentEditorElementInsertDirection,
  ContentEditorImageElement,
} from '../../../types/editor';
import {
  DEFAULT_IMAGE_SIZE,
  DEFAULT_WIDTH,
  IMAGE_WIDTH_TYPE_OPTIONS,
  WIDTH_TYPES,
} from '../../constants';
import { useImageUpload } from '../../hooks';
import { LoadingSpinner, MarginControls, WidthControls } from '../../shared';
import type { DimensionType, MarginPosition, MarginStyleProps } from '../../types';
import { ensureDimensionWithDefaults, getWidthStyle, transformMarginStyle } from '../../utils';
import { ImageActionButtons } from './image-action-buttons';
import { ImagePreview } from './image-preview';
import { ImageUploadArea } from './image-upload-area';

// Types
interface ImageStyle extends MarginStyleProps {
  width?: string;
}

// Utility function for transforming element to style
const transformsStyle = (element: ContentEditorImageElement): ImageStyle => {
  const style: ImageStyle = {};

  // Handle width - only process if element.width exists (preserve backward compatibility)
  if (element.width) {
    const width = ensureDimensionWithDefaults(element.width);
    const widthStyle = getWidthStyle(width);
    if (widthStyle) {
      style.width = widthStyle;
    } else if (element.width.type === WIDTH_TYPES.PERCENT) {
      // Default to 100% if type is percent but no value
      style.width = `${DEFAULT_WIDTH}%`;
    }
  }

  // Handle margins using shared utility
  const marginStyle = transformMarginStyle(element.margin);
  return { ...style, ...marginStyle };
};

export interface ContentEditorImageProps {
  element: ContentEditorImageElement;
  path: number[];
  id: string;
}

export const ContentEditorImage = memo((props: ContentEditorImageProps) => {
  const { element, path, id } = props;
  const {
    zIndex,
    customUploadRequest,
    insertElementInColumn,
    deleteElementInColumn,
    updateElement,
  } = useContentEditorContext();
  const { toast } = useToast();
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // Reset image loaded state when URL changes
  useEffect(() => {
    if (element.url) {
      setIsImageLoaded(false);
    }
  }, [element.url]);

  // Memoized style calculation
  const imageStyle = useMemo(() => transformsStyle(element), [element.width, element.margin]);

  // Upload success handler
  const handleUploadSuccess = useCallback(
    (url: string) => {
      // Set default width to 100% if not already set
      const updatedElement = {
        ...element,
        url,
        width: element.width ?? { type: WIDTH_TYPES.PERCENT, value: DEFAULT_WIDTH },
      };
      updateElement(updatedElement, id);
    },
    [element, id, updateElement],
  );

  // Use image upload hook
  const { upload, isLoading } = useImageUpload({
    customUploadRequest,
    onSuccess: handleUploadSuccess,
  });

  // Event handlers
  const handleDelete = useCallback(() => {
    deleteElementInColumn(path);
  }, [deleteElementInColumn, path]);

  const handleAddLeft = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.LEFT);
  }, [insertElementInColumn, element, path]);

  const handleAddRight = useCallback(() => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.RIGHT);
  }, [insertElementInColumn, element, path]);

  const handleWidthTypeChange = useCallback(
    (type: string) => {
      const width = ensureDimensionWithDefaults({
        ...element.width,
        type: type as DimensionType,
      });
      updateElement({ ...element, width }, id);
    },
    [element, id, updateElement],
  );

  const handleWidthValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const width = ensureDimensionWithDefaults({
        ...element.width,
        value,
        type: element.width?.type as DimensionType,
      });
      updateElement({ ...element, width }, id);
    },
    [element, id, updateElement],
  );

  const handleMarginValueChange = useCallback(
    (position: MarginPosition, value: string) => {
      const numericValue = value === '' ? 0 : Number(value);
      const margin = { ...element.margin, [position]: numericValue };
      updateElement({ ...element, margin } as ContentEditorImageElement, id);
    },
    [element, id, updateElement],
  );

  const handleMarginCheckedChange = useCallback(
    (enabled: boolean) => {
      updateElement({ ...element, margin: { ...element.margin, enabled } }, id);
    },
    [element, id, updateElement],
  );

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoaded(true);
    toast({ variant: 'destructive', title: 'Failed to load image' });
  }, [toast]);

  // Render loading state
  if (isLoading && element.url) {
    return <LoadingSpinner size={DEFAULT_IMAGE_SIZE} />;
  }

  // Render upload area when no image URL
  if (!element.url) {
    return <ImageUploadArea isLoading={isLoading} onUpload={upload} />;
  }

  // Render image with popover
  return (
    <Popover>
      <PopoverTrigger asChild>
        <ImagePreview
          url={element.url}
          style={imageStyle}
          isLoaded={isImageLoaded}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      </PopoverTrigger>
      <PopoverContent
        className="bg-background"
        side="right"
        style={{ zIndex: zIndex }}
        sideOffset={10}
      >
        <div className="flex flex-col gap-2.5">
          <WidthControls
            label="Image width"
            value={ensureDimensionWithDefaults(element.width)}
            options={IMAGE_WIDTH_TYPE_OPTIONS}
            onTypeChange={handleWidthTypeChange}
            onValueChange={handleWidthValueChange}
            zIndex={zIndex}
            inputPlaceholder="Image width"
          />

          <MarginControls
            margin={element.margin}
            onMarginChange={handleMarginValueChange}
            onMarginEnabledChange={handleMarginCheckedChange}
          />

          <ImageActionButtons
            onDelete={handleDelete}
            onReplace={upload}
            onAddLeft={handleAddLeft}
            onAddRight={handleAddRight}
            isLoading={isLoading}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
});

ContentEditorImage.displayName = 'ContentEditorImage';
