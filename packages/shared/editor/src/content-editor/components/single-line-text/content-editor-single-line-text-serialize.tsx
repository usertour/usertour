// Serialize component for single-line text (read-only mode for SDK)

import { memo } from 'react';

import type { ContentEditorSingleLineTextElement } from '../../../types/editor';
import { TextInputSerialize } from '../../shared/text-input-serialize';

export interface ContentEditorSingleLineTextSerializeProps {
  element: ContentEditorSingleLineTextElement;
  onClick?: (element: ContentEditorSingleLineTextElement, value: string) => Promise<void> | void;
}

export const ContentEditorSingleLineTextSerialize = memo<ContentEditorSingleLineTextSerializeProps>(
  (props) => {
    const { element, onClick } = props;

    return (
      <TextInputSerialize
        element={element}
        onClick={onClick}
        inputType="input"
        inputClassName="grow h-auto"
      />
    );
  },
);

ContentEditorSingleLineTextSerialize.displayName = 'ContentEditorSingleLineTextSerialize';
