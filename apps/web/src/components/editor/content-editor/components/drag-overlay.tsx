// Drag overlay component for content editor

import { memo, useMemo } from 'react';

import { useContentEditorContext } from '../../contexts/content-editor-context';
import { ContentEditorColumnOverlay, ContentEditorGroupOverlay } from '../element-registry';
import { ContentEditorRenderElement } from './render-element';

export const ContentEditorDragOverlay = memo(() => {
  const { contents, activeId } = useContentEditorContext();

  // Memoize the group lookup
  const group = useMemo(() => contents.find((c) => c.id === activeId), [contents, activeId]);

  // Memoize column lookup results
  const columnResult = useMemo(() => {
    if (group) return null;

    for (let index = 0; index < contents.length; index++) {
      const content = contents[index];
      const column = content.children.find((cn) => cn.id === activeId);
      if (column) {
        const columnIndex = content.children.indexOf(column);
        return { column, index, columnIndex };
      }
    }
    return null;
  }, [contents, activeId, group]);

  // Render group overlay
  if (group) {
    return (
      <ContentEditorGroupOverlay
        element={group.element}
        key={group.id}
        items={group.children.map((c) => ({ id: c.id ?? '' }))}
        path={[0]}
        id={group.id ?? ''}
      >
        {group.children.map((column, ii) => (
          <ContentEditorColumnOverlay
            element={column.element}
            className="h-full"
            key={column.id}
            isInGroup={true}
            id={column.id ?? ''}
            path={[0, ii]}
          >
            <ContentEditorRenderElement elements={column.children} parentPath={[0, ii]} />
          </ContentEditorColumnOverlay>
        ))}
      </ContentEditorGroupOverlay>
    );
  }

  // Render column overlay
  if (columnResult) {
    const { column, index, columnIndex } = columnResult;
    return (
      <ContentEditorColumnOverlay
        element={column.element}
        className="h-full"
        key={column.id}
        id={column.id ?? ''}
        path={[index, columnIndex]}
      >
        <ContentEditorRenderElement elements={column.children} parentPath={[index, columnIndex]} />
      </ContentEditorColumnOverlay>
    );
  }

  return null;
});

ContentEditorDragOverlay.displayName = 'ContentEditorDragOverlay';
