// Render column component for content editor

import { Fragment, memo } from 'react';

import type { ContentEditorRootColumn } from '../../types/editor';
import { ColumnDropIndicator } from './column-drop-indicator';
import { ContentEditorColumn } from './column';
import { ContentEditorRenderElement } from './render-element';

export interface ContentEditorRenderColumnProps {
  columns: ContentEditorRootColumn[];
  parentPath: number[];
  containerId: string;
  isInOverlay?: boolean;
}

export const ContentEditorRenderColumn = memo((props: ContentEditorRenderColumnProps) => {
  const { columns, parentPath, containerId, isInOverlay } = props;

  // Don't render indicators in overlay
  if (isInOverlay) {
    return (
      <>
        {columns.map((column, i) => (
          <ContentEditorColumn
            element={column.element}
            key={column.id}
            id={column.id ?? ''}
            path={[...parentPath, i]}
          >
            <ContentEditorRenderElement
              elements={column.children}
              parentPath={[...parentPath, i]}
            />
          </ContentEditorColumn>
        ))}
      </>
    );
  }

  // Use Fragment to avoid wrapper div that would break flex layout
  return (
    <>
      {columns.map((column, i) => (
        <Fragment key={column.id}>
          {/* Vertical drop indicator before each column */}
          <ColumnDropIndicator containerId={containerId} insertIndex={i} />
          <ContentEditorColumn
            element={column.element}
            id={column.id ?? ''}
            path={[...parentPath, i]}
          >
            <ContentEditorRenderElement
              elements={column.children}
              parentPath={[...parentPath, i]}
            />
          </ContentEditorColumn>
        </Fragment>
      ))}
      {/* Indicator after the last column */}
      <ColumnDropIndicator containerId={containerId} insertIndex={columns.length} />
    </>
  );
});

ContentEditorRenderColumn.displayName = 'ContentEditorRenderColumn';
