import { GearIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { cn } from '@usertour-ui/button/src/utils';
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
import { CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useEvent } from 'react-use';
import { Editor, Element as SlateElement, Node, Path, Transforms } from 'slate';
import { ReactEditor, RenderElementProps, useSlateStatic } from 'slate-react';
import { updateNodeStatus } from '../../lib/editorHelper';
import { ColumnElementType } from '../../types/slate';
import { usePopperEditorContext } from '../editor';

type ColumnElementSerializeType = {
  children: React.ReactNode;
  element: ColumnElementType;
};
export const ColumnElementSerialize = (props: ColumnElementSerializeType) => {
  const { element, children } = props;
  const style = transformsStyle(element);
  return <div style={{ ...style }}>{children}</div>;
};

const transformsStyle = (element: ColumnElementType) => {
  const _style: CSSProperties = {
    display: 'flex',
    position: 'relative',
    flexDirection: 'column',
    marginBottom: '0px',
    justifyContent: element.style?.justifyContent,
    marginRight: `${element.style?.marginRight}px`,
    width: 'auto',
    flex: 'auto',
  };
  if (element.width?.type === 'percent') {
    _style.width = `${element.width?.value}%`;
  } else if (element.width?.type === 'pixels') {
    _style.width = `${element.width?.value}px`;
  } else {
    _style.flex = '1 0 0px';
  }
  // if (showToolbar) {
  //   _style.borderRadius = "2px";
  //   _style.outline = "1px dashed rgba(15, 23, 42,.15)";
  // }
  return _style;
};

export const ColumnElement = (props: RenderElementProps & { className?: string }) => {
  const { zIndex, showToolbar } = usePopperEditorContext();
  const element = props.element as ColumnElementType;
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const ref = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const onMousedown = useCallback(
    (event: MouseEvent) => {
      if (!isOpen && ref.current && !ref.current.contains(event.target as any)) {
        setIsActive(false);
      }
    },
    [isOpen, ref],
  ) as EventListenerOrEventListenerObject;
  useEvent('mousedown', onMousedown, window, { capture: false });
  // const editor = useSlate();
  const editor = useSlateStatic();
  const handleDelete = () => {
    const path = ReactEditor.findPath(editor, element);
    const parentPath = Path.parent(path);
    const parent = Node.get(editor, parentPath);
    const isLastChild = SlateElement.isElement(parent) && parent.children.length === 1;

    if (isLastChild) {
      Transforms.removeNodes(editor, {
        at: parentPath,
        // match:
        voids: true,
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'group',
      });
    } else {
      Transforms.removeNodes(editor, {
        at: path,
        voids: true,
        match: (n) => !Editor.isEditor(n) && SlateElement.isElement(n) && n.type === 'column',
      });
      // const nextNodePath = [0];
      // if (Node.has(editor, nextNodePath)) {
      //   Transforms.select(editor, Editor.start(editor, nextNodePath));
      // } else {
      //   Transforms.deselect(editor);
      // }
    }
    updateNodeStatus(editor);
  };
  const handleAddLeftColumn = () => {
    const path = ReactEditor.findPath(editor, element);
    // const insertPath = Path.parent(path);
    Transforms.insertNodes(
      editor,
      {
        type: 'column',
        style: element.style,
        children: [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
        ],
      },
      {
        at: path,
      },
    );
  };
  const handleAddRightColumn = () => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.insertNodes(
      editor,
      {
        type: 'column',
        style: element.style,
        children: [
          {
            type: 'paragraph',
            children: [{ text: '' }],
          },
        ],
      },
      {
        at: Path.next(path),
      },
    );
  };

  const handleDistributeValueChange = (justifyContent: string) => {
    const path = ReactEditor.findPath(editor, element);
    Transforms.setNodes(
      editor,
      {
        style: { ...element.style, justifyContent },
      },
      { at: path },
    );
  };

  const handleSpaceValueChange = (e: any) => {
    const path = ReactEditor.findPath(editor, element);
    const marginRight = e.target.value;
    Transforms.setNodes(
      editor,
      {
        style: { ...element.style, marginRight },
      },
      { at: path },
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

  useEffect(() => {
    setStyle(transformsStyle(element));
  }, [element.style.justifyContent, element.style.marginRight, element.width, showToolbar]);

  const handleOnClick = () => {
    setIsActive(true);
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <div
        {...props.attributes}
        style={{ ...style }}
        className={cn(
          'relative',
          isActive ? 'outline' : isHover ? 'outline-dashed ' : 'outline-none',
          isActive || isHover ? 'outline-1 outline-primary' : '',
        )}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        onFocus={() => setIsHover(true)}
        onBlur={() => setIsHover(false)}
        onClick={handleOnClick}
      >
        <Popover.Anchor asChild>
          <Popover.Trigger asChild>
            <Button
              ref={ref}
              variant="default"
              className={cn(
                'h-3 p-2 absolute -top-4 -left-[1px] !text-[10px] rounded-none rounded-t hover:bg-primary ',
                isActive ? '' : 'hidden',
              )}
            >
              column
              <GearIcon className="ml-1 h-2 w-2" />
            </Button>
          </Popover.Trigger>
        </Popover.Anchor>
        {props.children}
      </div>
      {isActive && (
        <Popover.Portal>
          <Popover.Content
            className="z-50 w-72 rounded-md border bg-background p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
            side="left"
            style={{ zIndex }}
            sideOffset={5}
          >
            <div className="flex flex-col gap-2.5">
              <Label>Column width</Label>
              <div className="flex gap-x-2">
                {element.width?.type !== 'fill' && (
                  <Input
                    type="width"
                    value={element.width?.value}
                    placeholder="Column width"
                    onChange={handleWidthValueChange}
                    className="bg-background flex-none w-[120px]"
                  />
                )}
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
                        <SelectItem value="fill">fill</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </div>
              <Label>Distribute content</Label>
              <Select
                onValueChange={handleDistributeValueChange}
                defaultValue={element.style.justifyContent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectPortal style={{ zIndex: zIndex + 2 }}>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="start">Top</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="end">Bottom</SelectItem>
                      <SelectItem value="space-between">Space Between</SelectItem>
                      <SelectItem value="space-evenly">Space Evenly</SelectItem>
                      <SelectItem value="space-around">Space Around</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </SelectPortal>
              </Select>
              <Label htmlFor="spacing">Column spacing</Label>
              <Input
                type="spacing"
                className="bg-background"
                id="spacing"
                value={element.style.marginRight}
                placeholder="Column spacing"
                onChange={handleSpaceValueChange}
              />
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
                      <p>Delete column</p>
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
                        onClick={handleAddLeftColumn}
                      >
                        <InsertColumnLeftIcon className="fill-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Insert column to the left</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-none mx-1 leading-10">Insert column</div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="flex-none"
                        variant="ghost"
                        size="icon"
                        onClick={handleAddRightColumn}
                      >
                        <InsertColumnRightIcon className="fill-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Insert column to the right</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Popover.Arrow className="fill-slate-900" />
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
  );
};

ColumnElement.display = 'ColumnElement';
