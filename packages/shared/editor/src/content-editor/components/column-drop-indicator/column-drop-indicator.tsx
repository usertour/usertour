// Vertical drop indicator for column insertion (Notion-style)
// Uses absolute positioning to avoid layout shift when drag starts

import { useDroppable } from '@dnd-kit/core';
import { memo, useMemo } from 'react';

import { useContentEditorContext } from '../../../contexts/content-editor-context';

// Prefix for column drop indicator IDs
export const COLUMN_DROP_INDICATOR_PREFIX = 'column-drop-indicator-';

export interface ColumnDropIndicatorProps {
  containerId: string;
  insertIndex: number;
}

export const ColumnDropIndicator = memo(
  ({ containerId, insertIndex }: ColumnDropIndicatorProps) => {
    const { dropPreview, activeId, contents } = useContentEditorContext();

    // Generate unique ID for this drop indicator
    const indicatorId = `${COLUMN_DROP_INDICATOR_PREFIX}${containerId}-${insertIndex}`;

    const { setNodeRef, isOver } = useDroppable({
      id: indicatorId,
      data: {
        type: 'column-drop-indicator',
        containerId,
        insertIndex,
      },
    });

    // Check if the active item is a column (not a group)
    const isColumnDragging = useMemo(() => {
      if (!activeId) return false;
      const isGroup = contents.some((c) => c.id === activeId);
      return !isGroup;
    }, [activeId, contents]);

    // Check if this indicator should be highlighted (preview position)
    const isPreviewPosition = useMemo(() => {
      if (!dropPreview || dropPreview.type !== 'column') return false;
      return dropPreview.containerId === containerId && dropPreview.insertIndex === insertIndex;
    }, [dropPreview, containerId, insertIndex]);

    // Show indicator when hovering or at preview position (only during column drag)
    const shouldShowIndicator = isColumnDragging && (isPreviewPosition || isOver);

    // Use w-0 wrapper with absolute positioned indicator to avoid layout shift
    return (
      <div className="relative w-0 self-stretch overflow-visible">
        <div
          ref={setNodeRef}
          className={`absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-primary transition-opacity duration-150 ${
            shouldShowIndicator ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>
    );
  },
);

ColumnDropIndicator.displayName = 'ColumnDropIndicator';

// Helper function to check if an id is a column drop indicator id
export const isColumnDropIndicatorId = (id: string): boolean => {
  return id.startsWith(COLUMN_DROP_INDICATOR_PREFIX);
};

// Helper function to extract containerId and insertIndex from indicator id
export const parseColumnDropIndicatorId = (
  id: string,
): { containerId: string; insertIndex: number } | null => {
  if (!isColumnDropIndicatorId(id)) return null;
  const parts = id.replace(COLUMN_DROP_INDICATOR_PREFIX, '').split('-');
  // The last part is insertIndex, everything before is containerId (which might contain dashes)
  const insertIndex = Number.parseInt(parts.pop() ?? '0', 10);
  const containerId = parts.join('-');
  return { containerId, insertIndex };
};
