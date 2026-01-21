import { Button } from '@usertour-packages/button';
import { ComboBox } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import {
  DeleteIcon,
  ImageEditIcon,
  ImageIcon,
  InsertColumnLeftIcon,
  InsertColumnRightIcon,
} from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverContent, PopoverTrigger } from '@usertour-packages/popover';
import { Skeleton } from '@usertour-packages/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { useToast } from '@usertour-packages/use-toast';
import { getErrorMessage } from '@usertour/helpers';
import Upload from 'rc-upload';
import { useCallback, useEffect, useMemo, useState } from 'react';

/* eslint-disable @next/next/no-img-element */
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorElementInsertDirection,
  ContentEditorImageElement,
  ContentEditorUploadRequestOption,
} from '../../types/editor';
import { promiseUploadFunc } from '../../utils/promiseUploadFunc';
import {
  DEFAULT_IMAGE_SIZE,
  DEFAULT_WIDTH,
  IMAGE_WIDTH_TYPE_OPTIONS,
  WIDTH_TYPES,
} from '../constants';
import { LoadingSpinner, MarginControls, TooltipActionButton } from '../shared';
import type { DimensionType, MarginPosition, MarginStyleProps } from '../types';
import { ensureDimensionWithDefaults, getWidthStyle, transformMarginStyle } from '../utils';

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

// Action buttons component
const ActionButtons = ({
  onDelete,
  onReplace,
  onAddLeft,
  onAddRight,
  isLoading,
}: {
  onDelete: () => void;
  onReplace: (option: ContentEditorUploadRequestOption) => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  isLoading: boolean;
}) => (
  <div className="flex items-center">
    <TooltipActionButton
      tooltip="Delete image"
      icon={<DeleteIcon className="fill-destructive" />}
      onClick={onDelete}
      disabled={isLoading}
      destructive
    />

    {/* Replace image button with Upload component - special case */}
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="flex-none" variant="ghost" size="icon" disabled={isLoading}>
            <Upload
              accept="image/*"
              customRequest={(option) => onReplace(option as ContentEditorUploadRequestOption)}
            >
              <ImageEditIcon className="mx-1 fill-foreground" />
            </Upload>
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Replace image</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div className="grow" />

    <TooltipActionButton
      tooltip="Insert image to the left"
      icon={<InsertColumnLeftIcon className="fill-foreground" />}
      onClick={onAddLeft}
      disabled={isLoading}
    />

    <div className="flex-none mx-1 leading-10">Insert image</div>

    <TooltipActionButton
      tooltip="Insert image to the right"
      icon={<InsertColumnRightIcon className="fill-foreground" />}
      onClick={onAddRight}
      disabled={isLoading}
    />
  </div>
);

// Main editable image component
export interface ContentEditorImageProps {
  element: ContentEditorImageElement;
  path: number[];
  id: string;
}

