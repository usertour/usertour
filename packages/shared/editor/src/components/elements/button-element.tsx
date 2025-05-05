import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import {
  ArrowRightIcon,
  CloseCircleIcon,
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
import { useState } from 'react';
import { Path, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { ButtonData, ButtonElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

export const ButtonElement = (props: RenderElementProps & { className?: string }) => {
  const { zIndex } = usePopperEditorContext();
  const element = props.element as ButtonElementType;
  const [buttonText, setButtonText] = useState(element.data.text);
  const editor = useSlateStatic();
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
        type: 'button',
        data: { text: 'Button', type: 'default', action: 'goto' },
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
        type: 'button',
        data: { text: 'Button', type: 'default', action: 'goto' },
        children: [{ text: '' }],
      },
      {
        at: Path.next(path),
      },
    );
  };

  const handleButtonActionChange = (action: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        data: { ...element.data, action },
      },
      { at: path },
    );
  };

  const handleButtonStyleChange = (type: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        data: { ...element.data, type },
      },
      { at: path },
    );
  };

  const handleButtonTextChange = (e: any) => {
    const path = ReactEditor.findPath(editor, element);
    const value = e.target.value;
    setButtonText(value);
    Transforms.setNodes(
      editor,
      {
        data: { ...element.data, text: value },
      },
      { at: path },
    );
  };

  return (
    <Popover.Root modal={true}>
      <Popover.Trigger asChild>
        <Button
          {...props.attributes}
          forSdk={true}
          variant={element.data.type as any}
          contentEditable={false}
        >
          {props.children}
          <span>{element.data.text}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none"
          side="bottom"
          align="start"
          style={{ zIndex: zIndex }}
          sideOffset={5}
          alignOffset={-2}
        >
          <div className="flex flex-col gap-2.5">
            <Label htmlFor="button-text">Button text</Label>
            <Input
              type="button-text"
              className="bg-background"
              id="button-text"
              value={buttonText}
              placeholder="Enter button text"
              onChange={handleButtonTextChange}
            />
            <Label>Button style</Label>
            <Select onValueChange={handleButtonStyleChange} defaultValue={element.data.type}>
              <SelectTrigger>
                <SelectValue placeholder="Select a distribute" />
              </SelectTrigger>
              <SelectPortal style={{ zIndex: zIndex + 2 }}>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="default">Primary</SelectItem>
                    <SelectItem value="secondary">Secondary</SelectItem>
                    <SelectItem value="destructive">Destructive</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </SelectPortal>
            </Select>
            <Label>When button is clicked</Label>
            <Select onValueChange={handleButtonActionChange} defaultValue={element.data.action}>
              <SelectTrigger>
                <SelectValue placeholder="Select a distribute" />
              </SelectTrigger>
              <SelectPortal style={{ zIndex: zIndex + 2 }}>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="goto">
                      <div className="flex">
                        <ArrowRightIcon className="mx-2 my-1" />
                        Go to step
                      </div>
                    </SelectItem>
                    <SelectItem value="dismiss">
                      <div className="flex">
                        <CloseCircleIcon className="flex-none mx-2 my-1" />
                        <div className="grow">Dismiss flow</div>
                      </div>
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </SelectPortal>
            </Select>
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
                    <p>Delete button</p>
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
                    <p>Insert button to the left</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex-none mx-1 leading-10">Insert button</div>
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
                    <p>Insert button to the right</p>
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
type ButtonElementSerializeType = {
  className?: string;
  children?: React.ReactNode;
  element: ButtonElementType;
  onClick?: (type: string, data: ButtonData) => void;
};

export const ButtonElementSerialize = (props: ButtonElementSerializeType) => {
  const { element, onClick } = props;

  const handleOnClick = () => {
    if (onClick) {
      onClick(element.type, element.data);
    }
  };
  return (
    <>
      <Button variant={element.data?.type as any} forSdk={true} onClick={handleOnClick}>
        <span>{element.data?.text}</span>
      </Button>
    </>
  );
};

ButtonElement.display = 'ButtonElement';
