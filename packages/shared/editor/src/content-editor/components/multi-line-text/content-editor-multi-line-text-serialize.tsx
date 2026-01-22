// Serialize component for multi-line text (read-only mode for SDK)

import { memo } from 'react';

import type { ContentEditorMultiLineTextElement } from '../../../types/editor';
import { TextInputSerialize } from '../../shared/text-input-serialize';

export interface ContentEditorMultiLineTextSerializeProps {
  element: ContentEditorMultiLineTextElement;
  onClick?: (element: ContentEditorMultiLineTextElement, value: string) => Promise<void> | void;
}

export const ContentEditorMultiLineTextSerialize = memo<ContentEditorMultiLineTextSerializeProps>(
  (props) => {
    const { element, onClick } = props;

    return <TextInputSerialize element={element} onClick={onClick} inputType="textarea" />;
  },
);

ContentEditorMultiLineTextSerialize.displayName = 'ContentEditorMultiLineTextSerialize';