export const ContentEditorImage = (props: ContentEditorImageProps) => {
  const { element, path, id } = props;
  const {
    zIndex,
    customUploadRequest,
    insertElementInColumn,
    deleteElementInColumn,
    updateElement,
  } = useContentEditorContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);

  // Reset image loaded state when URL changes
  useEffect(() => {
    if (element.url) {
      setIsImageLoaded(false);
    }
  }, [element.url]);

  // Memoized style calculation
  const imageStyle = useMemo(() => transformsStyle(element), [element.width, element.margin]);

  // Upload handler
  const insertImg = useCallback(
    async (option: ContentEditorUploadRequestOption) => {
      try {
        let url = '';

        if (customUploadRequest) {
          url = await customUploadRequest(option.file as File);
        } else {
          const ret = await promiseUploadFunc({
            onProgress: option.onProgress,
            onError: option.onError,
            onSuccess: option.onSuccess,
            file: option.file as File,
          });
          if (ret?.url) {
            url = ret.url;
          }
        }

        if (url) {
          // Set default width to 100% if not already set
          const updatedElement = {
            ...element,
            url,
            width: element.width ?? { type: WIDTH_TYPES.PERCENT, value: DEFAULT_WIDTH },
          };
          updateElement(updatedElement, id);
        } else {
          toast({ variant: 'destructive', title: 'Failed to upload image' });
        }
      } catch (err) {
        toast({ variant: 'destructive', title: getErrorMessage(err) });
      }
    },
    [customUploadRequest, element, id, toast, updateElement],
  );

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
      const margin = { ...element.margin, [position]: value };
      updateElement({ ...element, margin } as any, id);
    },
    [element, id, updateElement],
  );

  const handleMarginCheckedChange = useCallback(
    (enabled: boolean) => {
      updateElement({ ...element, margin: { ...element.margin, enabled } }, id);
    },
    [element, id, updateElement],
  );

  const handleUpload = useCallback(
    async (option: ContentEditorUploadRequestOption) => {
      setIsLoading(true);
      await insertImg(option);
      setIsLoading(false);
    },
    [insertImg],
  );

  const handleImageLoad = useCallback(() => {
    setIsImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setIsImageLoaded(true);
    toast({ variant: 'destructive', title: 'Failed to load image' });
  }, [toast]);

  // Render image with popover
  const renderImageWithPopover = () => (
    <Popover>
      <PopoverTrigger asChild>
        <div
          className="relative cursor-pointer"
          style={{
            ...imageStyle,
            minHeight: isImageLoaded ? undefined : DEFAULT_IMAGE_SIZE,
          }}
        >
          {/* Skeleton placeholder shown during image loading */}
          {!isImageLoaded && <Skeleton className="absolute inset-0" />}
          <img
            src={element.url}
            style={{
              width: '100%',
              opacity: isImageLoaded ? 1 : 0,
              transition: 'opacity 200ms ease-in-out',
            }}
            alt="Editable content"
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="bg-background"
        side="right"
        style={{ zIndex: zIndex }}
        sideOffset={10}
      >
        <div className="flex flex-col gap-2.5">
          <Label htmlFor="image-width">Image width</Label>
          <div className="flex gap-x-2">
            <Input
              id="image-width"
              type="text"
              value={ensureDimensionWithDefaults(element.width).value?.toString() || ''}
              placeholder="Column width"
              onChange={handleWidthValueChange}
              className="bg-background"
            />
            <ComboBox
              options={IMAGE_WIDTH_TYPE_OPTIONS}
              value={ensureDimensionWithDefaults(element.width).type}
              onValueChange={handleWidthTypeChange}
              placeholder="Select type"
              className="flex-none w-20 h-auto px-2"
              contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
            />
          </div>

          <MarginControls
            margin={element.margin}
            onMarginChange={handleMarginValueChange}
            onMarginEnabledChange={handleMarginCheckedChange}
          />

          <ActionButtons
            onDelete={handleDelete}
            onReplace={handleUpload}
            onAddLeft={handleAddLeft}
            onAddRight={handleAddRight}
            isLoading={isLoading}
          />
        </div>
      </PopoverContent>
    </Popover>
  );

  // Render upload area
  const renderUploadArea = () => (
    <Upload
      accept="image/*"
      disabled={isLoading}
      customRequest={(option) => {
        (async () => {
          await handleUpload(option as ContentEditorUploadRequestOption);
        })();
      }}
    >
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

  if (element.url) {
    return isLoading ? <LoadingSpinner size={DEFAULT_IMAGE_SIZE} /> : renderImageWithPopover();
  }

  return renderUploadArea();
};

ContentEditorImage.displayName = 'ContentEditorImage';

// Read-only serialized component for SDK
export type ContentEditorImageSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorImageElement;
};

export const ContentEditorImageSerialize = (props: ContentEditorImageSerializeType) => {
  const { element, className } = props;

  if (!element.url) {
    return null;
  }

  return (
    <img src={element.url} style={transformsStyle(element)} className={className} alt="Content" />
  );
};

ContentEditorImageSerialize.displayName = 'ContentEditorImageSerialize';
