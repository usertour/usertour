import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
import { EDITOR_SELECT } from '@usertour-ui/constants';
import { VideoIcon } from '@usertour-ui/icons';
import {
  ArrowRightIcon,
  DeleteIcon,
  InsertColumnLeftIcon,
  InsertColumnRightIcon,
} from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectPortal,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { ContentOmbedInfo } from '@usertour-ui/types';
import { ChangeEvent, useCallback } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
/* eslint-disable @next/next/no-img-element */
import {
  ContentEditorElementInsertDirection,
  ContentEditorEmebedElement,
} from '../../types/editor';

const marginKeyMapping = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
};

const transformsStyle = (element: ContentEditorEmebedElement) => {
  const _style: any = {};
  let rate = 0;
  if (element.oembed?.width && element.oembed?.height) {
    rate = element.oembed.height / element.oembed.width;
  }
  if (!element.width || element.width?.type === 'percent') {
    const width = element?.width?.value ? element.width.value : 100;
    _style.width = `calc(${width}% + 0px)`;
    if (element.oembed?.width && element.oembed?.height) {
      _style.height = '0px';
      _style.paddingBottom = `calc(${rate * width}% + 0px)`;
    }
  } else if (element?.width?.value) {
    _style.width = `${element.width.value}px`;
    _style.height = rate ? `${element.width.value * rate}px` : '100%';
    _style.paddingBottom = '0px';
  }

  if (!element.height || element.height?.type === 'percent') {
    const height = element?.height?.value ?? 100;
    _style.height = `calc(${height}% + 0px)`;
    _style.paddingBottom = '0px';
  } else if (element?.height?.value) {
    _style.height = `${element.height.value}px`;
    _style.paddingBottom = '0px';
  }

  if (element.margin) {
    for (const k in marginKeyMapping) {
      const key = k as keyof typeof marginKeyMapping;
      const marginName = marginKeyMapping[key];
      if (element.margin[key]) {
        if (element.margin.enabled) {
          _style[marginName] = `${element.margin[key]}px`;
        } else {
          _style[marginName] = null;
        }
      }
    }
  }

  return _style;
};

