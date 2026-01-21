// Render element component for content editor

import { memo } from 'react';

import type { ContentEditorRootElement } from '../../types/editor';
import { getElementRenderer } from '../element-registry';

export interface ContentEditorRenderElementProps {
  elements: ContentEditorRootElement[];
  parentPath: number[];
}

export const ContentEditorRenderElement = memo((props: ContentEditorRenderElementProps) => {
  const { parentPath, elements } = props;

  return (
    <>
      {elements.map((c, i) => {
        const Comp = getElementRenderer(c.element.type);
        if (!Comp) {
          return null;
        }
        return <Comp element={c.element} key={c.id} path={[...parentPath, i]} id={c.id ?? ''} />;
      })}
    </>
  );
});

ContentEditorRenderElement.displayName = 'ContentEditorRenderElement';
