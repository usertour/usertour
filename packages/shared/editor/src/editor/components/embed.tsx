import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-packages/button';
import { Checkbox } from '@usertour-packages/checkbox';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { VideoIcon } from '@usertour-packages/icons';
import {
  ArrowRightIcon,
  DeleteIcon,
  InsertColumnLeftIcon,
  InsertColumnRightIcon,
} from '@usertour-packages/icons';
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
  QuestionTooltip,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ContentOmbedInfo } from '@usertour/types';
import { ChangeEvent, useCallback, useMemo, useState, forwardRef } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
/* eslint-disable @next/next/no-img-element */
import {
  ContentEditorElementInsertDirection,
  ContentEditorEmebedElement,
  ContentEditorMargin,
  ContentEditorWidth,
  ContentEditorHeight,
} from '../../types/editor';

// Constants
const MARGIN_KEY_MAPPING = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
} as const;

const DEFAULT_WIDTH = 100;
const DEFAULT_HEIGHT = 100;
const DEFAULT_EMBED_SIZE = 200;
const DEFAULT_DIMENSION_TYPE: DimensionType = 'percent';

// Types
type MarginKey = keyof typeof MARGIN_KEY_MAPPING;
type DimensionType = 'percent' | 'pixels';

// Utility functions
const ensureDimensionWithDefaults = (
  dimension?: ContentEditorWidth | ContentEditorHeight,
): ContentEditorWidth | ContentEditorHeight => ({
  type: dimension?.type || DEFAULT_DIMENSION_TYPE,
  value: dimension?.value,
});

const calculateAspectRatio = (width?: number, height?: number): number => {
  if (!width || !height) return 0;
  return height / width;
};

const transformsStyle = (element: ContentEditorEmebedElement): React.CSSProperties => {
  const style: React.CSSProperties = {};
  const aspectRatio = calculateAspectRatio(element.oembed?.width, element.oembed?.height);

  // Handle width
  if (!element.width || element.width?.type === 'percent') {
    const width = element?.width?.value ?? DEFAULT_WIDTH;
    style.width = `calc(${width}% + 0px)`;

    if (aspectRatio > 0) {
      style.height = '0px';
      style.paddingBottom = `calc(${aspectRatio * width}% + 0px)`;
    }
  } else if (element?.width?.value) {
    style.width = `${element.width.value}px`;
    style.height = aspectRatio ? `${element.width.value * aspectRatio}px` : '100%';
    style.paddingBottom = '0px';
  }

  // Handle height
  if (!element.height || element.height?.type === 'percent') {
    const height = element?.height?.value ?? DEFAULT_HEIGHT;
    style.height = `calc(${height}% + 0px)`;
    style.paddingBottom = '0px';
  } else if (element?.height?.value) {
    style.height = `${element.height.value}px`;
    style.paddingBottom = '0px';
  }

  // Handle margins
  if (element.margin) {
    for (const [key, marginName] of Object.entries(MARGIN_KEY_MAPPING)) {
      const marginKey = key as MarginKey;
      const marginValue = element.margin?.[marginKey];

      if (marginValue !== undefined) {
        if (element.margin.enabled) {
          (style as any)[marginName] = `${marginValue}px`;
        } else {
          (style as any)[marginName] = undefined;
        }
      }
    }
  }

  return style;
};

