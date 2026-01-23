// Custom hook for handling editor drag and drop logic
// Uses preview-based approach for columns (Notion-style vertical indicator)

import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { useCallback, useMemo } from 'react';

import type { ContentEditorRoot, DropPreview } from '../../types/editor';
import { createGroupFromColumn } from '../../utils/helper';
import {
  isColumnDropIndicatorId,
  parseColumnDropIndicatorId,
} from '../components/column-drop-indicator';
import { getDropZoneIndex, isDropZoneId } from '../components/group-drop-zone';

export interface UseEditorDragOptions {
  contents: ContentEditorRoot[];
  setContents: React.Dispatch<React.SetStateAction<ContentEditorRoot[]>>;
  setActiveId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setDropPreview: React.Dispatch<React.SetStateAction<DropPreview | null>>;
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
  setDropPreview,
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

  // Drag over handler - uses preview-based approach for columns
  const handleDragOver = useCallback(
    ({ active, over }: DragOverEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;

      // Clear preview if no valid drop target
      if (!overId) {
        setDropPreview(null);
        return;
      }

      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);

      // Handle group reordering - live reordering (groups are few)
      if (isContainer(dragActiveId)) {
        setDropPreview(null);
        if (!overContainer) return;
        setContents((prev) => {
          const oldIndex = prev.findIndex((c) => c.id === dragActiveId);
          const newIndex = prev.findIndex((c) => c.id === overContainer.id);
          if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
          return arrayMove(prev, oldIndex, newIndex);
        });
        return;
      }

      // Handle drop zone hover - clear column preview
      if (isDropZoneId(overId)) {
        setDropPreview(null);
        return;
      }

      // Handle column drop indicator hover - set preview from indicator data
      if (isColumnDropIndicatorId(overId)) {
        const parsed = parseColumnDropIndicatorId(overId);
        if (parsed) {
          setDropPreview((prev) => {
            if (
              prev?.containerId === parsed.containerId &&
              prev?.insertIndex === parsed.insertIndex
            ) {
              return prev;
            }
            return parsed;
          });
        }
        return;
      }

      // Skip if no containers found
      if (!activeContainer || !overContainer) {
        setDropPreview(null);
        return;
      }

      // Calculate insertion index for preview
      let insertIndex = 0;
      if (isContainer(overId)) {
        // Dropping onto a group - insert at the end
        const targetGroup = contents.find((c) => c.id === overId);
        insertIndex = targetGroup?.children.length ?? 0;
      } else {
        // Dropping onto a column - calculate insert position
        const overContent = contents.find((c) => c.id === overContainer.id);
        const overColumnIndex = overContent?.children.findIndex((c) => c.id === overId) ?? -1;
        const activeColumnIndex =
          overContent?.children.findIndex((c) => c.id === dragActiveId) ?? -1;

        if (overColumnIndex >= 0) {
          // Determine if we're inserting before or after the over column
          // If dragging from left to right, insert after; from right to left, insert before
          if (activeContainer.id === overContainer.id && activeColumnIndex < overColumnIndex) {
            insertIndex = overColumnIndex + 1;
          } else {
            insertIndex = overColumnIndex;
          }
        }
      }

      // Update preview state (only if changed to avoid unnecessary re-renders)
      const containerId = overContainer.id;
      if (!containerId) {
        setDropPreview(null);
        return;
      }

      setDropPreview((prev) => {
        if (prev?.containerId === containerId && prev?.insertIndex === insertIndex) {
          return prev;
        }
        return { containerId, insertIndex };
      });
    },
    [contents, findContainer, isContainer, setContents, setDropPreview],
  );

  // Drag end handler - performs actual column moves based on dropPreview
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const dragActiveId = active.id as string;
      const overId = over?.id as string | undefined;

      // Helper to cleanup drag state
      const cleanup = () => {
        setActiveId(undefined);
        setDropPreview(null);
      };

      // Early return for invalid drops
      if (!overId || dragActiveId === overId) {
        cleanup();
        return;
      }

      // Group reordering is already handled in dragOver, just reset state
      if (isContainer(dragActiveId)) {
        cleanup();
        return;
      }

      // Handle drop zone - create new group from column
      if (isDropZoneId(overId)) {
        const activeContainer = findContainer(dragActiveId);
        if (!activeContainer) {
          cleanup();
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

        cleanup();
        return;
      }

      // Handle column drop indicator - move column to specific position
      if (isColumnDropIndicatorId(overId)) {
        const parsed = parseColumnDropIndicatorId(overId);
        if (!parsed) {
          cleanup();
          return;
        }

        const { containerId: targetContainerId, insertIndex } = parsed;
        const activeContainer = findContainer(dragActiveId);

        if (!activeContainer) {
          cleanup();
          return;
        }

        setContents((prev) => {
          // Find the column being dragged
          const sourceGroup = prev.find((c) => c.id === activeContainer.id);
          const column = sourceGroup?.children.find((c) => c.id === dragActiveId);

          if (!column) return prev;

          // Same group move
          if (activeContainer.id === targetContainerId) {
            const activeIndex = sourceGroup?.children.findIndex((c) => c.id === dragActiveId) ?? -1;
            if (activeIndex === -1) return prev;

            // Adjust insert index if moving from earlier position
            const adjustedInsertIndex = activeIndex < insertIndex ? insertIndex - 1 : insertIndex;

            return prev.map((content) => {
              if (content.id === targetContainerId) {
                const newChildren = content.children.filter((c) => c.id !== dragActiveId);
                newChildren.splice(adjustedInsertIndex, 0, column);
                return { ...content, children: newChildren };
              }
              return content;
            });
          }

          // Cross-group move
          return prev
            .map((content) => {
              if (content.id === activeContainer.id) {
                // Remove from source
                return {
                  ...content,
                  children: content.children.filter((c) => c.id !== dragActiveId),
                };
              }
              if (content.id === targetContainerId) {
                // Insert at target position
                const newChildren = [...content.children];
                newChildren.splice(insertIndex, 0, column);
                return { ...content, children: newChildren };
              }
              return content;
            })
            .filter((c) => c.children.length > 0);
        });

        cleanup();
        return;
      }

      const activeContainer = findContainer(dragActiveId);
      const overContainer = findContainer(overId);

      // Skip if containers not found
      if (!activeContainer || !overContainer) {
        cleanup();
        return;
      }

      // Skip if dropping onto a container directly
      if (isContainer(overId)) {
        cleanup();
        return;
      }

      // Handle column reordering within the same group
      if (activeContainer.id === overContainer.id) {
        const activeIndex = activeContainer.children.findIndex((c) => c.id === dragActiveId);
        const overIndex = overContainer.children.findIndex((c) => c.id === overId);

        if (activeIndex !== -1 && overIndex !== -1 && activeIndex !== overIndex) {
          setContents((prev) =>
            prev.map((content) => {
              if (content.id === activeContainer.id) {
                return {
                  ...content,
                  children: arrayMove(content.children, activeIndex, overIndex),
                };
              }
              return content;
            }),
          );
        }
        cleanup();
        return;
      }

      // Handle cross-group column move based on preview
      const activeColumn = activeContainer.children.find((c) => c.id === dragActiveId);
      if (!activeColumn) {
        cleanup();
        return;
      }

      // Calculate target insert index
      const overColumnIndex = overContainer.children.findIndex((c) => c.id === overId);
      const insertIndex = overColumnIndex >= 0 ? overColumnIndex : overContainer.children.length;

      setContents((prev) =>
        prev
          .map((content) => {
            if (content.id === activeContainer.id) {
              // Remove column from source group
              return {
                ...content,
                children: content.children.filter((c) => c.id !== dragActiveId),
              };
            }
            if (content.id === overContainer.id) {
              // Add column to target group at the insert position
              const newChildren = [...content.children];
              newChildren.splice(insertIndex, 0, activeColumn);
              return { ...content, children: newChildren };
            }
            return content;
          })
          .filter((c) => c.children.length > 0),
      );

      cleanup();
    },
    [findContainer, isContainer, setActiveId, setContents, setDropPreview],
  );

  return {
    findContainer,
    isContainer,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
  };
};
