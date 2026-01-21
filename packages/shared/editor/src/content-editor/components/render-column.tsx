// Render column component for content editor

import { memo } from 'react';

import type { ContentEditorRootColumn } from '../../types/editor';
import { ContentEditorColumn } from './column';
import { ContentEditorRenderElement } from './render-element';

export interface ContentEditorRenderColumnProps {
  columns: ContentEditorRootColumn[];
  parentPath: number[];
  isInOverlay?: boolean;
}

export const ContentEditorRenderColumn = memo((props: ContentEditorRenderColumnProps) => {
  const { columns, parentPath } = props;

  return (
    <>
      {columns.map((column, i) => (
        <ContentEditorColumn
          element={column.element}
          key={column.id}
          id={column.id ?? ''}
          path={[...parentPath, i]}
        >
          <ContentEditorRenderElement elements={column.children} parentPath={[...parentPath, i]} />
        </ContentEditorColumn>
      ))}
    </>
  );
});

ContentEditorRenderColumn.displayName = 'ContentEditorRenderColumn';
