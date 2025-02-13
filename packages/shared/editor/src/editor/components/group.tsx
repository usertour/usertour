import { useDndMonitor } from '@dnd-kit/core';
import { AnimateLayoutChanges, defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { cn } from '@usertour-ui/ui-utils';
import { ReactNode, forwardRef, useCallback, useEffect, useState } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorElement,
  ContentEditorElementInsertDirection,
  ContentEditorGroupElement,
  ContentEditorSideBarType,
} from '../../types/editor';
import { ContentEditorSideBar } from './sidebar';

export interface ContentEditorGroupProps {
  children: ReactNode;
  element: ContentEditorGroupElement;
  id: string;
  path: number[];
  items: any[];
}

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export const ContentEditorGroup = (props: ContentEditorGroupProps) => {
  const { children, path, id, items } = props;
  const [isGroupHover, setIsGroupHover] = useState(false);
  const { insertColumnInGroup, activeId } = useContentEditorContext();
  const [isOpen, setIsOpen] = useState(false);

  const {
    attributes,
    listeners,
    isDragging,
    setNodeRef,
    transform,
    transition,
    setActivatorNodeRef,
  } = useSortable({
    id,
    data: {
      type: 'container',
      children: items,
    },
    animateLayoutChanges,
  });

  useDndMonitor({
    onDragEnd() {
      setIsGroupHover(false);
    },
    onDragCancel() {
      setIsGroupHover(false);
    },
  });

  const dragStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const insertBlockAtRight = (element: ContentEditorElement) => {
    insertColumnInGroup(element, path, ContentEditorElementInsertDirection.RIGHT);
    setIsGroupHover(false);
  };

  const handleMouseOver = useCallback(() => {
    if (activeId && activeId !== id) {
      return;
    }
    setIsGroupHover(true);
  }, [activeId, id]);

  useEffect(() => {
    if (activeId && activeId !== id) {
      setIsGroupHover(false);
    }
  }, [activeId, id]);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex items-stretch',
        // "hover:bg-editor-hover"
        // isDragging ? "hidden" : ""
      )}
      style={{ ...dragStyle }}
      onMouseOver={handleMouseOver}
      onMouseOut={() => setIsGroupHover(false)}
      onFocus={handleMouseOver}
      onBlur={() => setIsGroupHover(false)}
    >
      {(isDragging || isGroupHover) && (
        <Button
          size="icon"
          ref={setActivatorNodeRef}
          className={cn('rounded-none	 absolute w-4 h-full rounded-l -left-4 cursor-move')}
          {...attributes}
          {...listeners}
        >
          <DragHandleDots2Icon className="h-4" />
        </Button>
      )}
      {(isGroupHover || isOpen) && (
        <ContentEditorSideBar
          type={ContentEditorSideBarType.RIGHT}
          setIsOpen={setIsOpen}
          isOpen={isOpen}
          onClick={insertBlockAtRight}
        />
      )}
      {children}
    </div>
  );
};

ContentEditorGroup.displayName = 'ContentEditorGroup';

export const ContentEditorGroupOverlay = forwardRef<HTMLDivElement, ContentEditorGroupProps>(
  (props: ContentEditorGroupProps, ref) => {
    const { children } = props;
    return (
      <div ref={ref} className={cn('relative h-full w-full', 'flex items-stretch')}>
        <Button
          size="icon"
          className={cn(
            'rounded-none	 absolute w-4 h-full rounded-l -left-4 cursor-move bg-sdk-primary',
          )}
        >
          <DragHandleDots2Icon className="h-4" />
        </Button>
        {children}
      </div>
    );
  },
);

ContentEditorGroupOverlay.displayName = 'ContentEditorGroupOverlay';

export type ContentEditorGroupSerializeType = {
  children: React.ReactNode;
};
export const ContentEditorGroupSerialize = (props: ContentEditorGroupSerializeType) => {
  const { children } = props;
  return <div className={cn('relative flex items-stretch')}>{children}</div>;
};

ContentEditorGroupSerialize.displayName = 'ContentEditorGroupSerialize';
