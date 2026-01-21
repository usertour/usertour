// Serialize component for embed (read-only mode for SDK)

import type { ContentEditorEmebedElement } from '../../../types/editor';
import { EmbedContent } from './embed-content';

export interface ContentEditorEmbedSerializeProps {
  className?: string;
  children?: React.ReactNode;
  element: ContentEditorEmebedElement;
}

export const ContentEditorEmbedSerialize = ({ element }: ContentEditorEmbedSerializeProps) => {
  return <EmbedContent element={element} isReadOnly />;
};

ContentEditorEmbedSerialize.displayName = 'ContentEditorEmbedSerialize';
