// Vertical drop indicator for column insertion (Notion-style)
// Uses useDroppable to participate in dnd-kit collision detection

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
      if (!dropPreview) return false;
      return dropPreview.containerId === containerId && dropPreview.insertIndex === insertIndex;
    }, [dropPreview, containerId, insertIndex]);

    // Only render when dragging a column
    if (!isColumnDragging) {
      return null;
    }

    // Show indicator when it's the preview position or when hovering over it
    const shouldShowIndicator = isPreviewPosition || isOver;

    return (
      <div
        ref={setNodeRef}
        className="relative flex items-center justify-center self-stretch transition-all duration-100"
        style={{ width: shouldShowIndicator ? 8 : 4, minWidth: shouldShowIndicator ? 8 : 4 }}
      >
        {shouldShowIndicator && (
          <>
            {/* Top dot */}
            <div className="absolute top-0 h-2 w-2 rounded-full bg-primary" />
            {/* Vertical line */}
            <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-primary" />
            {/* Bottom dot */}
            <div className="absolute bottom-0 h-2 w-2 rounded-full bg-primary" />
          </>
        )}
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
