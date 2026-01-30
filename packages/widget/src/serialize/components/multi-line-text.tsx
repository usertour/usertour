// Multi line text serialize component for SDK rendering

import type { ContentEditorMultiLineTextElement } from '@usertour/types';
import { memo } from 'react';

import { TextInputSerialize } from './text-input-serialize';

export interface MultiLineTextSerializeProps {
  element: ContentEditorMultiLineTextElement;
  onClick?: (element: ContentEditorMultiLineTextElement, value: string) => Promise<void> | void;
}

export const MultiLineTextSerialize = memo<MultiLineTextSerializeProps>((props) => {
  const { element, onClick } = props;

  return <TextInputSerialize element={element} onClick={onClick} inputType="textarea" />;
});

MultiLineTextSerialize.displayName = 'MultiLineTextSerialize';
