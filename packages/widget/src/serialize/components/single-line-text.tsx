// Single line text serialize component for SDK rendering

import type { ContentEditorSingleLineTextElement } from '@usertour/types';
import { memo } from 'react';

import { TextInputSerialize } from './text-input-serialize';

export interface SingleLineTextSerializeProps {
  element: ContentEditorSingleLineTextElement;
  onClick?: (element: ContentEditorSingleLineTextElement, value: string) => Promise<void> | void;
}

export const SingleLineTextSerialize = memo<SingleLineTextSerializeProps>((props) => {
  const { element, onClick } = props;

  return (
    <TextInputSerialize
      element={element}
      onClick={onClick}
      inputType="input"
      inputClassName="grow h-auto"
    />
  );
});

SingleLineTextSerialize.displayName = 'SingleLineTextSerialize';
