// Main editable column component

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ComboBox } from '@usertour-packages/combo-box';
import { EDITOR_SELECT } from '@usertour-packages/constants';
import { Input } from '@usertour-packages/input';
import { Label } from '@usertour-packages/label';
import { Popover, PopoverArrow, PopoverContent } from '@usertour-packages/popover';
import { useComposedRefs } from '@usertour-packages/react-compose-refs';
import { cn } from '@usertour-packages/tailwind';
import type React from 'react';
import { memo, useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useEvent } from 'react-use';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import {
  ContentEditorColumnElement,
  ContentEditorElement,
  ContentEditorElementInsertDirection,
} from '../../../types/editor';
import {
  ACTIVE_CLASSES,
  ALIGN_ITEMS_OPTIONS_LIST,
  COLUMN_WIDTH_TYPE_OPTIONS,
  DEFAULT_ALIGN_ITEMS,
  DEFAULT_JUSTIFY_CONTENT,
  HOVER_CLASSES,
  JUSTIFY_CONTENT_OPTIONS_LIST,
  WIDTH_TYPES,
} from '../../constants';
import type { WidthType } from '../../types';
import { ensureWidthWithDefaults, transformColumnStyle } from '../../utils';
import { ColumnActionButtons } from './column-action-buttons';
import { ColumnHeader } from './column-header';

export interface ContentEditorColumnProps {
  element: ContentEditorColumnElement;
  children: ReactNode;
  id: string;
  path: number[];
  className?: string;
}

export const ContentEditorColumn = memo((props: ContentEditorColumnProps) => {
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
    () => transformColumnStyle(element),
    [element.width, element.style?.marginRight],
  );
  const dragStyle = useMemo(
    () => ({
      transform: CSS.Transform.toString(transform),
      transition,
    }),
    [transform, transition],
  );

  const width = useMemo(() => ensureWidthWithDefaults(element.width), [element.width]);

  // Event handlers
  const onMousedown = useCallback(
    (event: MouseEvent) => {
      if (!isOpen && ref.current && !ref.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    },
    [isOpen],
  ) as EventListener;

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

  const composedRefs = useComposedRefs(
    ref as React.RefObject<HTMLDivElement>,
    setNodeRef as React.Ref<HTMLDivElement>,
  );

  // Mouse event handlers
  const handleMouseOver = useCallback(() => setIsHover(true), []);
  const handleMouseOut = useCallback(() => setIsHover(false), []);
  const handleMouseDown = useCallback(() => setIsActive(true), []);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div
        style={{ ...columnStyle, ...dragStyle }}
        ref={composedRefs}
        className={cn(
          'flex relative flex-row ',
          element?.justifyContent ?? DEFAULT_JUSTIFY_CONTENT,
          element?.alignItems ?? DEFAULT_ALIGN_ITEMS,
          !activeId ? (isActive ? ACTIVE_CLASSES : isHover ? HOVER_CLASSES : '') : '',
          className,
        )}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onMouseDown={handleMouseDown}
        onFocus={handleMouseOver}
        onBlur={handleMouseOut}
      >
        {!isDragging && isActive && (
          <ColumnHeader
            attributes={attributes}
            listeners={listeners as Record<string, unknown>}
            setActivatorNodeRef={setActivatorNodeRef}
          />
        )}
        {children}
      </div>
      {isActive && (
        <PopoverContent
          className="shadow-none drop-shadow-popover"
          side="left"
          style={{ zIndex }}
          sideOffset={5}
        >
          <div className="flex flex-col gap-2.5">
            <Label>Column width</Label>
            <div className="flex gap-x-2">
              {width.type !== WIDTH_TYPES.FILL && (
                <Input
                  type="number"
                  value={width.value?.toString() ?? ''}
                  placeholder="Column width"
                  onChange={handleWidthValueChange}
                  className="bg-background flex-none w-[120px]"
                />
              )}
              <ComboBox
                options={COLUMN_WIDTH_TYPE_OPTIONS}
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
              value={element.justifyContent ?? DEFAULT_JUSTIFY_CONTENT}
              onValueChange={handleDistributeValueChange}
              placeholder="Select a distribute"
              contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
            />

            <Label>Align Items</Label>
            <ComboBox
              options={ALIGN_ITEMS_OPTIONS_LIST}
              value={element.alignItems ?? DEFAULT_ALIGN_ITEMS}
              onValueChange={handleAlignValueChange}
              placeholder="Select align items"
              contentStyle={{ zIndex: zIndex + EDITOR_SELECT }}
            />

            <ColumnActionButtons
              onDelete={handleDelete}
              onAddLeft={handleAddLeftColumn}
              onAddRight={handleAddRightColumn}
            />
          </div>
          <PopoverArrow className="fill-background" width={20} height={10} />
        </PopoverContent>
      )}
    </Popover>
  );
});

ContentEditorColumn.displayName = 'ContentEditorColumn';
