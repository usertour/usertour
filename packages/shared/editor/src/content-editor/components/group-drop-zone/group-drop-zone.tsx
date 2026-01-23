// Drop zone component for groups and columns
// Uses actual droppable elements for proper dnd-kit integration
// Shows horizontal line indicator for:
// - Column dragging to become a new group
// - Group reordering

import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';

// Prefix for drop zone IDs to identify them in drag handlers
export const DROP_ZONE_ID_PREFIX = 'group-drop-zone-';

export interface GroupDropZoneProps {
  index: number;
}

export const GroupDropZone = memo(({ index }: GroupDropZoneProps) => {
  const { activeId, contents, dropPreview } = useContentEditorContext();
  const dropZoneId = `${DROP_ZONE_ID_PREFIX}${index}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dropZoneId,
    data: {
      type: 'drop-zone',
      index,
    },
  });

  // Check if the active item is a group
  const isGroupDragging = useMemo(() => {
    if (!activeId) return false;
    return contents.some((c) => c.id === activeId);
  }, [activeId, contents]);

  // Check if this is the preview position for group dragging
  const isGroupPreviewPosition = useMemo(() => {
    if (!dropPreview || dropPreview.type !== 'group') return false;
    return dropPreview.insertIndex === index;
  }, [dropPreview, index]);

  // Only render when there's an active drag
  if (!activeId) {
    return null;
  }

  // For group dragging, show indicator at preview position or when hovering
  // For column dragging, show indicator when hovering (column becoming new group)
  const shouldShowIndicator = isOver || isGroupPreviewPosition;

  return (
    <div
      ref={setNodeRef}
      className="relative w-full transition-all duration-150 ease-out"
      style={{ height: shouldShowIndicator ? 48 : isGroupDragging ? 8 : 16 }}
    >
      {/* Visual indicator line */}
      {shouldShowIndicator && (
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {/* Left dot */}
          <div className="h-2 w-2 rounded-full bg-primary" />
          {/* Line */}
          <div className="h-0.5 flex-1 bg-primary" />
          {/* Right dot */}
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
});

GroupDropZone.displayName = 'GroupDropZone';

// Helper function to check if an id is a drop zone id
export const isDropZoneId = (id: string): boolean => {
  return id.startsWith(DROP_ZONE_ID_PREFIX);
};

// Helper function to extract the index from a drop zone id
export const getDropZoneIndex = (id: string): number => {
  return Number.parseInt(id.replace(DROP_ZONE_ID_PREFIX, ''), 10);
};
