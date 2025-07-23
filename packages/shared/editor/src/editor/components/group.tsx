import { useDndMonitor } from '@dnd-kit/core';
import { AnimateLayoutChanges, defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragHandleDots2Icon } from '@radix-ui/react-icons';
import { Button } from '@usertour-packages/button';
import { cn } from '@usertour/helpers';
import { ReactNode, forwardRef, useCallback, useEffect, useMemo, useState } from 'react';
import { useContentEditorContext } from '../../contexts/content-editor-context';
import {
  ContentEditorElement,
  ContentEditorElementInsertDirection,
  ContentEditorGroupElement,
  ContentEditorSideBarType,
} from '../../types/editor';
import { ContentEditorSideBar } from './sidebar';

interface DragStyle {
  transform: string;
  transition: string | undefined;
  opacity: number;
}

// Utility functions
const createDragStyle = (
  transform: any,
  transition: string | undefined,
  isDragging: boolean,
): DragStyle => ({
  transform: CSS.Transform.toString(transform) || '',
  transition,
  opacity: isDragging ? 0.5 : 1,
});

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

// Drag handle component
const DragHandle = ({
  isVisible,
  isOverlay = false,
  setActivatorNodeRef,
  attributes,
  listeners,
}: {
  isVisible: boolean;
  isOverlay?: boolean;
  setActivatorNodeRef: (node: HTMLElement | null) => void;
  attributes: any;
  listeners: any;
}) => {
  if (!isVisible) return null;

  return (
    <Button
      size="icon"
      ref={setActivatorNodeRef}
      className={cn(
        'rounded-none absolute w-4 h-full rounded-l -left-4 cursor-move',
        isOverlay && 'bg-sdk-primary',
      )}
      {...attributes}
      {...listeners}
    >
      <DragHandleDots2Icon className="h-4" />
    </Button>
  );
};

// Main editable group component
export interface ContentEditorGroupProps {
  children: ReactNode;
  element: ContentEditorGroupElement;
  id: string;
  path: number[];
  items: any[];
}

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

  // Memoized values and styles
  const dragStyle = useMemo(
    () => createDragStyle(transform, transition, isDragging),
    [transform, transition, isDragging],
  );

  const shouldShowDragHandle = useMemo(
    () => isDragging || isGroupHover,
    [isDragging, isGroupHover],
  );

  const shouldShowSidebar = useMemo(() => isGroupHover || isOpen, [isGroupHover, isOpen]);

  // Event handlers
  const insertBlockAtRight = useCallback(
    (element: ContentEditorElement) => {
      insertColumnInGroup(element, path, ContentEditorElementInsertDirection.RIGHT);
      setIsGroupHover(false);
    },
    [insertColumnInGroup, path],
  );

  const handleMouseOver = useCallback(() => {
    if (activeId && activeId !== id) {
      return;
    }
    setIsGroupHover(true);
  }, [activeId, id]);

  const handleMouseOut = useCallback(() => {
    setIsGroupHover(false);
  }, []);

  const handleFocus = useCallback(() => {
    if (activeId && activeId !== id) {
      return;
    }
    setIsGroupHover(true);
  }, [activeId, id]);

  const handleBlur = useCallback(() => {
    setIsGroupHover(false);
  }, []);

  // DnD monitor
  useDndMonitor({
    onDragEnd: useCallback(() => {
      setIsGroupHover(false);
    }, []),
    onDragCancel: useCallback(() => {
      setIsGroupHover(false);
    }, []),
  });

  // Effect for active state management
  useEffect(() => {
    if (activeId && activeId !== id) {
      setIsGroupHover(false);
    }
  }, [activeId, id]);

  return (
    <div
      ref={setNodeRef}
      className="relative flex items-stretch"
      style={dragStyle}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <DragHandle
        isVisible={shouldShowDragHandle}
        setActivatorNodeRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />

      {shouldShowSidebar && (
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

// Overlay component
export const ContentEditorGroupOverlay = forwardRef<HTMLDivElement, ContentEditorGroupProps>(
  (props: ContentEditorGroupProps, ref) => {
    const { children } = props;

    return (
      <div ref={ref} className="relative h-full w-full flex items-stretch">
        <Button
          size="icon"
          className={cn(
            'rounded-none absolute w-4 h-full rounded-l -left-4 cursor-move',
            'bg-sdk-primary',
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

// Read-only serialized component for SDK
export type ContentEditorGroupSerializeType = {
  children: React.ReactNode;
};

export const ContentEditorGroupSerialize = (props: ContentEditorGroupSerializeType) => {
  const { children } = props;

  return <div className="relative flex items-stretch">{children}</div>;
};

ContentEditorGroupSerialize.displayName = 'ContentEditorGroupSerialize';
