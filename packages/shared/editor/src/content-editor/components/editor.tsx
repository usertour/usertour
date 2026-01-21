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
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { EDITOR_OVERLAY } from '@usertour-packages/constants';
import { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { useContentEditorContext } from '../../contexts/content-editor-context';
import type { ContentEditorRoot, ContentEditorRootColumn } from '../../types/editor';
import { ContentEditorSideBarType } from '../../types/editor';
import { ContentEditorGroup } from './group';
import { ContentEditorSideBar } from './sidebar';
import { ContentEditorDragOverlay } from './drag-overlay';
import { ContentEditorRenderColumn } from './render-column';

// Sortable item type
interface SortableItem {
  id: string;
}

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
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Memoized helper to find container for a given id
  const findContainer = useCallback(
    (id: string): ContentEditorRoot | undefined => {
      const container = contents.find((content) => content.id === id);
      if (container) {
        return container;
      }
      return contents.find((content) => content.children.find((c) => c.id === id));
    },
    [contents],
  );

  // Memoized helper to check if id is a container
  const isContainer = useCallback(
    (id: string): ContentEditorRoot | undefined => {
      return contents.find((content) => content.id === id);
    },
    [contents],
  );

  // Memoized drag start handler
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id as string);
    },
    [setActiveId],
  );

  // Memoized drag over handler
  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;
      if (!overId) {
        return;
      }
      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);

      // Handle group reordering
      if (isContainer(dragActiveId)) {
        setContents((pre) => {
          const oldIndex = pre.findIndex((c) => c.id === dragActiveId);
          const newIndex = pre.findIndex((c) => c.id === overContainer?.id);
          if (oldIndex === -1 || newIndex === -1) return pre;
          return arrayMove(pre, oldIndex, newIndex);
        });
        return;
      }

      if (!activeContainer || !overContainer || activeContainer.id === overContainer.id) {
        return;
      }

      // Handle column moving between groups
      setContents((pre) => {
        const newContents = JSON.parse(JSON.stringify(pre)) as typeof pre;
        const activeContent = newContents.find((c) => c.id === activeContainer.id);
        const overContent = newContents.find((c) => c.id === overContainer.id);
        const activeColumn = activeContent?.children.find((c) => c.id === dragActiveId) as
          | ContentEditorRootColumn
          | undefined;

        if (!activeColumn || !activeContent || !overContent) {
          return pre;
        }

        let overIndex = 0;
        if (newContents.find((c) => c.id === overId)) {
          overIndex = newContents.find((c) => c.id === overId)?.children.length ?? 0;
        } else {
          const overColumn = overContent.children.find((c) => c.id === overId);
          if (overColumn) {
            overIndex = overContent.children.indexOf(overColumn);
          }
        }

        const result: ContentEditorRoot[] = [];
        for (const content of pre) {
          if (content.id === activeContent.id) {
            result.push({
              ...content,
              children: content.children.filter((c) => c.id !== dragActiveId),
            });
          } else if (content.id === overContent.id) {
            result.push({
              ...content,
              children: [
                ...content.children.slice(0, overIndex),
                activeColumn,
                ...content.children.slice(overIndex),
              ],
            });
          } else {
            result.push(content);
          }
        }
        return result.filter((cc) => cc.children.length !== 0);
      });
    },
    [findContainer, isContainer, setContents],
  );

  // Memoized drag end handler
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;

      if (!overId || dragActiveId === overId) {
        setActiveId(undefined);
        return;
      }

      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);
      if (!activeContainer || !overContainer) {
        setActiveId(undefined);
        return;
      }

      // Handle group reordering
      if (isContainer(dragActiveId)) {
        setContents((pre) => {
          const oldIndex = pre.findIndex((c) => c.id === dragActiveId);
          const newIndex = pre.findIndex((c) => c.id === overContainer.id);
          if (oldIndex === -1 || newIndex === -1) return pre;
          return arrayMove(pre, oldIndex, newIndex);
        });
        setActiveId(undefined);
        return;
      }

      // Handle column reordering within same group
      if (isContainer(overId) || activeContainer.id !== overContainer.id) {
        setActiveId(undefined);
        return;
      }

      const activeColumn = overContainer.children.find((cc) => cc.id === dragActiveId);
      const overColumn = overContainer.children.find((cc) => cc.id === overId);
      if (!activeColumn || !overColumn) {
        setActiveId(undefined);
        return;
      }

      const overIndex = overContainer.children.indexOf(overColumn);
      const activeIndex = overContainer.children.indexOf(activeColumn);

      setContents((pre) => {
        return pre
          .map((content) => {
            if (content.id === overContainer.id) {
              return {
                ...content,
                children: arrayMove(content.children, activeIndex, overIndex),
              };
            }
            return content;
          })
          .filter((c) => c.children.length !== 0);
      });

      setActiveId(undefined);
    },
    [findContainer, isContainer, setActiveId, setContents],
  );

  // Memoized mouse event handlers
  const handleMouseOver = useCallback(() => {
    setIsEditorHover(true);
  }, [setIsEditorHover]);

  const handleMouseOut = useCallback(() => {
    setIsEditorHover(false);
  }, [setIsEditorHover]);

  const handleFocus = useCallback(() => {
    setIsEditorHover(true);
  }, [setIsEditorHover]);

  const handleBlur = useCallback(() => {
    setIsEditorHover(false);
  }, [setIsEditorHover]);

  // Memoized sortable items
  const sortableItems = useMemo<SortableItem[]>(
    () => contents.map((c) => ({ id: c.id ?? '' })),
    [contents],
  );

  // Memoized sidebar visibility
  const shouldShowSidebar = useMemo(
    () => !activeId && (isEditorHover || isOpen),
    [activeId, isEditorHover, isOpen],
  );

  // DndContext measuring config
  const measuringConfig = useMemo(
    () => ({
      droppable: {
        strategy: MeasuringStrategy.Always,
      },
    }),
    [],
  );

  // DragOverlay style
  const dragOverlayStyle = useMemo(() => ({ zIndex: zIndex + EDITOR_OVERLAY }), [zIndex]);

  return (
    <div
      className="relative"
      ref={containerRef}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
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
        measuring={measuringConfig}
      >
        <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
          {contents.map((content, i) => (
            <ContentEditorGroup
              element={content.element}
              key={content.id}
              path={[i]}
              items={content.children.map((c) => ({ id: c.id ?? '' }))}
              id={content.id ?? ''}
            >
              <SortableContext
                items={content.children.map((c) => ({ id: c.id ?? '' }))}
                strategy={horizontalListSortingStrategy}
              >
                <ContentEditorRenderColumn columns={content.children} parentPath={[i]} />
              </SortableContext>
            </ContentEditorGroup>
          ))}
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
