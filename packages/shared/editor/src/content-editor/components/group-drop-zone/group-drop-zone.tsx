// Drop zone component for groups and columns
// Shows horizontal line indicator for group/column insertion

import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';

// Prefix for drop zone IDs to identify them in drag handlers
export const DROP_ZONE_ID_PREFIX = 'group-drop-zone-';

export interface GroupDropZoneProps {
  index: number;
}

export const GroupDropZone = memo(({ index }: GroupDropZoneProps) => {
  const { activeId, dropPreview } = useContentEditorContext();
  const dropZoneId = `${DROP_ZONE_ID_PREFIX}${index}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dropZoneId,
    data: {
      type: 'drop-zone',
      index,
    },
  });

  // Check if this is the preview position for group dragging
  const isGroupPreviewPosition = useMemo(() => {
    if (!dropPreview || dropPreview.type !== 'group') return false;
    return dropPreview.insertIndex === index;
  }, [dropPreview, index]);

  // Show indicator when hovering or at preview position (only during drag)
  const shouldShowIndicator = activeId && (isOver || isGroupPreviewPosition);

  // Use h-0 wrapper with absolute positioned indicator to avoid layout shift
  return (
    <div className="relative h-0 w-full overflow-visible">
      <div
        ref={setNodeRef}
        className={`absolute left-0 right-0 z-10 h-1 -translate-y-1/2 bg-primary/50 transition-opacity duration-150 ${
          shouldShowIndicator ? 'opacity-100' : 'opacity-0'
        }`}
      />
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
