// Serialize component for embed (read-only mode for SDK)

import { memo } from 'react';

import type { ContentEditorEmebedElement } from '../../../types/editor';
import { EmbedContent } from './embed-content';

export interface ContentEditorEmbedSerializeProps {
  element: ContentEditorEmebedElement;
}

export const ContentEditorEmbedSerialize = memo<ContentEditorEmbedSerializeProps>(({ element }) => {
  return <EmbedContent element={element} isReadOnly />;
});

ContentEditorEmbedSerialize.displayName = 'ContentEditorEmbedSerialize';
