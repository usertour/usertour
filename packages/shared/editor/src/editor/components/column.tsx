import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, GearIcon } from '@radix-ui/react-icons';
import * as Popover from '@radix-ui/react-popover';
import { Button } from '@usertour-ui/button';
import { cn } from '@usertour-ui/button/src/utils';
import { EDITOR_SELECT } from '@usertour-ui/constants';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-ui/icons';
import { Input } from '@usertour-ui/input';
import { Label } from '@usertour-ui/label';
import { useComposedRefs } from '@usertour-ui/react-compose-refs';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@usertour-ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@usertour-ui/tooltip';
import { ReactNode, forwardRef, useCallback, useRef, useState } from 'react';
import { useEvent } from 'react-use';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorColumnElement,
  ContentEditorElement,
  ContentEditorElementInsertDirection,
} from '../../types/editor';
import { ContentEditorSideBarPopper } from './sidebar';

const activeClasses = 'outline-1 outline-primary outline';
const hoverClasses = 'outline-1 outline-primary outline-dashed';

const transformsStyle = (element: any) => {
  const _style: any = {
    marginBottom: '0px',
    marginRight: `${element.style?.marginRight}px`,
    width: 'auto',
    flex: '0 0 auto',
    minWidth: 0,
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

export interface ContentEditorColumnProps {
  element: ContentEditorColumnElement;
  children: ReactNode;
  id: string;
  path: number[];
  className?: string;
}
export const ContentEditorColumn = (props: ContentEditorColumnProps) => {
  const { element, children, path, id, className } = props;
  const { zIndex, deleteColumn, insertColumnInGroup, updateElement, activeId } =
    useContentEditorContext();
  const {
    attributes,
    listeners,
    isDragging,
    setNodeRef,
    transform,
    transition,
    setActivatorNodeRef,
  } = useSortable({ id });
  const ref = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHover, setIsHover] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const onMousedown = useCallback(
    (event: MouseEvent) => {
      if (!isOpen && ref.current && !ref.current.contains(event.target as any)) {
        setIsActive(false);
      }
    },
    [isOpen, ref],
  ) as any;
  useEvent('mousedown', onMousedown, window, { capture: false });
  const handleDelete = () => {
    deleteColumn(path);
  };
  const handleAddLeftColumn = (element: ContentEditorElement) => {
    insertColumnInGroup(element, path, ContentEditorElementInsertDirection.LEFT);
  };
  const handleAddRightColumn = (element: ContentEditorElement) => {
    insertColumnInGroup(element, path, ContentEditorElementInsertDirection.RIGHT);
  };

  const handleDistributeValueChange = (justifyContent: string) => {
    updateElement({ ...element, justifyContent }, id);
  };

  const handleAlignValueChange = (alignItems: string) => {
    updateElement({ ...element, alignItems }, id);
  };

  const handleWidthTypeChange = (type: string) => {
    updateElement({ ...element, width: { ...element.width, type } }, id);
  };

  const handleWidthValueChange = (e: any) => {
    const value = e.target.value;
    updateElement({ ...element, width: { ...element.width, value } }, id);
  };

  const composedRefs = useComposedRefs(ref as any, setNodeRef as any);

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <div
        style={{ ...transformsStyle(element), ...dragStyle }}
        ref={composedRefs}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent,
          element?.alignItems,
          !activeId ? (isActive ? activeClasses : isHover ? hoverClasses : '') : '',
          isDragging ? hoverClasses : '',
          className,
        )}
        onMouseOver={() => setIsHover(true)}
        onMouseOut={() => setIsHover(false)}
        onMouseDown={() => setIsActive(true)}
        onFocus={() => setIsHover(true)}
        onBlur={() => setIsHover(false)}
      >
        {!isDragging && isActive && (
          <div className="absolute -top-4 -left-[1px] h-4 px-1 rounded-none rounded-t bg-primary flex flex-row text-primary-foreground items-center justify-center">
            <Popover.Anchor asChild>
              <Popover.Trigger className="flex flex-row !text-[10px] items-center justify-center">
                column
                <GearIcon className="ml-1 h-3 w-3" />
              </Popover.Trigger>
            </Popover.Anchor>
            <div
              className="items-center justify-center cursor-move	"
              {...attributes}
              {...listeners}
              ref={setActivatorNodeRef}
            >
              <DragHandleDots2Icon className="h-3" />
            </div>
          </div>
        )}
        {children}
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
                  <SelectContent style={{ zIndex: zIndex + EDITOR_SELECT }}>
                    <SelectGroup>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="pixels">pixels</SelectItem>
                      <SelectItem value="fill">fill</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <Label>Distribute content</Label>
              <Select
                onValueChange={handleDistributeValueChange}
                defaultValue={element.justifyContent}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: zIndex + EDITOR_SELECT }}>
                  <SelectGroup>
                    <SelectItem value="justify-start">Left</SelectItem>
                    <SelectItem value="justify-center">Center</SelectItem>
                    <SelectItem value="justify-end">Right</SelectItem>
                    <SelectItem value="justify-between">Space Between</SelectItem>
                    <SelectItem value="justify-evenly">Space Evenly</SelectItem>
                    <SelectItem value="justify-around">Space Around</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Label>Align Items</Label>
              <Select onValueChange={handleAlignValueChange} defaultValue={element.alignItems}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a distribute" />
                </SelectTrigger>
                <SelectContent style={{ zIndex: zIndex + EDITOR_SELECT }}>
                  <SelectGroup>
                    <SelectItem value="items-start">Top</SelectItem>
                    <SelectItem value="items-center">Center</SelectItem>
                    <SelectItem value="items-end">Bottom</SelectItem>
                    <SelectItem value="items-baseline">Baseline</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {/* <Label htmlFor="spacing">Column spacing</Label>
              <Input
                type="spacing"
                className="bg-background"
                id="spacing"
                value={element.style.marginRight}
                placeholder="Column spacing"
                onChange={handleSpaceValueChange}
              /> */}
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
                    <ContentEditorSideBarPopper onClick={handleAddLeftColumn}>
                      <TooltipTrigger asChild>
                        <Button className="flex-none" variant="ghost" size="icon">
                          <InsertColumnLeftIcon className="fill-foreground" />
                        </Button>
                      </TooltipTrigger>
                    </ContentEditorSideBarPopper>
                    <TooltipContent className="max-w-xs">
                      <p>Insert column to the left</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <div className="flex-none mx-1 leading-10">Insert column</div>
                <TooltipProvider>
                  <Tooltip>
                    <ContentEditorSideBarPopper onClick={handleAddRightColumn}>
                      <TooltipTrigger asChild>
                        <Button className="flex-none" variant="ghost" size="icon">
                          <InsertColumnRightIcon className="fill-foreground" />
                        </Button>
                      </TooltipTrigger>
                    </ContentEditorSideBarPopper>
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