export interface ContentEditorEmbedProps {
  element: ContentEditorEmebedElement;
  path: number[];
  id: string;
}
export const ContentEditorEmbed = (props: ContentEditorEmbedProps) => {
  const { element, path, id } = props;
  const { zIndex, insertElementInColumn, deleteElementInColumn, updateElement, getOembedInfo } =
    useContentEditorContext();

  const handleDelete = () => {
    deleteElementInColumn(path);
  };
  const handleAddLeft = () => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.LEFT);
  };
  const handleAddRight = () => {
    insertElementInColumn(element, path, ContentEditorElementInsertDirection.RIGHT);
  };

  const handleWidthTypeChange = useCallback(
    (type: string) => {
      updateElement({ ...element, width: { ...element.width, type } }, id);
    },
    [element],
  );

  const handleWidthValueChange = useCallback(
    (e: any) => {
      const value = e.target.value;
      updateElement({ ...element, width: { ...element.width, value } }, id);
    },
    [element],
  );

  const handleHeightValueChange = useCallback(
    (e: any) => {
      const value = e.target.value;
      updateElement({ ...element, height: { ...element.height, value } }, id);
    },
    [element],
  );

  const handleHeightTypeChange = useCallback(
    (type: string) => {
      updateElement({ ...element, height: { ...element.height, type } }, id);
    },
    [element],
  );

  const handleMarginValueChange = useCallback(
    (e: any, position: string) => {
      const value = e.target.value;
      const margin = { ...element.margin, [position]: value } as any;
      updateElement({ ...element, margin }, id);
    },
    [element],
  );

  const handleMarginCheckedChange = useCallback(
    (checked: boolean) => {
      updateElement({ ...element, margin: { ...element.margin, enabled: checked } }, id);
    },
    [element],
  );

  const handleUrlChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      updateElement({ ...element, url: value }, id);
    },
    [element],
  );

  const handleSubmitUrl = useCallback(async () => {
    let oembed: ContentOmbedInfo | undefined;
    if (getOembedInfo) {
      const resp = await getOembedInfo(element.url);
      if (resp) {
        oembed = { ...resp };
      }
    }
    const _element = { ...element, parsedUrl: element.url };
    if (oembed) {
      _element.oembed = oembed;
    }
    updateElement(_element, id);
  }, [element]);

  return (
    <Popover.Root>
      {element.oembed?.html && element.parsedUrl && (
        <Popover.Trigger asChild>
          <div
            style={{
              position: 'relative',
              ...transformsStyle(element),
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '0px',
                left: '0px',
                display: 'block',
                width: '100%',
                height: '100%',
              }}
              className="[&>iframe]:pointer-events-none [&>video]:pointer-events-none	 "
              // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
              dangerouslySetInnerHTML={{
                __html: element.oembed.html
                  .replace(/width=[0-9,\"\']+/, 'width="100%"')
                  .replace(/height=[0-9,\"\']+/, 'height="100%"'),
              }}
            />
          </div>
        </Popover.Trigger>
      )}
      {!element.oembed?.html && element.parsedUrl && (
        <Popover.Trigger asChild>
          <div style={{ position: 'relative', ...transformsStyle(element) }}>
            <iframe
              src={element.parsedUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen={true}
              // allowTransparency={true}
              tabIndex={-1}
              style={{ display: 'block', pointerEvents: 'none' }}
              title="embed"
            />
          </div>
        </Popover.Trigger>
      )}
      {!element.parsedUrl && (
        <Popover.Trigger asChild>
          <VideoIcon className="fill-slate-300" width={200} height={200} />
        </Popover.Trigger>
      )}
      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
          side="right"
          align="start"
          style={{ zIndex: zIndex }}
          sideOffset={10}
        >
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="button-text">Embed URL</Label>
            <div className="flex gap-x-2">
              <Input
                placeholder="Enter url"
                value={element.url}
                onChange={handleUrlChange}
                className="bg-background w-80 "
              />
              <Button
                className="flex-none "
                variant="ghost"
                size="default"
                onClick={handleSubmitUrl}
              >
                <ArrowRightIcon className="mr-1 " />
                Load
              </Button>
            </div>
            <Label htmlFor="button-text">Display width</Label>
            <div className="flex gap-x-2">
              <Input
                type="width"
                value={element.width?.value}
                placeholder="Display width"
                onChange={handleWidthValueChange}
                className="bg-background grow "
              />
              <Select
                onValueChange={handleWidthTypeChange}
                defaultValue={element.width?.type ?? 'percent'}
              >
                <SelectTrigger className="shrink w-56">
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectPortal style={{ zIndex: zIndex + EDITOR_SELECT }}>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="pixels">pixels</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </SelectPortal>
              </Select>
            </div>
            <Label htmlFor="button-text">Display height</Label>
            <div className="flex gap-x-2">
              <Input
                type="height"
                value={element.height?.value}
                placeholder="Display height"
                onChange={handleHeightValueChange}
                className="bg-background grow "
              />
              <Select
                onValueChange={handleHeightTypeChange}
                defaultValue={element.height?.type ?? 'percent'}
              >
                <SelectTrigger className="shrink w-56">
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectPortal style={{ zIndex: zIndex + EDITOR_SELECT }}>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="pixels">pixels</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </SelectPortal>
              </Select>
            </div>
            <div className="flex gap-x-2">
              <Checkbox
                id="margin"
                checked={element.margin?.enabled}
                onCheckedChange={handleMarginCheckedChange}
              />
              <Label htmlFor="margin">Margin</Label>
            </div>
            {element.margin?.enabled && (
              <div className="flex gap-x-2">
                <div className="flex flex-col justify-center">
                  <Input
                    value={element.margin?.left}
                    placeholder="Left"
                    onChange={(e) => {
                      handleMarginValueChange(e, 'left');
                    }}
                    className="bg-background flex-none w-20"
                  />
                </div>
                <div className="flex flex-col justify-center gap-y-2">
                  <Input
                    value={element.margin?.top}
                    onChange={(e) => {
                      handleMarginValueChange(e, 'top');
                    }}
                    placeholder="Top"
                    className="bg-background flex-none w-20"
                  />
                  <Input
                    value={element.margin?.bottom}
                    onChange={(e) => {
                      handleMarginValueChange(e, 'bottom');
                    }}
                    placeholder="Bottom"
                    className="bg-background flex-none w-20"
                  />
                </div>
                <div className="flex flex-col justify-center">
                  <Input
                    value={element.margin?.right}
                    placeholder="Right"
                    onChange={(e) => {
                      handleMarginValueChange(e, 'right');
                    }}
                    className="bg-background flex-none w-20"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="flex-none hover:bg-red-200"
                      variant="ghost"
                      size="icon"
                      onClick={handleDelete}
                    >
                      <DeleteIcon className="fill-red-700" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Delete embed</p>
                  </TooltipContent>
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
                      onClick={handleAddLeft}
                    >
                      <InsertColumnLeftIcon className="fill-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Insert embed to the left</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-none mx-1 leading-10">Embed URL</div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="flex-none"
                      variant="ghost"
                      size="icon"
                      onClick={handleAddRight}
                    >
                      <InsertColumnRightIcon className="fill-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Insert embed to the right</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          {/* <Popover.Arrow className="fill-slate-900" /> */}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

ContentEditorEmbed.displayName = 'ContentEditorEmbed';

export type ContentEditorEmbedSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorEmebedElement;
};

export const ContentEditorEmbedSerialize = (props: ContentEditorEmbedSerializeType) => {
  const { element } = props;

  return (
    <>
      {' '}
      {element.oembed?.html && element.parsedUrl && (
        <div
          style={{
            position: 'relative',
            ...transformsStyle(element),
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '0px',
              left: '0px',
              display: 'block',
              width: '100%',
              height: '100%',
            }}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: <explanation>
            dangerouslySetInnerHTML={{
              __html: element.oembed.html
                .replace(/width=[0-9,\"\']+/, 'width="100%"')
                .replace(/height=[0-9,\"\']+/, 'height="100%"'),
            }}
          />
        </div>
      )}
      {!element.oembed?.html && element.parsedUrl && (
        <div style={{ position: 'relative', ...transformsStyle(element) }}>
          <iframe
            src={element.parsedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={true}
            // allowTransparency={true}
            tabIndex={-1}
            title="embed"
          />
        </div>
      )}
      {!element.parsedUrl && <VideoIcon className="fill-slate-300" width={200} height={200} />}
    </>
  );
};

ContentEditorEmbedSerialize.displayName = 'ContentEditorEmbedSerialize';
