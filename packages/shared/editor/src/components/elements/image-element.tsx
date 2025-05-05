import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { Checkbox } from '@usertour-ui/checkbox';
import { ImageEditIcon, ImageIcon } from '@usertour-ui/icons';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-ui/icons';
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
import Upload from 'rc-upload';
import { CSSProperties, useEffect, useState } from 'react';
/* eslint-disable @next/next/no-img-element */
import { Path, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { ImageElementType, UploadRequestOption } from '../../types/slate';
import { promiseUploadFunc } from '../../utils/promiseUploadFunc';
import { usePopperEditorContext } from '../editor';

const marginKeyMapping = {
  left: 'marginLeft',
  top: 'marginTop',
  bottom: 'marginBottom',
  right: 'marginRight',
};

const transformsStyle = (element: ImageElementType) => {
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

const ImageElement = (props: RenderElementProps) => {
  const editor = useSlateStatic();
  const element = props.element as ImageElementType;
  const path = ReactEditor.findPath(editor, element);
  const { zIndex, customUploadRequest } = usePopperEditorContext();
  const [style, setStyle] = useState<CSSProperties | null>(null);

  const insertImg = async (option: UploadRequestOption) => {
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
        url = ret?.url;
      }
    }
    Transforms.setNodes(
      editor,
      {
        url,
      },
      { at: path },
    );
  };

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
        type: 'image',
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
        type: 'image',
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
    const margin = { ...element.margin, [position]: value } as any;
    Transforms.setNodes(
      editor,
      {
        margin,
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

  useEffect(() => {
    const _style = transformsStyle(element);
    setStyle(_style);
  }, [element.width, element.margin]);

  return (
    <div {...props.attributes} className="group relative flex max-w-lg flex-col">
      {props.children}
      {element.url && (
        <Popover.Root modal={true}>
          <Popover.Trigger asChild>
            <img src={element.url} style={{ ...style }} className="cursor-pointer" />
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
              side="bottom"
              style={{ zIndex: zIndex }}
              sideOffset={5}
            >
              <div className="flex flex-col gap-2.5">
                <Label htmlFor="button-text">Button width</Label>
                <div className="flex gap-x-2">
                  <Input
                    type="width"
                    value={element.width?.value}
                    placeholder="Column width"
                    onChange={handleWidthValueChange}
                    className="bg-background flex-none w-[120px]"
                  />
                  <Select
                    onValueChange={handleWidthTypeChange}
                    defaultValue={element.width?.type ?? 'percent'}
                  >
                    <SelectTrigger className="shrink">
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
                          <DeleteIcon className="fill-red-500" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Delete image</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button className="flex-none" variant="ghost" size="icon">
                          <Upload
                            accept="image/*"
                            customRequest={(option) => {
                              insertImg(option as UploadRequestOption);
                            }}
                          >
                            <ImageEditIcon className="mx-1 fill-foreground" />
                          </Upload>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Replace image</p>
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
                        <p>Insert image to the left</p>
                      </TooltipContent>
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
                          onClick={handleAddRight}
                        >
                          <InsertColumnRightIcon className="fill-foreground" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Insert image to the right</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
              {/* <Popover.Arrow className="fill-slate-900" /> */}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
      {!element.url && (
        <Upload
          accept="image/*"
          customRequest={(option) => {
            insertImg(option as UploadRequestOption);
          }}
        >
          <ImageIcon className="fill-slate-300" width={200} height={200} />
        </Upload>
      )}
    </div>
  );
};

type ImageElementSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ImageElementType;
};

export const ImageElementSerialize = (props: ImageElementSerializeType) => {
  const { element } = props;
  const [style, setStyle] = useState<CSSProperties | null>(null);

  useEffect(() => {
    setStyle(transformsStyle(element));
  }, [element.width, element.margin]);

  return (
    <>
      <img src={element.url} style={{ ...style }} />
    </>
  );
};

export default ImageElement;
