import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { Checkbox } from '@usertour-packages/checkbox';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { ImageEditIcon, ImageIcon, SpinnerIcon } from '@usertour-packages/icons';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-packages/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import Upload from 'rc-upload';
import { useCallback, useMemo, useState } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
/* eslint-disable @next/next/no-img-element */
import {
  ContentEditorElementInsertDirection,
  ContentEditorImageElement,
  ContentEditorUploadRequestOption,
} from '../../types/editor';
import { promiseUploadFunc } from '../../utils/promiseUploadFunc';

// Constants
const MARGIN_KEY_MAPPING = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
} as const;

const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
} as const;

const MARGIN_POSITIONS = ['left', 'top', 'bottom', 'right'] as const;

const DEFAULT_IMAGE_SIZE = 160; // 40 * 4 (w-40 h-40)
const DEFAULT_SPINNER_SIZE = 40; // h-10 w-10
const DEFAULT_WIDTH = 100;
const DEFAULT_DIMENSION_TYPE: DimensionType = 'percent';

// Types
type MarginPosition = keyof typeof MARGIN_KEY_MAPPING;
type DimensionType = 'percent' | 'pixels';

interface ImageStyle {
  width?: string;
  marginLeft?: string;
  marginTop?: string;
  marginBottom?: string;
  marginRight?: string;
}

// Utility functions
const ensureDimensionWithDefaults = (dimension?: { type?: string; value?: number }): {
  type: DimensionType;
  value?: number;
} => ({
  type: (dimension?.type as DimensionType) || DEFAULT_DIMENSION_TYPE,
  value: dimension?.value,
});

const transformsStyle = (element: ContentEditorImageElement): ImageStyle => {
  const style: ImageStyle = {};

  // Handle width with defaults
  const width = ensureDimensionWithDefaults(element.width);
  if (width.value) {
    style.width = width.type === WIDTH_TYPES.PERCENT ? `${width.value}%` : `${width.value}px`;
  } else if (element.width?.type === WIDTH_TYPES.PERCENT) {
    // Default to 100% if type is percent but no value
    style.width = `${DEFAULT_WIDTH}%`;
  }

  // Handle margins
  if (element.margin) {
    for (const position of MARGIN_POSITIONS) {
      const marginName = MARGIN_KEY_MAPPING[position];
      if (element.margin?.[position]) {
        style[marginName] = element.margin.enabled ? `${element.margin[position]}px` : undefined;
      }
    }
  }

  return style;
};

// Loading component
const LoadingSpinner = ({ size = DEFAULT_SPINNER_SIZE }: { size?: number }) => (
  <div className="flex items-center justify-center" style={{ width: size, height: size }}>
    <SpinnerIcon className="animate-spin" style={{ width: size / 4, height: size / 4 }} />
  </div>
);

// Margin controls component
const MarginControls = ({
  element,
  onMarginChange,
  onMarginEnabledChange,
}: {
  element: ContentEditorImageElement;
  onMarginChange: (position: MarginPosition, value: string) => void;
  onMarginEnabledChange: (enabled: boolean) => void;
}) => (
  <>
    <div className="flex gap-x-2">
      <Checkbox
        id="margin"
        checked={element.margin?.enabled}
        onCheckedChange={onMarginEnabledChange}
      />
      <Label htmlFor="margin">Margin</Label>
    </div>
    {element.margin?.enabled && (
      <div className="flex gap-x-2">
        <div className="flex flex-col justify-center">
          <Input
            value={element.margin?.left}
            placeholder="Left"
            onChange={(e) => onMarginChange('left', e.target.value)}
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center gap-y-2">
          <Input
            value={element.margin?.top}
            onChange={(e) => onMarginChange('top', e.target.value)}
            placeholder="Top"
            className="bg-background flex-none w-20"
          />
          <Input
            value={element.margin?.bottom}
            onChange={(e) => onMarginChange('bottom', e.target.value)}
            placeholder="Bottom"
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center">
          <Input
            value={element.margin?.right}
            placeholder="Right"
            onChange={(e) => onMarginChange('right', e.target.value)}
            className="bg-background flex-none w-20"
          />
        </div>
      </div>
    )}
  </>
);

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
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none hover:bg-red-200"
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={isLoading}
          >
            <DeleteIcon className="fill-red-500" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Delete image</TooltipContent>
      </Tooltip>
    </TooltipProvider>

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

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none"
            variant="ghost"
            size="icon"
            onClick={onAddLeft}
            disabled={isLoading}
          >
            <InsertColumnLeftIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert image to the left</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div className="flex-none mx-1 leading-10">Insert image</div>

    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none"
            variant="ghost"
            size="icon"
            onClick={onAddRight}
            disabled={isLoading}
          >
            <InsertColumnRightIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert image to the right</TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Memoized style calculation
  const imageStyle = useMemo(() => transformsStyle(element), [element.width, element.margin]);

  // Upload handler
  const insertImg = useCallback(
    async (option: ContentEditorUploadRequestOption) => {
      try {
        setError(null);
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
          updateElement({ ...element, url }, id);
        } else {
          setError('Failed to upload image');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [customUploadRequest, element, id, updateElement],
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

  // Render image with popover
  const renderImageWithPopover = () => (
    <Popover.Root>
      <Popover.Trigger asChild>
        <img
          src={element.url}
          style={imageStyle}
          className="cursor-pointer"
          alt="Editable content"
          onError={() => setError('Failed to load image')}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
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
                className="bg-background flex-none w-[120px]"
              />
              <Select
                onValueChange={handleWidthTypeChange}
                value={ensureDimensionWithDefaults(element.width).type}
              >
                <SelectTrigger className="shrink">
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectPortal style={{ zIndex: zIndex + EDITOR_SELECT }}>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value={WIDTH_TYPES.PERCENT}>%</SelectItem>
                      <SelectItem value={WIDTH_TYPES.PIXELS}>pixels</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </SelectPortal>
              </Select>
            </div>

            <MarginControls
              element={element}
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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

  return (
    <div className="group relative flex max-w-lg flex-col">
      {error && <div className="mb-2 text-sm text-red-500">{error}</div>}

      {element.url ? (
        isLoading ? (
          <LoadingSpinner size={DEFAULT_IMAGE_SIZE} />
        ) : (
          renderImageWithPopover()
        )
      ) : (
        renderUploadArea()
      )}
    </div>
  );
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
    <div className="group relative flex max-w-lg flex-col">
      <img src={element.url} style={transformsStyle(element)} className={className} alt="Content" />
    </div>
  );
};

ContentEditorImageSerialize.displayName = 'ContentEditorImageSerialize';