// Reusable components
const EmbedContent = forwardRef<
  HTMLDivElement,
  {
    element: ContentEditorEmebedElement;
    isReadOnly?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>(({ element, isReadOnly = false, ...props }, ref) => {
  const containerStyle = useMemo(
    () => ({
      position: 'relative' as const,
      ...transformsStyle(element),
    }),
    [element],
  );

  const innerStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      top: '0px',
      left: '0px',
      display: 'block' as const,
      width: '100%',
      height: '100%',
    }),
    [],
  );

  const sanitizedHtml = useMemo(() => {
    if (element.oembed?.html) {
      return element.oembed.html
        .replace(/width=[0-9,\"\']+/, 'width="100%"')
        .replace(/height=[0-9,\"\']+/, 'height="100%"');
    }
    return null;
  }, [element.oembed?.html]);

  if (element.oembed?.html && element.parsedUrl) {
    return (
      <div ref={ref} style={containerStyle} {...props}>
        <div
          style={innerStyle}
          className={
            isReadOnly ? '' : '[&>iframe]:pointer-events-none [&>video]:pointer-events-none'
          }
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Sanitized HTML from oembed
          dangerouslySetInnerHTML={{ __html: sanitizedHtml! }}
        />
      </div>
    );
  }

  if (element.parsedUrl) {
    const iframeStyle: React.CSSProperties | undefined = isReadOnly
      ? undefined
      : {
          display: 'block',
          pointerEvents: 'none',
        };

    return (
      <div ref={ref} style={containerStyle} {...props}>
        <iframe
          src={element.parsedUrl}
          width="100%"
          height="100%"
          frameBorder="0"
          allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={true}
          tabIndex={-1}
          style={iframeStyle}
          title="embed"
        />
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="flex items-center justify-center cursor-pointer w-full h-full"
      {...props}
    >
      <VideoIcon
        className="fill-slate-300"
        width={DEFAULT_EMBED_SIZE}
        height={DEFAULT_EMBED_SIZE}
      />
    </div>
  );
});

EmbedContent.displayName = 'EmbedContent';

const DimensionControl = ({
  label,
  value,
  type,
  onValueChange,
  onTypeChange,
  placeholder,
}: {
  label: string;
  value?: number;
  type?: DimensionType;
  onValueChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onTypeChange: (type: string) => void;
  placeholder: string;
}) => {
  const dimension = ensureDimensionWithDefaults({ type, value });

  return (
    <>
      <Label htmlFor={`${label.toLowerCase()}-input`}>{label}</Label>
      <div className="flex gap-x-2">
        <Input
          id={`${label.toLowerCase()}-input`}
          type="number"
          value={dimension.value ?? ''}
          placeholder={placeholder}
          onChange={onValueChange}
          className="bg-background grow"
        />
        <Select onValueChange={onTypeChange} value={dimension.type}>
          <SelectTrigger className="shrink w-56">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectPortal style={{ zIndex: EDITOR_SELECT }}>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="percent">%</SelectItem>
                <SelectItem value="pixels">pixels</SelectItem>
              </SelectGroup>
            </SelectContent>
          </SelectPortal>
        </Select>
      </div>
    </>
  );
};

const MarginControl = ({
  margin,
  onValueChange,
  onCheckedChange,
}: {
  margin?: ContentEditorMargin;
  onValueChange: (e: ChangeEvent<HTMLInputElement>, position: string) => void;
  onCheckedChange: (checked: boolean) => void;
}) => (
  <>
    <div className="flex gap-x-2">
      <Checkbox id="margin" checked={margin?.enabled} onCheckedChange={onCheckedChange} />
      <Label htmlFor="margin">Margin</Label>
    </div>
    {margin?.enabled && (
      <div className="flex gap-x-2">
        <div className="flex flex-col justify-center">
          <Input
            value={margin?.left ?? ''}
            placeholder="Left"
            onChange={(e) => onValueChange(e, 'left')}
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center gap-y-2">
          <Input
            value={margin?.top ?? ''}
            onChange={(e) => onValueChange(e, 'top')}
            placeholder="Top"
            className="bg-background flex-none w-20"
          />
          <Input
            value={margin?.bottom ?? ''}
            onChange={(e) => onValueChange(e, 'bottom')}
            placeholder="Bottom"
            className="bg-background flex-none w-20"
          />
        </div>
        <div className="flex flex-col justify-center">
          <Input
            value={margin?.right ?? ''}
            placeholder="Right"
            onChange={(e) => onValueChange(e, 'right')}
            className="bg-background flex-none w-20"
          />
        </div>
      </div>
    )}
  </>
);

const ActionButtons = ({
  onDelete,
  onAddLeft,
  onAddRight,
}: {
  onDelete: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
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
          >
            <DeleteIcon className="fill-red-700" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Delete embed</TooltipContent>
      </Tooltip>
    </TooltipProvider>

    <div className="grow" />
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="flex-none" variant="ghost" size="icon" onClick={onAddLeft}>
            <InsertColumnLeftIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert embed to the left</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="flex-none mx-1 leading-10">Embed URL</div>
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button className="flex-none" variant="ghost" size="icon" onClick={onAddRight}>
            <InsertColumnRightIcon className="fill-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Insert embed to the right</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

// Main component
export interface ContentEditorEmbedProps {
  element: ContentEditorEmebedElement;
  path: number[];
  id: string;
}

export const ContentEditorEmbed = ({ element, path, id }: ContentEditorEmbedProps) => {
  const { zIndex, insertElementInColumn, deleteElementInColumn, updateElement, getOembedInfo } =
    useContentEditorContext();

  const [isLoading, setIsLoading] = useState(false);

  // Memoized handlers
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
    [element, updateElement, id],
  );

  const handleWidthValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const width = ensureDimensionWithDefaults({
        ...element.width,
        value,
        type: element.width?.type as DimensionType,
      });
      updateElement({ ...element, width }, id);
    },
    [element, updateElement, id],
  );

  const handleHeightValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const height = ensureDimensionWithDefaults({
        ...element.height,
        value,
        type: element.height?.type as DimensionType,
      });
      updateElement({ ...element, height }, id);
    },
    [element, updateElement, id],
  );

  const handleHeightTypeChange = useCallback(
    (type: string) => {
      const height = ensureDimensionWithDefaults({
        ...element.height,
        type: type as DimensionType,
      });
      updateElement({ ...element, height }, id);
    },
    [element, updateElement, id],
  );

  const handleMarginValueChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>, position: string) => {
      const value = Number(e.target.value);
      const margin: ContentEditorMargin = {
        ...element.margin,
        [position]: value,
        enabled: element.margin?.enabled ?? false,
      };
      updateElement({ ...element, margin }, id);
    },
    [element, updateElement, id],
  );

  const handleMarginCheckedChange = useCallback(
    (checked: boolean) => {
      const margin: ContentEditorMargin = {
        ...element.margin,
        enabled: checked,
      };
      updateElement({ ...element, margin }, id);
    },
    [element, updateElement, id],
  );

  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateElement({ ...element, url: value }, id);
    },
    [element, updateElement, id],
  );

  const handleSubmitUrl = useCallback(async () => {
    if (!element.url.trim()) return;

    setIsLoading(true);
    try {
      let oembed: ContentOmbedInfo | undefined;
      if (getOembedInfo) {
        const resp = await getOembedInfo(element.url);
        if (resp) {
          oembed = { ...resp };
        }
      }

      const updatedElement = { ...element, parsedUrl: element.url };
      if (oembed) {
        updatedElement.oembed = oembed;

        // If oembed returns width and height, and element.height is not set,
        // set element.height to oembed height with pixels type
        // and element.width to 100 with percent type
        if (oembed.width && oembed.height) {
          updatedElement.height = {
            type: 'pixels',
            value: oembed.height,
          };
          updatedElement.width = {
            type: 'percent',
            value: 100,
          };
        }
      }

      updateElement(updatedElement, id);
    } catch (error) {
      console.error('Failed to load embed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [element, getOembedInfo, updateElement, id]);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <EmbedContent element={element} isReadOnly={false} />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
          side="right"
          align="start"
          style={{ zIndex }}
          sideOffset={10}
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-row space-x-1">
              <Label htmlFor="embed-url">Embed URL</Label>
              <QuestionTooltip>
                Enter the URL of any content you want to embed. This could be a YouTube video, a
                form, documentation, a website, or even a direct link to a video file. We support
                most embeddable content from the web.
              </QuestionTooltip>
            </div>
            <div className="flex gap-x-2">
              <Input
                id="embed-url"
                placeholder="Enter URL"
                value={element.url}
                onChange={handleUrlChange}
                className="bg-background w-80"
                disabled={isLoading}
              />
              <Button
                className="flex-none"
                variant="ghost"
                size="default"
                onClick={handleSubmitUrl}
                disabled={isLoading || !element.url.trim()}
              >
                <ArrowRightIcon className="mr-1" />
                {isLoading ? 'Loading...' : 'Load'}
              </Button>
            </div>

            <DimensionControl
              label="Display width"
              value={element.width?.value}
              type={element.width?.type as DimensionType}
              onValueChange={handleWidthValueChange}
              onTypeChange={handleWidthTypeChange}
              placeholder="Display width"
            />

            <DimensionControl
              label="Display height"
              value={element.height?.value}
              type={element.height?.type as DimensionType}
              onValueChange={handleHeightValueChange}
              onTypeChange={handleHeightTypeChange}
              placeholder="Display height"
            />

            <MarginControl
              margin={element.margin}
              onValueChange={handleMarginValueChange}
              onCheckedChange={handleMarginCheckedChange}
            />

            <ActionButtons
              onDelete={handleDelete}
              onAddLeft={handleAddLeft}
              onAddRight={handleAddRight}
            />
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ContentEditorEmbed.displayName = 'ContentEditorEmbed';

// Serialize component
export type ContentEditorEmbedSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorEmebedElement;
};

export const ContentEditorEmbedSerialize = ({ element }: ContentEditorEmbedSerializeType) => {
  return <EmbedContent element={element} isReadOnly />;
};

ContentEditorEmbedSerialize.displayName = 'ContentEditorEmbedSerialize';
