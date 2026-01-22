// Single selection (radio) serialize component

import { SingleSelection } from '@usertour-packages/widget';
import { memo, useCallback } from 'react';

import type {
  ContentEditorMultipleChoiceElement,
  ContentEditorMultipleChoiceOption,
} from '../../../types/editor';

interface SingleSelectionSerializeProps {
  element: ContentEditorMultipleChoiceElement;
  options: ContentEditorMultipleChoiceOption[];
  onClick?: (element: ContentEditorMultipleChoiceElement, value?: any) => Promise<void> | void;
}

export const SingleSelectionSerialize = memo(
  ({ element, options, onClick }: SingleSelectionSerializeProps) => {
    const handleValueChange = useCallback(
      (value: string) => {
        onClick?.(element, value);
      },
      [element, onClick],
    );

    const handleOtherSubmit = useCallback(
      (value: string) => {
        onClick?.(element, value);
      },
      [element, onClick],
    );

    return (
      <SingleSelection
        options={options}
        enableOther={element.data.enableOther}
        otherPlaceholder={element.data.otherPlaceholder}
        isInteractive={true}
        onValueChange={handleValueChange}
        onOtherSubmit={handleOtherSubmit}
      />
    );
  },
);

SingleSelectionSerialize.displayName = 'SingleSelectionSerialize';
