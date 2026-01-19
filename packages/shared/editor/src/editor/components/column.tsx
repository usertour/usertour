import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon, GearIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { ComboBox, ComboBoxOption } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { DeleteIcon, InsertColumnLeftIcon, InsertColumnRightIcon } from '@usertour-packages/icons';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import {
  Popover,
  PopoverAnchor,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from '@usertour-packages/popover';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { cn } from '@usertour-packages/tailwind';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@usertour-packages/tooltip';
import { ReactNode, forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import { useEvent } from 'react-use';

import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorColumnElement,
  ContentEditorElement,
  ContentEditorElementInsertDirection,
} from '../../types/editor';
import { ContentEditorSideBarPopper } from './sidebar';

// Constants
const WIDTH_TYPES = {
  PERCENT: 'percent',
  PIXELS: 'pixels',
  FILL: 'fill',
} as const;

const JUSTIFY_CONTENT_OPTIONS = {
  START: 'justify-start',
  CENTER: 'justify-center',
  END: 'justify-end',
  BETWEEN: 'justify-between',
  EVENLY: 'justify-evenly',
  AROUND: 'justify-around',
} as const;

const ALIGN_ITEMS_OPTIONS = {
  START: 'items-start',
  CENTER: 'items-center',
  END: 'items-end',
  BASELINE: 'items-baseline',
} as const;

const DEFAULT_WIDTH_TYPE = WIDTH_TYPES.PERCENT;
const DEFAULT_JUSTIFY_CONTENT = JUSTIFY_CONTENT_OPTIONS.START;
const DEFAULT_ALIGN_ITEMS = ALIGN_ITEMS_OPTIONS.START;

// ComboBox options
const WIDTH_TYPE_OPTIONS: ComboBoxOption[] = [
  { value: WIDTH_TYPES.PERCENT, name: '%' },
  { value: WIDTH_TYPES.PIXELS, name: 'pixels' },
  { value: WIDTH_TYPES.FILL, name: 'fill' },
];

const JUSTIFY_CONTENT_OPTIONS_LIST: ComboBoxOption[] = [
  { value: JUSTIFY_CONTENT_OPTIONS.START, name: 'Left' },
  { value: JUSTIFY_CONTENT_OPTIONS.CENTER, name: 'Center' },
  { value: JUSTIFY_CONTENT_OPTIONS.END, name: 'Right' },
  { value: JUSTIFY_CONTENT_OPTIONS.BETWEEN, name: 'Space Between' },
  { value: JUSTIFY_CONTENT_OPTIONS.EVENLY, name: 'Space Evenly' },
  { value: JUSTIFY_CONTENT_OPTIONS.AROUND, name: 'Space Around' },
];

const ALIGN_ITEMS_OPTIONS_LIST: ComboBoxOption[] = [
  { value: ALIGN_ITEMS_OPTIONS.START, name: 'Top' },
  { value: ALIGN_ITEMS_OPTIONS.CENTER, name: 'Center' },
  { value: ALIGN_ITEMS_OPTIONS.END, name: 'Bottom' },
  { value: ALIGN_ITEMS_OPTIONS.BASELINE, name: 'Baseline' },
];

// CSS Classes
const activeClasses = 'outline-1 outline-primary outline';
const hoverClasses = 'outline-1 outline-primary outline-dashed';

// Types
type WidthType = (typeof WIDTH_TYPES)[keyof typeof WIDTH_TYPES];

interface ColumnStyle {
  marginBottom: string;
  marginRight?: string;
  width?: string;
  flex?: string;
  minWidth: string;
}

// Utility functions
const ensureWidthWithDefaults = (width?: { type?: string; value?: number }): {
  type: WidthType;
  value?: number;
} => ({
  type: (width?.type as WidthType) || DEFAULT_WIDTH_TYPE,
  value: width?.value,
});

const transformsStyle = (element: ContentEditorColumnElement): ColumnStyle => {
  const style: ColumnStyle = {
    marginBottom: '0px',
    marginRight: element.style?.marginRight ? `${element.style.marginRight}px` : undefined,
    width: 'auto',
    flex: '0 0 auto',
    minWidth: '0',
  };

  const width = ensureWidthWithDefaults(element.width);

  if (width.type === WIDTH_TYPES.PERCENT && width.value) {
    style.width = `${width.value}%`;
  } else if (width.type === WIDTH_TYPES.PIXELS && width.value) {
    style.width = `${width.value}px`;
  } else if (width.type === WIDTH_TYPES.FILL) {
    style.flex = '1 0 0px';
  }

  return style;
};

// Action buttons component
const ActionButtons = ({
  onDelete,
  onAddLeft,
  onAddRight,
}: {
  onDelete: () => void;
  onAddLeft: (element: ContentEditorElement) => void;
  onAddRight: (element: ContentEditorElement) => void;
}) => (
  <div className="flex items-center">
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className="flex-none hover:bg-destructive/20"
            variant="ghost"
            size="icon"
            onClick={onDelete}
          >
            <DeleteIcon className="fill-destructive" />
          </Button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">Delete column</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="grow" />
    <TooltipProvider>
      <Tooltip>
        <ContentEditorSideBarPopper onClick={onAddLeft}>
          <TooltipTrigger asChild>
            <Button className="flex-none" variant="ghost" size="icon">
              <InsertColumnLeftIcon className="fill-foreground" />
            </Button>
          </TooltipTrigger>
        </ContentEditorSideBarPopper>
        <TooltipContent className="max-w-xs">Insert column to the left</TooltipContent>
      </Tooltip>
    </TooltipProvider>
    <div className="flex-none mx-1 leading-10">Insert column</div>
    <TooltipProvider>
      <Tooltip>
        <ContentEditorSideBarPopper onClick={onAddRight}>
          <TooltipTrigger asChild>
            <Button className="flex-none" variant="ghost" size="icon">
              <InsertColumnRightIcon className="fill-foreground" />
            </Button>
          </TooltipTrigger>
        </ContentEditorSideBarPopper>
        <TooltipContent className="max-w-xs">Insert column to the right</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
);

// Main editable column component
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

  // Memoized styles and values
  const columnStyle = useMemo(
    () => transformsStyle(element),
    [element.width, element.style?.marginRight],
  );
  const dragStyle = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    }),
    [transform, transition, isDragging],
  );

  const width = useMemo(() => ensureWidthWithDefaults(element.width), [element.width]);

  // Event handlers
  const onMousedown = useCallback(
    (event: MouseEvent) => {
      if (!isOpen && ref.current && !ref.current.contains(event.target as any)) {
        setIsActive(false);
      }
    },
    [isOpen],
  ) as any;

  const handleDelete = useCallback(() => {
    deleteColumn(path);
  }, [deleteColumn, path]);

  const handleAddLeftColumn = useCallback(
    (element: ContentEditorElement) => {
      insertColumnInGroup(element, path, ContentEditorElementInsertDirection.LEFT);
    },
    [insertColumnInGroup, path],
  );

  const handleAddRightColumn = useCallback(
    (element: ContentEditorElement) => {
      insertColumnInGroup(element, path, ContentEditorElementInsertDirection.RIGHT);
    },
    [insertColumnInGroup, path],
  );

  const handleDistributeValueChange = useCallback(
    (justifyContent: string) => {
      updateElement({ ...element, justifyContent }, id);
    },
    [element, id, updateElement],
  );

  const handleAlignValueChange = useCallback(
    (alignItems: string) => {
      updateElement({ ...element, alignItems }, id);
    },
    [element, id, updateElement],
  );

  const handleWidthTypeChange = useCallback(
    (type: string) => {
      const updatedWidth = ensureWidthWithDefaults({
        ...element.width,
        type: type as WidthType,
      });
      updateElement({ ...element, width: updatedWidth }, id);
    },
    [element, id, updateElement],
  );

  const handleWidthValueChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = Number(e.target.value);
      const updatedWidth = ensureWidthWithDefaults({
        ...element.width,
        value,
        type: element.width?.type as WidthType,
      });
      updateElement({ ...element, width: updatedWidth }, id);
    },
    [element, id, updateElement],
  );

  useEvent('mousedown', onMousedown, window, { capture: false });

  const composedRefs = useComposedRefs(ref as any, setNodeRef as any);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div
        style={{ ...columnStyle, ...dragStyle }}
        ref={composedRefs}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent || DEFAULT_JUSTIFY_CONTENT,
          element?.alignItems || DEFAULT_ALIGN_ITEMS,
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
            <PopoverAnchor asChild>
              <PopoverTrigger className="flex flex-row !text-[10px] items-center justify-center">
                column
                <GearIcon className="ml-1 h-3 w-3" />
              </PopoverTrigger>
            </PopoverAnchor>
            <div
              className="items-center justify-center cursor-move"
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
        <PopoverContent className="bg-background" side="left" style={{ zIndex }} sideOffset={5}>
          <div className="flex flex-col gap-2.5">
            <Label>Column width</Label>
            <div className="flex gap-x-2">
              {width.type !== WIDTH_TYPES.FILL && (
                <Input
                  type="number"
                  value={width.value?.toString() || ''}
                  placeholder="Column width"
                  onChange={handleWidthValueChange}
                  className="bg-background flex-none w-[120px]"
                />
              )}
              <ComboBox
                options={WIDTH_TYPE_OPTIONS}
                value={width.type}
                onValueChange={handleWidthTypeChange}
                placeholder="Select width type"
                className="shrink"
                contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
              />
            </div>

            <Label>Distribute content</Label>
            <ComboBox
              options={JUSTIFY_CONTENT_OPTIONS_LIST}
              value={element.justifyContent || DEFAULT_JUSTIFY_CONTENT}
              onValueChange={handleDistributeValueChange}
              placeholder="Select a distribute"
              contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
            />

            <Label>Align Items</Label>
            <ComboBox
              options={ALIGN_ITEMS_OPTIONS_LIST}
              value={element.alignItems || DEFAULT_ALIGN_ITEMS}
              onValueChange={handleAlignValueChange}
              placeholder="Select align items"
              contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
            />

            <ActionButtons
              onDelete={handleDelete}
              onAddLeft={handleAddLeftColumn}
              onAddRight={handleAddRightColumn}
            />
          </div>
          <PopoverArrow className="fill-slate-900" />
        </PopoverContent>
      )}
    </Popover>
  );
};

