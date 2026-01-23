// Main editor component with drag and drop functionality

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EDITOR_OVERLAY } from '@usertour-packages/constants';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorSideBarType } from '../../types/editor';
import { useEditorDrag } from '../hooks/use-editor-drag';
import { useHoverState } from '../hooks/use-hover-state';
import { ContentEditorDragOverlay } from './drag-overlay';
import { ContentEditorGroup } from './group';
import { GroupDropZone } from './group-drop-zone';
import { ContentEditorRenderColumn } from './render-column';
import { ContentEditorSideBar } from './sidebar';

// DndContext measuring config - constant outside component to avoid recreation
const MEASURING_CONFIG = {
  droppable: {
    strategy: MeasuringStrategy.Always,
  },
};

export const Editor = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [containerNode, setContainerNode] = useState<HTMLElement>();
  const {
    contents,
    isEditorHover,
    setIsEditorHover,
    insertGroupAtTop,
    insertGroupAtBottom,
    activeId,
    setActiveId,
    setContents,
    setDropPreview,
    zIndex,
  } = useContentEditorContext();

  // Use callback ref to find parent container when DOM node is mounted
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const parentNode = node.closest('.usertour-widget-root') as HTMLElement;
      if (parentNode) {
        setContainerNode(parentNode);
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum distance (px) before drag activates to prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Custom hooks for drag and hover logic
  const { handleDragStart, handleDragOver, handleDragEnd } = useEditorDrag({
    contents,
    setContents,
    setActiveId,
    setDropPreview,
  });

  const { handleMouseEnter, handleMouseLeave, handleFocus, handleBlur } = useHoverState({
    setIsHover: setIsEditorHover,
  });

  // Memoized sortable items
  const sortableItems = useMemo(() => contents.map((c) => ({ id: c.id ?? '' })), [contents]);

  // Sidebar visibility
  const shouldShowSidebar = !activeId && (isEditorHover || isOpen);

  // DragOverlay style
  const dragOverlayStyle = useMemo(() => ({ zIndex: zIndex + EDITOR_OVERLAY }), [zIndex]);

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {shouldShowSidebar && (
        <ContentEditorSideBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onClick={insertGroupAtTop}
          type={ContentEditorSideBarType.TOP}
        />
      )}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
        measuring={MEASURING_CONFIG}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {contents.map((content, i) => (
            <Fragment key={content.id}>
              <GroupDropZone index={i} />
              <ContentEditorGroup
                element={content.element}
                path={[i]}
                items={content.children.map((c) => ({ id: c.id ?? '' }))}
                id={content.id ?? ''}
              >
                <SortableContext
                  items={content.children.map((c) => ({ id: c.id ?? '' }))}
                  strategy={horizontalListSortingStrategy}
                >
                  <ContentEditorRenderColumn
                    columns={content.children}
                    parentPath={[i]}
                    containerId={content.id ?? ''}
                  />
                </SortableContext>
              </ContentEditorGroup>
            </Fragment>
          ))}
          <GroupDropZone index={contents.length} />
        </SortableContext>
        {containerNode &&
          createPortal(
            <DragOverlay dropAnimation={null} style={dragOverlayStyle}>
              <ContentEditorDragOverlay />
            </DragOverlay>,
            containerNode,
          )}
      </DndContext>
      {shouldShowSidebar && (
        <ContentEditorSideBar
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          onClick={insertGroupAtBottom}
          type={ContentEditorSideBarType.BOTTOM}
        />
      )}
    </div>
  );
};

Editor.displayName = 'Editor';
