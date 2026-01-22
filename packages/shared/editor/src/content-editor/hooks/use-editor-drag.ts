// Custom hook for handling editor drag and drop logic

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useMemo } from 'react';

import type { ContentEditorRoot } from '../../types/editor';
import { createGroupFromColumn } from '../../utils/helper';
import { getDropZoneIndex, isDropZoneId } from '../components/group-drop-zone';

export interface UseEditorDragOptions {
  contents: ContentEditorRoot[];
  setContents: React.Dispatch<React.SetStateAction<ContentEditorRoot[]>>;
  setActiveId: React.Dispatch<React.SetStateAction<string | undefined>>;
}

export interface UseEditorDragReturn {
  findContainer: (id: string) => ContentEditorRoot | undefined;
  isContainer: (id: string) => boolean;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragOver: (event: DragOverEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
}

export const useEditorDrag = ({
  contents,
  setContents,
  setActiveId,
}: UseEditorDragOptions): UseEditorDragReturn => {
  // Map for O(1) container lookup - maps any id (group or column) to its parent container
  const containerMap = useMemo(() => {
    const map = new Map<string, ContentEditorRoot>();
    for (const content of contents) {
      // Map group id to itself
      if (content.id) {
        map.set(content.id, content);
      }
      // Map each column id to its parent group
      for (const child of content.children) {
        if (child.id) {
          map.set(child.id, content);
        }
      }
    }
    return map;
  }, [contents]);

  // Set of group ids for O(1) container check
  const containerIds = useMemo(() => {
    return new Set(contents.map((c) => c.id).filter((id): id is string => Boolean(id)));
  }, [contents]);

  // O(1) helper to find container for a given id
  const findContainer = useCallback(
    (id: string): ContentEditorRoot | undefined => {
      return containerMap.get(id);
    },
    [containerMap],
  );

  // O(1) helper to check if id is a container (group)
  const isContainer = useCallback(
    (id: string): boolean => {
      return containerIds.has(id);
    },
    [containerIds],
  );

  // Drag start handler
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      setActiveId(active.id as string);
    },
    [setActiveId],
  );

  // Drag over handler
  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;
      if (!overId) {
        return;
      }

      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);

      // Handle group reordering - provides instant visual feedback during drag
      if (isContainer(dragActiveId)) {
        if (!overContainer) return;
        setContents((prev) => {
          const oldIndex = prev.findIndex((c) => c.id === dragActiveId);
          const newIndex = prev.findIndex((c) => c.id === overContainer.id);
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
        return;
      }

      // Skip if no containers found or same container (handled in dragEnd)
      if (!activeContainer || !overContainer || activeContainer.id === overContainer.id) {
        return;
      }

      // Handle column moving between groups - use shallow copy for better performance
      setContents((prev) => {
        // Find the column being dragged from the current state
        const activeContent = prev.find((c) => c.id === activeContainer.id);
        const activeColumn = activeContent?.children.find((c) => c.id === dragActiveId);

        if (!activeColumn) {
          return prev;
        }

        // Calculate insertion index
        let overIndex = 0;
        if (isContainer(overId)) {
          // Dropping onto a group - insert at the end
          const targetGroup = prev.find((c) => c.id === overId);
          overIndex = targetGroup?.children.length ?? 0;
        } else {
          // Dropping onto a column - insert at that position
          const overContent = prev.find((c) => c.id === overContainer.id);
          const overColumnIndex = overContent?.children.findIndex((c) => c.id === overId) ?? -1;
          overIndex = overColumnIndex >= 0 ? overColumnIndex : 0;
        }

        // Build new contents array with shallow copies
        return prev
          .map((content) => {
            if (content.id === activeContainer.id) {
              // Remove column from source group
              return {
                ...content,
                children: content.children.filter((c) => c.id !== dragActiveId),
              };
            }
            if (content.id === overContainer.id) {
              // Add column to target group at the correct position
              const newChildren = [...content.children];
              newChildren.splice(overIndex, 0, activeColumn);
              return { ...content, children: newChildren };
            }
            return content;
          })
          .filter((c) => c.children.length > 0);
      });
    },
    [findContainer, isContainer, setContents],
  );

  // Drag end handler - handles column reordering within same group and drop zone drops
  // Group reordering and cross-group column moves are handled in dragOver
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;

      // Early return for invalid drops
      if (!overId || dragActiveId === overId) {
        setActiveId(undefined);
        return;
      }

      // Group reordering is already handled in dragOver, just reset activeId
      if (isContainer(dragActiveId)) {
        setActiveId(undefined);
        return;
      }

      // Handle drop zone - create new group from column
      if (isDropZoneId(overId)) {
        const activeContainer = findContainer(dragActiveId);
        if (!activeContainer) {
          setActiveId(undefined);
          return;
        }

        const dropZoneIndex = getDropZoneIndex(overId);

        setContents((prev) => {
          // Find the column being dragged
          const sourceGroup = prev.find((c) => c.id === activeContainer.id);
          const column = sourceGroup?.children.find((c) => c.id === dragActiveId);

          if (!column) return prev;

          // Create new group from the column
          const newGroup = createGroupFromColumn(column);

          // Remove column from source group and filter empty groups
          const updatedContents = prev
            .map((content) => {
              if (content.id === activeContainer.id) {
                return {
                  ...content,
                  children: content.children.filter((c) => c.id !== dragActiveId),
                };
              }
              return content;
            })
            .filter((c) => c.children.length > 0);

          // Calculate the actual insert index after removing the column
          // If source group was removed (became empty), adjust the index
          const sourceGroupIndex = prev.findIndex((c) => c.id === activeContainer.id);
          const sourceGroupRemoved = sourceGroup?.children.length === 1;
          let actualInsertIndex = dropZoneIndex;

          if (sourceGroupRemoved && sourceGroupIndex < dropZoneIndex) {
            actualInsertIndex = Math.max(0, dropZoneIndex - 1);
          }

          // Insert new group at the drop zone index
          return [
            ...updatedContents.slice(0, actualInsertIndex),
            newGroup,
            ...updatedContents.slice(actualInsertIndex),
          ];
        });

        setActiveId(undefined);
        return;
      }

      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);

      // Skip if containers not found or cross-group (already handled in dragOver)
      if (!activeContainer || !overContainer || activeContainer.id !== overContainer.id) {
        setActiveId(undefined);
        return;
      }

      // Skip if dropping onto a container
      if (isContainer(overId)) {
        setActiveId(undefined);
        return;
      }

      // Handle column reordering within the same group
      const activeIndex = activeContainer.children.findIndex((c) => c.id === dragActiveId);
      const overIndex = overContainer.children.findIndex((c) => c.id === overId);

      if (activeIndex === -1 || overIndex === -1 || activeIndex === overIndex) {
        setActiveId(undefined);
        return;
      }

      setContents((prev) =>
        prev
          .map((content) => {
            if (content.id === activeContainer.id) {
              return {
                ...content,
                children: arrayMove(content.children, activeIndex, overIndex),
              };
            }
            return content;
          })
          .filter((c) => c.children.length > 0),
      );

      setActiveId(undefined);
    },
    [findContainer, isContainer, setActiveId, setContents],
  );

  return {
    findContainer,
    isContainer,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
};
