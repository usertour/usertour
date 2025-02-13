import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
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
import { CSSProperties, ChangeEvent, useEffect, useState } from 'react';
/* eslint-disable @next/next/no-img-element */
import { Path, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { EmbedElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

const marginKeyMapping = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
};

const transformsStyle = (element: EmbedElementType) => {
  const _style: any = {};
  if (element.width?.value) {
    if (element.width?.type === 'percent') {
      _style.width = `${element.width.value}%`;
    } else {
      _style.width = `${element.width.value}px`;
    }
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
export const EmbedElement = (props: RenderElementProps) => {
  const editor = useSlateStatic();
  const element = props.element as EmbedElementType;
  const { zIndex } = usePopperEditorContext();
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const handleDelete = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.removeNodes(editor, {
      at: path,
    });
  };
  const handleAddLeft = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(
      editor,
      {
        type: 'embed',
        url: '',
        width: { type: 'percent', value: 100 },
        children: [{ text: '' }],
      },
      {
        at: path,
      },
    );
  };
  const handleAddRight = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(
      editor,
      {
        type: 'embed',
        url: '',
        width: { type: 'percent', value: 100 },
        children: [{ text: '' }],
      },
      {
        at: Path.next(path),
      },
    );
  };

  const handleWidthTypeChange = (type: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        width: { ...element.width, type },
      },
      { at: path },
    );
  };

  const handleWidthValueChange = (e: any) => {
    const path = ReactEditor.findPath(editor, element);
    const value = e.target.value;
    Transforms.setNodes(
      editor,
      {
        width: { ...element.width, value },
      },
      { at: path },
    );
  };

  const handleMarginValueChange = (e: any, position: string) => {
    const path = ReactEditor.findPath(editor, element);
    const value = e.target.value;
    // const margin = { ...element.margin, [position]: value };
    Transforms.setNodes(
      editor,
      {
        margin: { ...element.margin, [position]: value } as any,
      },
      { at: path },
    );
  };

  const handleMarginCheckedChange = (checked: boolean) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        margin: { ...element.margin, enabled: checked },
      },
      { at: path },
    );
  };

  const handleUrlChange = (e: ChangeEvent<HTMLInputElement>) => {
    const path = ReactEditor.findPath(editor, element);
    const value = e.target.value;
    Transforms.setNodes(
      editor,
      {
        url: value,
      },
      { at: path },
    );
  };

  const handleSubmitUrl = () => {
    const path = ReactEditor.findPath(editor, element);
    // const value = e.target.value;
    Transforms.setNodes(
      editor,
      {
        parsedUrl: element.url,
      },
      { at: path },
    );
  };

  useEffect(() => {
    const _style = transformsStyle(element);
    setStyle({ ...style, ..._style });
  }, [element.width, element.margin]);

  return (
    <div {...props.attributes}>
      {props.children}
      <Popover.Root>
        {element.parsedUrl && (
          <Popover.Trigger asChild>
            <div style={{ position: 'relative', ...style }}>
              <iframe
                title={`Embedded content from ${element.parsedUrl}`}
                src={element.parsedUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen={true}
                tabIndex={-1}
                style={{ display: 'block', pointerEvents: 'none' }}
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
            side="bottom"
            style={{ zIndex: zIndex }}
            sideOffset={5}
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
                  <SelectPortal style={{ zIndex: zIndex + 2 }}>
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

              <div className="flex">
                <Button
                  className="flex-none hover:bg-red-200"
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                >
                  <DeleteIcon className="fill-red-700" />
                </Button>
                <div className="grow" />
                <Button className="flex-none" variant="ghost" size="icon" onClick={handleAddLeft}>
                  <InsertColumnLeftIcon className="fill-foreground" />
                </Button>
                <div className="flex-none mx-1 leading-10">Embed URL</div>
                <Button className="flex-none" variant="ghost" size="icon" onClick={handleAddRight}>
                  <InsertColumnRightIcon className="fill-foreground" />
                </Button>
              </div>
            </div>
            {/* <Popover.Arrow className="fill-slate-900" /> */}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
};

type EmbedElementSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: EmbedElementType;
};
export const EmbedElementSerialize = (props: EmbedElementSerializeType) => {
  const { element } = props;
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    setStyle(transformsStyle(element));
  }, []);

  return (
    <>
      {element.parsedUrl && (
        <div style={{ position: 'relative', ...style }}>
          <iframe
            title={`Embedded content from ${element.parsedUrl}`}
            src={element.parsedUrl}
            width="100%"
            height="100%"
            frameBorder="0"
            allow="accelerometer; autoplay; fullscreen; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen={true}
            tabIndex={-1}
            style={{ display: 'block', pointerEvents: 'none' }}
          />
        </div>
      )}
      {!element.parsedUrl && <VideoIcon className="fill-slate-300" width={200} height={200} />}
    </>
  );
};

EmbedElement.display = 'EmbedElement';
