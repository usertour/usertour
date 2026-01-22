// Serialize component for rich text (read-only mode for SDK)

import { memo } from 'react';

import { serialize } from '../../../richtext-editor/serialize';
import type { ContentEditorTextElement } from '../../../types/editor';

export interface ContentEditorRichTextSerializeProps {
  element: ContentEditorTextElement;
}

export const ContentEditorRichTextSerialize = memo<ContentEditorRichTextSerializeProps>((props) => {
  const { element } = props;

  return (
    <div className="w-full">
      {element.data.map((node, index) => serialize(node, undefined, index))}
    </div>
  );
});

ContentEditorRichTextSerialize.displayName = 'ContentEditorRichTextSerialize';