ContentEditorColumn.displayName = 'ContentEditorColumn';

type ContentEditorColumnOverlay = ContentEditorColumnProps & {
  isInGroup?: boolean;
};

export const ContentEditorColumnOverlay = forwardRef<HTMLDivElement, ContentEditorColumnOverlay>(
  (props: ContentEditorColumnOverlay, ref) => {
    const { className, children, isInGroup = false, element } = props;

    return (
      <div
        ref={ref}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent,
          element?.alignItems,
          !isInGroup ? hoverClasses : '',
          className,
        )}
        style={{ ...transformsStyle(element) }}
      >
        {!isInGroup && (
          <div className="absolute -top-4 -left-[1px] h-4 px-1 rounded-none rounded-t bg-primary flex flex-row text-primary-foreground items-center justify-center">
            <div className="flex flex-row !text-[10px] items-center justify-center">
              column
              <GearIcon className="ml-1 h-3 w-3" />
            </div>
            <div className="items-center justify-center cursor-move	">
              <DragHandleDots2Icon className="h-3" />
            </div>
          </div>
        )}
        {children}
      </div>
    );
  },
);

ContentEditorColumnOverlay.displayName = 'ContentEditorColumnOverlay';

export type ContentEditorColumnSerializeType = {
  children: React.ReactNode;
  element: ContentEditorColumnElement;
};

export const ContentEditorColumnSerialize = (props: ContentEditorColumnSerializeType) => {
  const { element, children } = props;
  return (
    <div
      className={cn('flex relative flex-row ', element?.justifyContent, element?.alignItems)}
      style={{ ...transformsStyle(element) }}
    >
      {children}
    </div>
  );
};
ContentEditorColumnSerialize.displayName = 'ContentEditorColumnSerialize';
