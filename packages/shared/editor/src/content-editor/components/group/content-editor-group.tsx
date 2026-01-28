// Main editable group component

import { useDndMonitor } from '@dnd-kit/core';
import { AnimateLayoutChanges, defaultAnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';
import {
  ContentEditorElement,
  ContentEditorElementInsertDirection,
  ContentEditorGroupElement,
  ContentEditorSideBarType,
} from '../../../types/editor';
import { ContentEditorSideBar } from '../sidebar';
import { GroupDragHandle } from './group-drag-handle';

interface DragStyle {
  transform: string;
  transition: string | undefined;
}

// Utility functions
const createDragStyle = (transform: any, transition: string | undefined): DragStyle => ({
  transform: CSS.Transform.toString(transform) || '',
  transition,
});

const animateLayoutChanges: AnimateLayoutChanges = (args) =>
  defaultAnimateLayoutChanges({ ...args, wasDragging: true });

export interface ContentEditorGroupProps {
  children: ReactNode;
  element: ContentEditorGroupElement;
  id: string;
  path: number[];
  items: any[];
}

export const ContentEditorGroup = memo((props: ContentEditorGroupProps) => {
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
  const dragStyle = useMemo(() => createDragStyle(transform, transition), [transform, transition]);

  const shouldShowDragHandle = useMemo(
    () => isDragging || isGroupHover,
    [isDragging, isGroupHover],
  );

  const shouldShowSidebar = useMemo(
    () => !activeId && (isGroupHover || isOpen),
    [activeId, isGroupHover, isOpen],
  );

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
      <GroupDragHandle
        isVisible={shouldShowDragHandle}
        setActivatorNodeRef={setActivatorNodeRef}
        attributes={attributes}
        listeners={listeners}
      />
      <ContentEditorSideBar
        type={ContentEditorSideBarType.RIGHT}
        onPopoverOpenChange={setIsOpen}
        onClick={insertBlockAtRight}
        visible={shouldShowSidebar}
      />

      {children}
    </div>
  );
});

ContentEditorGroup.displayName = 'ContentEditorGroup';