ContentEditorColumn.displayName = 'ContentEditorColumn';

// Overlay component
type ContentEditorColumnOverlay = ContentEditorColumnProps & {
  isInGroup?: boolean;
};

export const ContentEditorColumnOverlay = forwardRef<HTMLDivElement, ContentEditorColumnOverlay>(
  (props: ContentEditorColumnOverlay, ref) => {
    const { className, children, isInGroup = false, element } = props;

    const overlayStyle = useMemo(
      () => transformsStyle(element),
      [element.width, element.style?.marginRight],
    );

    return (
      <div
        ref={ref}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent || DEFAULT_JUSTIFY_CONTENT,
          element?.alignItems || DEFAULT_ALIGN_ITEMS,
          !isInGroup ? hoverClasses : '',
          className,
        )}
        style={overlayStyle}
      >
        {!isInGroup && (
          <div className="absolute -top-4 -left-[1px] h-4 px-1 rounded-none rounded-t bg-primary flex flex-row text-primary-foreground items-center justify-center">
            <div className="flex flex-row !text-[10px] items-center justify-center">
              column
              <GearIcon className="ml-1 h-3 w-3" />
            </div>
            <div className="items-center justify-center cursor-move">
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

// Read-only serialized component for SDK
export type ContentEditorColumnSerializeType = {
  children: React.ReactNode;
  element: ContentEditorColumnElement;
};

export const ContentEditorColumnSerialize = (props: ContentEditorColumnSerializeType) => {
  const { element, children } = props;

  const serializeStyle = useMemo(
    () => transformsStyle(element),
    [element.width, element.style?.marginRight],
  );

  return (
    <div
      className={cn(
        'flex relative flex-row ',
        element?.justifyContent || DEFAULT_JUSTIFY_CONTENT,
        element?.alignItems || DEFAULT_ALIGN_ITEMS,
      )}
      style={serializeStyle}
    >
      {children}
    </div>
  );
};

ContentEditorColumnSerialize.displayName = 'ContentEditorColumnSerialize';
